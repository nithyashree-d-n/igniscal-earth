"""Unit and scientific correctness tests for Analytics & Anomaly Detection."""
import pytest
from app.models.canonical import ObservationRecord
from app.services.analytics import AnalyticsEngine


def make_dummy_record(obs_id: str, date_str: str, sensor: str = "VIIRS", frp: float = 10.0) -> ObservationRecord:
    return ObservationRecord(
        observation_id=obs_id,
        latitude=12.0,
        longitude=76.0,
        acquisition_datetime_utc=f"{date_str}T04:00:00Z",
        acquisition_date=date_str,
        acquisition_time="0400",
        sensor_family=sensor,
        satellite="Suomi-NPP" if sensor == "VIIRS" else "Terra",
        instrument=sensor,
        product="TEST",
        frp=frp
    )


def test_insufficient_baseline_guard():
    """Verify that fewer than 2 historical baseline years produces 'Insufficient Baseline'."""
    # Data from only 1 historical year (2023) and current year (2024)
    records = [
        make_dummy_record("1", "2023-03-10"),
        make_dummy_record("2", "2024-03-12"),
    ]

    baselines = AnalyticsEngine.calculate_historical_baseline(records, current_year=2024)
    march_comp = next(b for b in baselines if b.month == 3)

    assert march_comp.status == "Insufficient Baseline"
    assert march_comp.historical_years_count == 1
    assert "insufficient" in march_comp.explanation.lower()


def test_mad_anomaly_detection_elevated_activity():
    """Verify robust MAD anomaly scoring accurately detects elevated fire activity."""
    # Historical years 2021, 2022, 2023 with modest activity in March: 10, 12, 11
    # Current year 2024 has 60 detections (severe anomaly)
    records = []
    
    # 2021: 10 records
    for i in range(10):
        records.append(make_dummy_record(f"2021_{i}", "2021-03-15"))
    # 2022: 12 records
    for i in range(12):
        records.append(make_dummy_record(f"2022_{i}", "2022-03-15"))
    # 2023: 11 records
    for i in range(11):
        records.append(make_dummy_record(f"2023_{i}", "2023-03-15"))
    # 2024: 60 records
    for i in range(60):
        records.append(make_dummy_record(f"2024_{i}", "2024-03-15"))

    baselines = AnalyticsEngine.calculate_historical_baseline(records, current_year=2024)
    march_comp = next(b for b in baselines if b.month == 3)

    assert march_comp.historical_years_count == 3
    assert march_comp.historical_median == 11.0
    assert march_comp.current_count == 60
    assert march_comp.anomaly_score > 3.0
    assert march_comp.status == "Significantly Above Baseline"


def test_summary_metrics_frp_and_sensor_shares():
    """Verify KPIs calculate sensor shares and FRP statistics accurately."""
    records = [
        make_dummy_record("m1", "2024-03-10", sensor="MODIS", frp=50.0),
        make_dummy_record("v1", "2024-03-10", sensor="VIIRS", frp=20.0),
        make_dummy_record("v2", "2024-03-11", sensor="VIIRS", frp=30.0),
    ]

    summary = AnalyticsEngine.calculate_summary_metrics(
        records=records,
        timeseries=[],
        anomaly_status="Within Range",
        anomaly_score=0.5
    )

    assert summary.total_combined_detections == 3
    assert summary.total_modis_detections == 1
    assert summary.total_viirs_detections == 2
    assert summary.modis_share_percent == 33.3
    assert summary.viirs_share_percent == 66.7
    assert summary.total_frp_mw == 100.0
    assert summary.mean_frp_mw == pytest.approx(33.33, 0.01)
    assert summary.max_frp_mw == 50.0
    assert summary.active_days_count == 2
