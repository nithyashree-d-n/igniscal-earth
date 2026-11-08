"""Response schemas for FireSignal API."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.canonical import DataQualitySummary, ObservationRecord


class HealthResponse(BaseModel):
    status: str
    version: str
    firms_configured: bool
    environment: str
    supported_sensors: List[str]
    predefined_regions: List[Dict[str, Any]]


class DatasetInfo(BaseModel):
    dataset_id: str
    name: str
    source_type: str  # "SAMPLE", "UPLOAD", "NASA_FIRMS_NRT"
    total_records: int
    modis_count: int
    viirs_count: int
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    spatial_extent: Optional[List[float]] = None
    created_at: str
    is_demo: bool = False
    quality_summary: Optional[DataQualitySummary] = None


class SummaryMetrics(BaseModel):
    total_combined_detections: int
    total_modis_detections: int
    total_viirs_detections: int
    modis_share_percent: float
    viirs_share_percent: float
    active_days_count: int
    active_grid_cells_count: int
    daily_average_detections: float
    peak_activity_date: Optional[str] = None
    peak_activity_count: int = 0
    total_frp_mw: Optional[float] = None
    mean_frp_mw: Optional[float] = None
    max_frp_mw: Optional[float] = None
    day_detections_count: int
    night_detections_count: int
    colocated_detections_count: int
    colocated_percentage: float
    anomaly_status: str
    anomaly_score: float
    anomaly_explanation: str


class TimeSeriesPoint(BaseModel):
    period: str  # Date string or period label
    modis_count: int
    viirs_count: int
    combined_count: int
    active_cells: int
    mean_frp: Optional[float] = None
    max_frp: Optional[float] = None
    day_count: int
    night_count: int


class BaselineMonthComparison(BaseModel):
    month: int
    month_name: str
    current_count: int
    historical_median: float
    historical_mean: float
    historical_std: float
    historical_iqr: float
    historical_mad: float
    historical_years_count: int
    anomaly_score: float
    status: str  # "Within Range", "Above Baseline", "Significantly Above", "Below Baseline", "Insufficient Baseline"
    explanation: str


class SeasonalityAnalysis(BaseModel):
    monthly_climatology: List[Dict[str, Any]]
    peak_months: List[str]
    lowest_months: List[str]
    interannual_comparison: Dict[str, Dict[str, int]]  # {year: {month: count}}


class AnomalySummary(BaseModel):
    period: str
    current_activity: int
    historical_median: float
    historical_mad: float
    anomaly_score: float
    classification: str
    baseline_sample_size_years: int
    explanation: str
    is_statistically_significant: bool


class GridCellFeature(BaseModel):
    grid_cell_id: str
    center_lat: float
    center_lon: float
    bounds: List[List[float]]  # 4-5 coordinate pairs for GeoJSON polygon
    total_detections: int
    modis_detections: int
    viirs_detections: int
    total_frp: Optional[float] = None
    mean_frp: Optional[float] = None
    dominant_sensor: str


class MapDataResponse(BaseModel):
    aoi_geojson: Optional[Dict[str, Any]] = None
    grid_cells: List[GridCellFeature]
    observations_sample: List[Dict[str, Any]]  # Renderable point objects (capped or sampled for performance)
    total_observations_count: int
    colocation_groups_count: int
