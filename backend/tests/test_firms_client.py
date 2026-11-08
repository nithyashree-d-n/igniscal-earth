"""Unit tests for NASA FIRMS Client."""
import pytest
from app.services.firms_client import FirmsClient, FirmsClientError


def test_firms_client_parameter_validation():
    client = FirmsClient(map_key="mock_test_key_12345")
    
    # Invalid day range (< 1 or > 10)
    with pytest.raises(FirmsClientError) as exc_info:
        client.fetch_area_csv("MODIS_NRT", [74.0, 12.0, 78.0, 15.0], day_range=15)
    assert "day_range" in exc_info.value.message

    # Invalid bbox length
    with pytest.raises(FirmsClientError) as exc_info:
        client.fetch_area_csv("MODIS_NRT", [74.0, 12.0])
    assert "bbox" in exc_info.value.message

    # Unsupported source
    with pytest.raises(FirmsClientError) as exc_info:
        client.fetch_area_csv("UNKNOWN_SENSOR_SOURCE", [74.0, 12.0, 78.0, 15.0])
    assert "Unsupported" in exc_info.value.message


def test_firms_client_missing_key():
    client = FirmsClient(map_key="")
    with pytest.raises(FirmsClientError) as exc_info:
        client.fetch_area_csv("MODIS_NRT", [74.0, 12.0, 78.0, 15.0])
    assert exc_info.value.error_type == "unauthorized"
