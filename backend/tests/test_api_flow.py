"""Integration tests for the complete FireSignal API flow."""
import io
import json
import pytest
from app.api.endpoints import (
    get_health,
    get_sources,
    list_datasets,
    run_analysis,
    get_analysis_summary,
    get_analysis_map,
    get_analysis_timeseries,
    export_analysis_data,
)
from app.schemas.requests import AnalysisRunRequest, HarmonizationConfig
from app.services.ingestion import ingestion_service


def test_health_endpoint():
    res = get_health()
    assert res.status == "healthy"
    assert res.version == "1.0.0"
    assert len(res.supported_sensors) >= 4
    assert len(res.predefined_regions) >= 3


def test_sources_endpoint():
    res = get_sources()
    assert "supported_sources" in res
    assert "MODIS_NRT" in res["supported_sources"]
    assert "VIIRS_SNPP_NRT" in res["supported_sources"]


def test_datasets_listing_contains_benchmark_demo():
    datasets = list_datasets()
    assert len(datasets) >= 1
    demo_ds = next((d for d in datasets if d.is_demo), None)
    assert demo_ds is not None
    assert demo_ds.total_records > 0
    assert demo_ds.modis_count > 0
    assert demo_ds.viirs_count > 0


def test_csv_upload_and_analysis_pipeline():
    sample_csv = (
        "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight\n"
        "12.50,76.50,325.4,1.0,1.0,2024-03-15,0430,Terra,MODIS,85,6.1NRT,300.2,25.4,D\n"
        "12.52,76.51,335.2,1.0,1.0,2024-03-15,0430,Aqua,MODIS,90,6.1NRT,305.1,35.1,D\n"
        "12.51,76.50,,0.38,0.36,2024-03-15,0515,Suomi-NPP,VIIRS,nominal,2.0NRT,,18.2,D\n"
    )

    # 1. Ingest CSV directly
    ds_info = ingestion_service.ingest_uploaded_csv(
        content=sample_csv,
        filename="test_upload.csv"
    )
    dataset_id = ds_info.dataset_id
    assert ds_info.total_records == 3
    assert ds_info.modis_count == 2
    assert ds_info.viirs_count == 1

    # 2. Run Analysis on the uploaded dataset
    run_req = AnalysisRunRequest(
        dataset_id=dataset_id,
        harmonization_config=HarmonizationConfig(
            grid_size_km=1.0,
            colocation_distance_meters=1000.0,
            colocation_time_window_minutes=60,
            time_aggregation="daily"
        )
    )
    analysis_res = run_analysis(run_req)
    analysis_id = analysis_res["analysis_id"]
    assert analysis_res["timeseries_count"] == 1
    assert analysis_res["grid_cells_count"] >= 1

    # 3. Check Summary
    summary = get_analysis_summary(analysis_id)
    assert summary.total_combined_detections == 3
    assert summary.total_modis_detections == 2
    assert summary.total_viirs_detections == 1
    assert summary.total_frp_mw == pytest.approx(78.7, 0.1)

    # 4. Check Map Data
    map_data = get_analysis_map(analysis_id)
    assert map_data.total_observations_count == 3
    assert len(map_data.grid_cells) >= 1
    assert len(map_data.observations_sample) == 3

    # 5. Check Timeseries Data
    ts_data = get_analysis_timeseries(analysis_id)
    assert len(ts_data) == 1
    assert ts_data[0].combined_count == 3

    # 6. Test Data Export (Observations CSV and GeoJSON)
    export_csv = export_analysis_data(analysis_id, format_type="observations_csv")
    assert "observation_id,latitude,longitude" in export_csv.body.decode("utf-8")

    export_geojson = export_analysis_data(analysis_id, format_type="grid_geojson")
    geo_data = json.loads(export_geojson.body.decode("utf-8"))
    assert geo_data["type"] == "FeatureCollection"
    assert len(geo_data["features"]) >= 1
