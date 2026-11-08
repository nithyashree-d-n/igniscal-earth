"""NASA FIRMS (Fire Information for Resource Management System) API Client.

Documentation reference:
- https://firms.modaps.eosdis.nasa.gov/api/
- https://firms.modaps.eosdis.nasa.gov/web-services/
"""
import io
import csv
import logging
from typing import List, Dict, Any, Optional, Tuple
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from app.core.config import settings

logger = logging.getLogger("firesignal.firms_client")

# Official FIRMS source identifiers
SUPPORTED_FIRMS_SOURCES = {
    "MODIS_NRT": {
        "name": "MODIS Terra & Aqua (Near Real-Time)",
        "sensor_family": "MODIS",
        "instrument": "MODIS",
        "nominal_resolution_m": 1000,
        "satellites": ["Terra", "Aqua"]
    },
    "MODIS_SP": {
        "name": "MODIS Terra & Aqua (Standard Processing)",
        "sensor_family": "MODIS",
        "instrument": "MODIS",
        "nominal_resolution_m": 1000,
        "satellites": ["Terra", "Aqua"]
    },
    "VIIRS_SNPP_NRT": {
        "name": "VIIRS Suomi-NPP 375m (Near Real-Time)",
        "sensor_family": "VIIRS",
        "instrument": "VIIRS",
        "nominal_resolution_m": 375,
        "satellites": ["Suomi-NPP"]
    },
    "VIIRS_NOAA20_NRT": {
        "name": "VIIRS NOAA-20 (JPSS-1) 375m (Near Real-Time)",
        "sensor_family": "VIIRS",
        "instrument": "VIIRS",
        "nominal_resolution_m": 375,
        "satellites": ["NOAA-20"]
    },
    "VIIRS_NOAA21_NRT": {
        "name": "VIIRS NOAA-21 (JPSS-2) 375m (Near Real-Time)",
        "sensor_family": "VIIRS",
        "instrument": "VIIRS",
        "nominal_resolution_m": 375,
        "satellites": ["NOAA-21"]
    }
}


class FirmsClientError(Exception):
    """Custom exception for FIRMS API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, error_type: str = "general"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type


class FirmsClient:
    """Client for interacting with the NASA FIRMS REST API."""

    def __init__(self, map_key: Optional[str] = None):
        self.map_key = map_key or settings.FIRMS_MAP_KEY
        self.base_url = settings.FIRMS_BASE_URL.rstrip('/')
        
        # Configure robust retry session
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def is_configured(self) -> bool:
        """Check if a valid MAP_KEY string is available."""
        return bool(self.map_key and len(self.map_key.strip()) > 5)

    def get_supported_sources(self) -> Dict[str, Any]:
        """Return the dictionary of supported FIRMS products."""
        return SUPPORTED_FIRMS_SOURCES

    def fetch_area_csv(
        self,
        source: str,
        bbox: List[float],
        day_range: int = 1,
        date: Optional[str] = None,
        custom_key: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Fetch active fire data for a bounding box area.
        
        Args:
            source: Source product identifier (e.g., 'MODIS_NRT', 'VIIRS_SNPP_NRT')
            bbox: [min_lon, min_lat, max_lon, max_lat] in decimal degrees
            day_range: Number of days to retrieve (1 to 10)
            date: Optional YYYY-MM-DD starting date
            custom_key: Optional MAP_KEY override
            
        Returns:
            Tuple of (list of parsed record dicts, raw CSV text)
        """
        key = custom_key or self.map_key
        if not key or not key.strip():
            raise FirmsClientError(
                "NASA FIRMS MAP_KEY is not configured. Please supply a MAP_KEY in settings or the UI.",
                error_type="unauthorized"
            )

        if source not in SUPPORTED_FIRMS_SOURCES:
            raise FirmsClientError(f"Unsupported FIRMS source: '{source}'", error_type="invalid_parameter")

        if not (1 <= day_range <= 10):
            raise FirmsClientError("day_range must be between 1 and 10 days for the FIRMS API.", error_type="invalid_parameter")

        if len(bbox) != 4:
            raise FirmsClientError("bbox must contain exactly 4 coordinates [min_lon, min_lat, max_lon, max_lat]", error_type="invalid_parameter")

        min_lon, min_lat, max_lon, max_lat = bbox
        coord_str = f"{min_lon:.4f},{min_lat:.4f},{max_lon:.4f},{max_lat:.4f}"
        
        # Build URL: /api/area/csv/[MAP_KEY]/[SOURCE]/[COORDINATES]/[DAY_RANGE]/[DATE]
        url = f"{self.base_url}/api/area/csv/{key}/{source}/{coord_str}/{day_range}"
        if date:
            url += f"/{date}"

        logger.info(f"Querying FIRMS API source={source} bbox={coord_str} day_range={day_range}")
        
        try:
            response = self.session.get(url, timeout=25)
        except requests.exceptions.Timeout:
            logger.error("FIRMS API request timed out")
            raise FirmsClientError("NASA FIRMS API connection timed out. Please try again later.", status_code=504, error_type="timeout")
        except requests.exceptions.RequestException as e:
            logger.error(f"FIRMS API connection failed: {e}")
            raise FirmsClientError(f"Failed to connect to NASA FIRMS API: {str(e)}", error_type="connection_error")

        if response.status_code == 403:
            logger.error("FIRMS API returned 403 Forbidden")
            raise FirmsClientError("Invalid or unauthorized NASA FIRMS MAP_KEY.", status_code=403, error_type="unauthorized")
        elif response.status_code == 429:
            logger.error("FIRMS API rate limit reached (429)")
            raise FirmsClientError("NASA FIRMS rate limit exceeded. Please wait a few moments before requesting again.", status_code=429, error_type="rate_limited")
        elif response.status_code >= 500:
            logger.error(f"FIRMS API server error: {response.status_code}")
            raise FirmsClientError("NASA FIRMS servers encountered a temporary issue. Please try again later.", status_code=response.status_code, error_type="server_error")
        elif response.status_code != 200:
            raise FirmsClientError(f"FIRMS API error: HTTP {response.status_code}", status_code=response.status_code, error_type="http_error")

        csv_text = response.text.strip()
        
        # Check if response is an error message disguised as 200 text
        lower_text = csv_text.lower()
        if "bad map key" in lower_text or "invalid key" in lower_text or "unauthorized" in lower_text:
            raise FirmsClientError("Invalid NASA FIRMS MAP_KEY provided.", status_code=403, error_type="unauthorized")
        if "error" in lower_text and len(csv_text) < 150:
            raise FirmsClientError(f"FIRMS API returned message: {csv_text}", error_type="api_error")

        # Parse CSV text
        records: List[Dict[str, Any]] = []
        if csv_text:
            f = io.StringIO(csv_text)
            reader = csv.DictReader(f)
            for row in reader:
                records.append(dict(row))

        logger.info(f"Retrieved {len(records)} records from FIRMS source {source}")
        return records, csv_text

    def check_data_availability(self, custom_key: Optional[str] = None) -> List[Dict[str, Any]]:
        """Query FIRMS data availability across platforms."""
        key = custom_key or self.map_key
        if not key:
            raise FirmsClientError("NASA FIRMS MAP_KEY required to query availability.", error_type="unauthorized")
            
        url = f"{self.base_url}/api/data_availability/csv/{key}/all"
        try:
            resp = self.session.get(url, timeout=15)
            if resp.status_code == 200:
                f = io.StringIO(resp.text.strip())
                reader = csv.DictReader(f)
                return [dict(r) for r in reader]
            return []
        except Exception as e:
            logger.warning(f"Failed to query data availability: {e}")
            return []
