"""Request schemas for FireSignal API."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.canonical import HarmonizationConfig


class BoundingBox(BaseModel):
    min_lon: float = Field(..., ge=-180.0, le=180.0)
    min_lat: float = Field(..., ge=-90.0, le=90.0)
    max_lon: float = Field(..., ge=-180.0, le=180.0)
    max_lat: float = Field(..., ge=-90.0, le=90.0)


class AOISpecification(BaseModel):
    region_id: Optional[str] = None  # "karnataka", "western_ghats", etc.
    bbox: Optional[List[float]] = None  # [min_lon, min_lat, max_lon, max_lat]
    geojson: Optional[Dict[str, Any]] = None  # Custom polygon/geometry


class FIRMSFetchRequest(BaseModel):
    aoi: AOISpecification
    date_range_days: int = Field(default=3, ge=1, le=10)
    sensors: List[str] = Field(
        default=["MODIS_NRT", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"]
    )
    custom_map_key: Optional[str] = None  # Optional user-supplied MAP_KEY override


class AnalysisRunRequest(BaseModel):
    dataset_id: str
    aoi: Optional[AOISpecification] = None
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD
    selected_sensors: Optional[List[str]] = None  # ["MODIS", "VIIRS"]
    harmonization_config: HarmonizationConfig = Field(default_factory=HarmonizationConfig)
    baseline_years_back: int = 3  # Number of historical years for baseline comparison
