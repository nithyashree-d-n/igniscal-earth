"""Unit and scientific correctness tests for Sensor-Aware Harmonization."""
import pytest
from app.models.canonical import ObservationRecord, HarmonizationConfig
from app.services.normalization import DataNormalizer
from app.services.harmonization import HarmonizationEngine


def test_sensor_identity_preservation():
    """Verify MODIS and VIIRS records retain distinct identities and field models."""
    raw_modis = [{
        "_parsed_lat": 12.50,
        "_parsed_lon": 76.50,
        "_parsed_date": "2023-03-15",
        "_parsed_time": "0430",
        "_parsed_frp": 25.0,
        "_sensor_family": "MODIS",
        "satellite": "Terra",
        "confidence": "85",
        "brightness": 325.0,
        "bright_t31": 300.0
    }]
    raw_viirs = [{
        "_parsed_lat": 12.50,
        "_parsed_lon": 76.50,
        "_parsed_date": "2023-03-15",
        "_parsed_time": "0515",
        "_parsed_frp": 15.0,
        "_sensor_family": "VIIRS",
        "satellite": "Suomi-NPP",
        "confidence": "nominal",
        "bright_ti4": 340.0,
        "bright_ti5": 305.0
    }]

    modis_obs = DataNormalizer.normalize_records(raw_modis, "test_file", "MODIS_NRT")[0]
    viirs_obs = DataNormalizer.normalize_records(raw_viirs, "test_file", "VIIRS_NRT")[0]

    # Verify distinct sensor families
    assert modis_obs.sensor_family == "MODIS"
    assert viirs_obs.sensor_family == "VIIRS"
    assert modis_obs.instrument == "MODIS"
    assert viirs_obs.instrument == "VIIRS"
    assert modis_obs.satellite == "Terra"
    assert viirs_obs.satellite == "Suomi-NPP"

    # Verify confidence mapping integrity
    assert modis_obs.confidence_class == "high"  # 85% mapped to high
    assert viirs_obs.confidence_class == "nominal"  # categorical nominal preserved

    # Verify primary brightness temperature mapping
    assert modis_obs.brightness_temperature_primary == 325.0
    assert viirs_obs.brightness_temperature_primary == 340.0

    # Verify UTC ISO formatting
    assert modis_obs.acquisition_datetime_utc == "2023-03-15T04:30:00Z"
    assert viirs_obs.acquisition_datetime_utc == "2023-03-15T05:15:00Z"


def test_colocation_flagging_without_deletion():
    """Verify co-located observations are flagged with group ID and NEVER deleted."""
    obs1 = ObservationRecord(
        observation_id="obs_modis_1",
        latitude=12.5000,
        longitude=76.5000,
        acquisition_datetime_utc="2023-03-15T04:30:00Z",
        acquisition_date="2023-03-15",
        acquisition_time="0430",
        sensor_family="MODIS",
        satellite="Terra",
        instrument="MODIS",
        product="MODIS_C6_1",
        frp=20.0
    )
    # Near in space (~200m) and near in time (15 mins apart)
    obs2 = ObservationRecord(
        observation_id="obs_viirs_1",
        latitude=12.5015,
        longitude=76.5015,
        acquisition_datetime_utc="2023-03-15T04:45:00Z",
        acquisition_date="2023-03-15",
        acquisition_time="0445",
        sensor_family="VIIRS",
        satellite="Suomi-NPP",
        instrument="VIIRS",
        product="VIIRS_SNPP",
        frp=15.0
    )

    records = [obs1, obs2]
    engine = HarmonizationEngine(HarmonizationConfig(
        colocation_distance_meters=1000.0,
        colocation_time_window_minutes=60
    ))
    
    harmonized, grid, ts, colocation_groups = engine.harmonize(records)

    # Crucial scientific check: both records remain present!
    assert len(harmonized) == 2
    assert harmonized[0].is_colocated is True
    assert harmonized[1].is_colocated is True
    assert harmonized[0].colocation_group_id == harmonized[1].colocation_group_id
    assert colocation_groups == 1


def test_spatial_common_grid_aggregation():
    """Verify observations are assigned to projected ~1km grid cells with dual sensor counts."""
    obs1 = ObservationRecord(
        observation_id="m1",
        latitude=12.5000,
        longitude=76.5000,
        acquisition_datetime_utc="2023-03-15T04:30:00Z",
        acquisition_date="2023-03-15",
        acquisition_time="0430",
        sensor_family="MODIS",
        satellite="Terra",
        instrument="MODIS",
        product="MODIS",
        frp=30.0
    )
    obs2 = ObservationRecord(
        observation_id="v1",
        latitude=12.5002,
        longitude=76.5002,
        acquisition_datetime_utc="2023-03-15T05:00:00Z",
        acquisition_date="2023-03-15",
        acquisition_time="0500",
        sensor_family="VIIRS",
        satellite="Suomi-NPP",
        instrument="VIIRS",
        product="VIIRS",
        frp=12.0
    )

    records = [obs1, obs2]
    engine = HarmonizationEngine(HarmonizationConfig(grid_size_km=1.0))
    harmonized, grid_cells, timeseries, _ = engine.harmonize(records)

    assert len(grid_cells) >= 1
    cell = grid_cells[0]
    assert cell.total_detections == 2
    assert cell.modis_detections == 1
    assert cell.viirs_detections == 1
    assert cell.dominant_sensor == "DUAL"
    assert cell.total_frp == 42.0
    assert cell.mean_frp == 21.0
