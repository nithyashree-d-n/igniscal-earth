"""REST API Endpoints for FireSignal."""
import uuid
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import PlainTextResponse

from app.core.config import settings
from app.schemas.requests import FIRMSFetchRequest, AnalysisRunRequest, AOISpecification
from app.schemas.responses import (
    HealthResponse,
    DatasetInfo,
    SummaryMetrics,
    TimeSeriesPoint,
    BaselineMonthComparison,
    SeasonalityAnalysis,
    MapDataResponse,
)
from app.services.firms_client import SUPPORTED_FIRMS_SOURCES, FirmsClientError
from app.services.ingestion import ingestion_service
from app.services.harmonization import HarmonizationEngine
from app.services.analytics import AnalyticsEngine
from app.services.export_service import ExportService

logger = logging.getLogger("firesignal.api")
router = APIRouter()

# In-memory store for completed analysis sessions: analysis_id -> dict
analysis_store: Dict[str, Dict[str, Any]] = {}


@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint showing configuration and supported sensors."""
    regions = [
        {"id": k, **v} for k, v in settings.PREDEFINED_REGIONS.items()
    ]
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        firms_configured=ingestion_service.firms_client.is_configured(),
        environment=settings.ENVIRONMENT,
        supported_sensors=list(SUPPORTED_FIRMS_SOURCES.keys()),
        predefined_regions=regions
    )


@router.get("/data/sources")
def get_sources():
    """Return catalog of supported MODIS and VIIRS products with scientific metadata."""
    return {
        "supported_sources": SUPPORTED_FIRMS_SOURCES,
        "firms_configured": ingestion_service.firms_client.is_configured(),
        "firms_base_url": settings.FIRMS_BASE_URL
    }


@router.get("/data/availability")
def get_availability(custom_map_key: Optional[str] = None):
    """Retrieve data availability from NASA FIRMS API."""
    try:
        avail = ingestion_service.firms_client.check_data_availability(custom_key=custom_map_key)
        return {"availability": avail}
    except FirmsClientError as e:
        raise HTTPException(status_code=e.status_code or 400, detail=e.message)


@router.get("/data/datasets", response_model=List[DatasetInfo])
def list_datasets():
    """List all available datasets in catalog (sample benchmark, uploaded, NASA fetched)."""
    return ingestion_service.list_datasets()


@router.get("/data/datasets/{dataset_id}")
def get_dataset_details(dataset_id: str):
    """Retrieve metadata and data-quality summary for a specific dataset."""
    ds = ingestion_service.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return ds["info"]


@router.post("/data/upload", response_model=DatasetInfo)
async def upload_csv(
    file: UploadFile = File(...),
    aoi_min_lon: Optional[float] = Form(None),
    aoi_min_lat: Optional[float] = Form(None),
    aoi_max_lon: Optional[float] = Form(None),
    aoi_max_lat: Optional[float] = Form(None)
):
    """Upload and validate a user-supplied CSV file containing active fire records."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin1", errors="replace")

    bbox = None
    if all(v is not None for v in [aoi_min_lon, aoi_min_lat, aoi_max_lon, aoi_max_lat]):
        bbox = [aoi_min_lon, aoi_min_lat, aoi_max_lon, aoi_max_lat]

    try:
        info = ingestion_service.ingest_uploaded_csv(
            content=content_str,
            filename=file.filename,
            aoi_bbox=bbox
        )
        return info
    except Exception as e:
        logger.error(f"Error parsing uploaded CSV: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process CSV file: {str(e)}")


@router.post("/data/fetch", response_model=DatasetInfo)
def fetch_firms_data(request: FIRMSFetchRequest):
    """
    Fetch near-real-time observations from NASA FIRMS API.
    Uses server-side FIRMS_MAP_KEY unless user provides custom override.
    """
    # Resolve bbox from AOI specification
    bbox = None
    if request.aoi.bbox and len(request.aoi.bbox) == 4:
        bbox = request.aoi.bbox
    elif request.aoi.region_id and request.aoi.region_id in settings.PREDEFINED_REGIONS:
        bbox = settings.PREDEFINED_REGIONS[request.aoi.region_id]["bbox"]
    else:
        raise HTTPException(
            status_code=400,
            detail="Valid bounding box or predefined region identifier must be provided."
        )

    try:
        info = ingestion_service.fetch_firms_live(
            bbox=bbox,
            sensors=request.sensors,
            day_range=request.date_range_days,
            custom_key=request.custom_map_key
        )
        return info
    except FirmsClientError as e:
        status_code = e.status_code if e.status_code else 400
        raise HTTPException(status_code=status_code, detail=e.message)
    except Exception as e:
        logger.error(f"FIRMS fetch failure: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch NASA FIRMS data: {str(e)}")


@router.post("/analysis/run")
def run_analysis(request: AnalysisRunRequest):
    """
    Run spatial-temporal harmonization and scientific analytics for a dataset.
    """
    ds = ingestion_service.get_dataset(request.dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{request.dataset_id}' not found.")

    records = ds["records"]

    # 1. Spatial filtering by AOI if provided
    bbox = None
    if request.aoi:
        if request.aoi.bbox and len(request.aoi.bbox) == 4:
            bbox = request.aoi.bbox
        elif request.aoi.region_id and request.aoi.region_id in settings.PREDEFINED_REGIONS:
            bbox = settings.PREDEFINED_REGIONS[request.aoi.region_id]["bbox"]

    if bbox:
        b_min_lon, b_min_lat, b_max_lon, b_max_lat = bbox
        records = [
            r for r in records
            if (b_min_lon <= r.longitude <= b_max_lon and b_min_lat <= r.latitude <= b_max_lat)
        ]

    # 2. Date filtering
    if request.start_date:
        records = [r for r in records if r.acquisition_date >= request.start_date]
    if request.end_date:
        records = [r for r in records if r.acquisition_date <= request.end_date]

    # 3. Sensor filtering
    if request.selected_sensors:
        sel_sensors = set(request.selected_sensors)
        records = [r for r in records if r.sensor_family in sel_sensors]

    # 4. Harmonization
    engine = HarmonizationEngine(config=request.harmonization_config)
    harmonized_records, grid_features, timeseries, colocation_groups = engine.harmonize(records)

    # 5. Historical Baseline & Anomaly Detection
    baseline_comparisons = AnalyticsEngine.calculate_historical_baseline(harmonized_records)
    anomaly_status, anomaly_score, anomaly_expl = AnalyticsEngine.evaluate_overall_anomaly(baseline_comparisons)

    # 6. Seasonality Analysis
    seasonality = AnalyticsEngine.calculate_seasonality(harmonized_records)

    # 7. Summary Metrics
    summary = AnalyticsEngine.calculate_summary_metrics(
        records=harmonized_records,
        timeseries=timeseries,
        anomaly_status=anomaly_status,
        anomaly_score=anomaly_score,
        anomaly_explanation=anomaly_expl
    )

    analysis_id = f"anl_{uuid.uuid4().hex[:12]}"
    analysis_store[analysis_id] = {
        "analysis_id": analysis_id,
        "dataset_id": request.dataset_id,
        "records": harmonized_records,
        "grid_features": grid_features,
        "timeseries": timeseries,
        "baseline_comparisons": baseline_comparisons,
        "seasonality": seasonality,
        "summary": summary,
        "colocation_groups_count": colocation_groups,
        "config": request.harmonization_config,
        "aoi_bbox": bbox
    }

    return {
        "analysis_id": analysis_id,
        "summary": summary,
        "timeseries_count": len(timeseries),
        "grid_cells_count": len(grid_features),
        "anomaly_status": anomaly_status
    }


@router.get("/analysis/{analysis_id}/summary", response_model=SummaryMetrics)
def get_analysis_summary(analysis_id: str):
    """Retrieve high-level summary metrics for an analysis."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return analysis_store[analysis_id]["summary"]


@router.get("/analysis/{analysis_id}/timeseries", response_model=List[TimeSeriesPoint])
def get_analysis_timeseries(analysis_id: str):
    """Retrieve aggregated temporal series for an analysis."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return analysis_store[analysis_id]["timeseries"]


@router.get("/analysis/{analysis_id}/seasonality", response_model=SeasonalityAnalysis)
def get_analysis_seasonality(analysis_id: str):
    """Retrieve monthly climatology and seasonal patterns."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return analysis_store[analysis_id]["seasonality"]


@router.get("/analysis/{analysis_id}/anomalies", response_model=List[BaselineMonthComparison])
def get_analysis_anomalies(analysis_id: str):
    """Retrieve monthly baseline comparisons and robust anomaly metrics."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return analysis_store[analysis_id]["baseline_comparisons"]


@router.get("/analysis/{analysis_id}/map", response_model=MapDataResponse)
def get_analysis_map(analysis_id: str, sample_limit: int = Query(default=1500, le=5000)):
    """Retrieve harmonized spatial grid features and sampled point observations for map rendering."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    
    anl = analysis_store[analysis_id]
    records = anl["records"]
    
    # Efficient sample for browser map rendering
    sample_records = []
    step = max(1, len(records) // sample_limit) if len(records) > sample_limit else 1
    for r in records[::step]:
        sample_records.append({
            "observation_id": r.observation_id,
            "lat": r.latitude,
            "lon": r.longitude,
            "sensor": r.sensor_family,
            "satellite": r.satellite,
            "date": r.acquisition_date,
            "time": r.acquisition_time,
            "confidence": r.confidence_class,
            "frp": r.frp,
            "brightness": r.brightness_temperature_primary,
            "is_colocated": r.is_colocated,
            "grid_cell_id": r.grid_cell_id
        })

    aoi_geojson = None
    if anl.get("aoi_bbox"):
        min_lon, min_lat, max_lon, max_lat = anl["aoi_bbox"]
        aoi_geojson = {
            "type": "Polygon",
            "coordinates": [[
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat]
            ]]
        }

    return MapDataResponse(
        aoi_geojson=aoi_geojson,
        grid_cells=anl["grid_features"],
        observations_sample=sample_records,
        total_observations_count=len(records),
        colocation_groups_count=anl["colocation_groups_count"]
    )


@router.get("/analysis/{analysis_id}/observations")
def get_analysis_observations(
    analysis_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500)
):
    """Retrieve paginated list of harmonized observations."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    
    records = analysis_store[analysis_id]["records"]
    total = len(records)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = [r.model_dump() for r in records[start_idx:end_idx]]

    return {
        "page": page,
        "page_size": page_size,
        "total_count": total,
        "total_pages": (total + page_size - 1) // page_size,
        "observations": page_items
    }


@router.get("/analysis/{analysis_id}/export")
def export_analysis_data(
    analysis_id: str,
    format_type: str = Query("observations_csv", regex="^(observations_csv|grid_csv|grid_geojson|timeseries_csv|anomalies_csv)$")
):
    """Export analytical data in CSV or GeoJSON format."""
    if analysis_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    
    anl = analysis_store[analysis_id]

    if format_type == "observations_csv":
        csv_str = ExportService.export_observations_csv(anl["records"])
        return PlainTextResponse(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=firesignal_observations_{analysis_id}.csv"}
        )
    elif format_type == "grid_csv":
        csv_str = ExportService.export_grid_csv(anl["grid_features"])
        return PlainTextResponse(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=firesignal_grid_{analysis_id}.csv"}
        )
    elif format_type == "grid_geojson":
        geojson_data = ExportService.export_grid_geojson(anl["grid_features"])
        return Response(
            content=json.dumps(geojson_data),
            media_type="application/geo+json",
            headers={"Content-Disposition": f"attachment; filename=firesignal_grid_{analysis_id}.geojson"}
        )
    elif format_type == "timeseries_csv":
        csv_str = ExportService.export_timeseries_csv(anl["timeseries"])
        return PlainTextResponse(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=firesignal_timeseries_{analysis_id}.csv"}
        )
    elif format_type == "anomalies_csv":
        csv_str = ExportService.export_anomalies_csv(anl["baseline_comparisons"])
        return PlainTextResponse(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=firesignal_anomalies_{analysis_id}.csv"}
        )
