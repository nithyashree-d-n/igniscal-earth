"""Integration tests for the complete FireSignal API flow."""
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "supported_sensors" in data
    assert len(data["supported_sensors"]) >= 4
    assert len(data["predefined_regions"]) >= 3


def test_sources_endpoint():
    response = client.get("/api/data/sources")
    assert response.status_code == 200
    data = response.json()
    assert "supported_sources" in data
    assert "MODIS_NRT" in data["supported_sources"]
    assert "VIIRS_SNPP_NRT" in data["supported_sources"]


def test_datasets_listing_contains_benchmark_demo():
    response = client.get("/api/data/datasets")
    assert response.status_code == 200
    datasets = response.json()
    assert len(datasets) >= 1
    demo_ds = next((d for d in datasets if d["is_demo"]), None)
    assert demo_ds is not None
    assert demo_ds["total_records"] > 0
    assert demo_ds["modis_count"] > 0
    assert demo_ds["viirs_count"] > 0


def test_csv_upload_and_analysis_pipeline():
    sample_csv = (
        "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight\n"
        "12.50,76.50,325.4,1.0,1.0,2024-03-15,0430,Terra,MODIS,85,6.1NRT,300.2,25.4,D\n"
        "12.52,76.51,335.2,1.0,1.0,2024-03-15,0430,Aqua,MODIS,90,6.1NRT,305.1,35.1,D\n"
        "12.51,76.50,,0.38,0.36,2024-03-15,0515,Suomi-NPP,VIIRS,nominal,2.0NRT,,18.2,D\n"
    )

    # 1. Upload CSV
    file_payload = {"file": ("test_upload.csv", sample_csv.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/data/upload", files=file_payload)
    assert upload_res.status_code == 200
    ds_info = upload_res.json()
    dataset_id = ds_info["dataset_id"]
    assert ds_info["total_records"] == 3
    assert ds_info["modis_count"] == 2
    assert ds_info["viirs_count"] == 1

    # 2. Run Analysis on the uploaded dataset
    run_req = {
        "dataset_id": dataset_id,
        "harmonization_config": {
            "grid_size_km": 1.0,
            "colocation_distance_meters": 1000.0,
            "colocation_time_window_minutes": 60,
            "time_aggregation": "daily"
        }
    }
    analysis_res = client.post("/api/analysis/run", json=run_req)
    assert analysis_res.status_code == 200
    analysis_data = analysis_res.json()
    analysis_id = analysis_data["analysis_id"]

    # 3. Check Summary
    summary_res = client.get(f"/api/analysis/{analysis_id}/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_combined_detections"] == 3
    assert summary["total_modis_detections"] == 2
    assert summary["total_viirs_detections"] == 1
    assert summary["total_frp_mw"] == pytest.approx(78.7, 0.1)

    # 4. Check Map Data
    map_res = client.get(f"/api/analysis/{analysis_id}/map")
    assert map_res.status_code == 200
    map_data = map_res.json()
    assert map_data["total_observations_count"] == 3
    assert len(map_data["grid_cells"]) >= 1

    # 5. Check Timeseries Data
    ts_res = client.get(f"/api/analysis/{analysis_id}/timeseries")
    assert ts_res.status_code == 200
    ts_data = ts_res.json()
    assert len(ts_data) == 1
    assert ts_data[0]["combined_count"] == 3

    # 6. Test Data Export (Observations CSV and GeoJSON)
    export_csv = client.get(f"/api/analysis/{analysis_id}/export?format_type=observations_csv")
    assert export_csv.status_code == 200
    assert "observation_id,latitude,longitude" in export_csv.text

    export_geojson = client.get(f"/api/analysis/{analysis_id}/export?format_type=grid_geojson")
    assert export_geojson.status_code == 200
    geo_data = export_geojson.json()
    assert geo_data["type"] == "FeatureCollection"
    assert len(geo_data["features"]) >= 1
