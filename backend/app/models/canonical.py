"""Canonical scientific data models for FireSignal."""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ObservationRecord(BaseModel):
    """Canonical representation of an active fire / thermal anomaly detection."""
    observation_id: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    acquisition_datetime_utc: str
    acquisition_date: str  # YYYY-MM-DD
    acquisition_time: str  # HHMM
    sensor_family: str  # "MODIS" or "VIIRS"
    satellite: str  # "Terra", "Aqua", "Suomi-NPP", "NOAA-20", "NOAA-21"
    instrument: str  # "MODIS" or "VIIRS"
    product: str
    processing_type: str = "NRT"  # "NRT", "STANDARD", "ARCHIVE", "SAMPLE"
    
    # Confidence metrics
    confidence_raw: Optional[str] = None
    confidence_class: str = "nominal"  # "low", "nominal", "high", "unknown"
    
    # Thermal & Radiative attributes
    brightness_temperature_primary: Optional[float] = None  # Kelvin
    brightness_temperature_secondary: Optional[float] = None  # Kelvin
    frp: Optional[float] = None  # Fire Radiative Power (MW)
    
    # Scan geometry & temporal indicators
    scan: Optional[float] = None
    track: Optional[float] = None
    day_night: str = "D"  # "D" or "N"
    
    # Provenance
    source_version: Optional[str] = None
    source_file: str = "unknown"
    ingestion_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Spatial Harmonization fields (populated by engine)
    grid_cell_id: Optional[str] = None
    grid_x: Optional[float] = None
    grid_y: Optional[float] = None
    is_colocated: bool = False
    colocation_group_id: Optional[str] = None
    
    # Retain all raw unmapped attributes without data loss
    original_attributes: Dict[str, Any] = Field(default_factory=dict)


class DataQualitySummary(BaseModel):
    """Auditable quality and validation summary for ingested dataset."""
    dataset_id: str
    source_name: str
    product_name: str
    ingestion_time: str
    total_raw_records: int
    valid_records: int
    invalid_records: int
    duplicate_records: int
    out_of_aoi_records: int
    modis_count: int
    viirs_count: int
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    spatial_extent: Optional[List[float]] = None  # [min_lon, min_lat, max_lon, max_lat]
    missing_frp_count: int = 0
    missing_confidence_count: int = 0
    rejection_reasons: Dict[str, int] = Field(default_factory=dict)
    warning_messages: List[str] = Field(default_factory=list)


class HarmonizationConfig(BaseModel):
    """User-configurable parameters for spatial-temporal harmonization."""
    grid_size_km: float = 1.0
    colocation_distance_meters: float = 1000.0
    colocation_time_window_minutes: int = 60
    confidence_filter_modis: Optional[List[str]] = None  # e.g. ["nominal", "high"]
    confidence_filter_viirs: Optional[List[str]] = None  # e.g. ["nominal", "high"]
    time_aggregation: str = "daily"  # "daily", "weekly", "monthly", "yearly"
    crs_epsg: Optional[int] = None  # Auto-selected if None
