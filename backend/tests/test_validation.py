"""Unit tests for data validation and quality reporting."""
import pytest
from app.services.validation import DataValidator
from app.services.normalization import DataNormalizer


def test_validation_clean_records():
    raw_data = [
        {
            "latitude": "12.50",
            "longitude": "76.50",
            "brightness": "325.4",
            "scan": "1.0",
            "track": "1.0",
            "acq_date": "2023-03-15",
            "acq_time": "0430",
            "satellite": "Terra",
            "instrument": "MODIS",
            "confidence": "85",
            "frp": "25.4",
            "daynight": "D"
        },
        {
            "latitude": "12.52",
            "longitude": "76.51",
            "bright_ti4": "340.2",
            "bright_ti5": "298.1",
            "scan": "0.38",
            "track": "0.36",
            "acq_date": "2023-03-15",
            "acq_time": "0515",
            "satellite": "Suomi-NPP",
            "instrument": "VIIRS",
            "confidence": "nominal",
            "frp": "12.8",
            "daynight": "D"
        }
    ]

    valid, summary = DataValidator.validate_records(
        raw_records=raw_data,
        dataset_id="test_ds",
        source_name="Test Source",
        product_name="Test Product"
    )

    assert len(valid) == 2
    assert summary.valid_records == 2
    assert summary.invalid_records == 0
    assert summary.duplicate_records == 0
    assert summary.modis_count == 1
    assert summary.viirs_count == 1


def test_validation_corrupt_coordinates_and_dates():
    corrupt_data = [
        {"latitude": "invalid", "longitude": "76.5", "acq_date": "2023-03-15", "acq_time": "0430"},
        {"latitude": "12.5", "longitude": "", "acq_date": "2023-03-15", "acq_time": "0430"},
        {"latitude": "12.5", "longitude": "76.5", "acq_date": "not_a_date", "acq_time": "0430"},
        {"latitude": "12.5", "longitude": "76.5", "acq_date": "2023-03-15", "acq_time": "0430", "frp": "-10.0"}  # negative FRP invalid
    ]

    valid, summary = DataValidator.validate_records(
        raw_records=corrupt_data,
        dataset_id="test_corrupt",
        source_name="Test Corrupt",
        product_name="Test"
    )

    assert len(valid) == 0
    assert summary.valid_records == 0
    assert summary.invalid_records == 4
    assert summary.rejection_reasons["missing_coordinates"] >= 1
    assert summary.rejection_reasons["invalid_date_or_time"] >= 1
    assert summary.rejection_reasons["invalid_frp"] == 1


def test_aoi_filtering():
    records = [
        {"latitude": "12.0", "longitude": "75.0", "acq_date": "2023-03-15", "acq_time": "0430"},  # Inside
        {"latitude": "25.0", "longitude": "85.0", "acq_date": "2023-03-15", "acq_time": "0430"},  # Outside
    ]
    bbox = [74.0, 11.0, 78.0, 15.0]  # [min_lon, min_lat, max_lon, max_lat]

    valid, summary = DataValidator.validate_records(
        raw_records=records,
        dataset_id="test_aoi",
        source_name="Test AOI",
        product_name="Test",
        aoi_bbox=bbox
    )

    assert len(valid) == 1
    assert summary.valid_records == 1
    assert summary.out_of_aoi_records == 1
