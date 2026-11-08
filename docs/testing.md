# Verification & Testing Report

## 1. Test Suite Overview
The FireSignal test suite encompasses unit tests, scientific correctness assertions, and end-to-end integration workflows.

### Running Backend Tests
```powershell
python -m pytest backend/tests -v
```

### Running Frontend Type-Check & Build
```powershell
cd frontend
npm run build
```

---

## 2. Test Coverage & Invariants Verified

### A. Scientific Correctness Tests (`backend/tests/test_harmonization.py`)
- **Sensor Identity Preservation**: Verifies MODIS observations retain MODIS instrumentation and Terra/Aqua satellites, while VIIRS retains VIIRS instrumentation and Suomi-NPP/NOAA-20/21 satellites.
- **Confidence Integrity**: Verifies MODIS numeric percentages map to explicit confidence classes (`high`, `nominal`, `low`) while VIIRS categorical values are preserved without loss.
- **Projected Common-Grid Aggregation**: Verifies that observations in local UTM projection are binned into nominal 1.0 km cells and retain distinct `modis_detections` and `viirs_detections`.
- **Co-location Flagging without Deletion**: Verifies that co-located observations within 1000m and 60 minutes receive cluster IDs and are NEVER deleted.

### B. Validation & Quality Reporting (`backend/tests/test_validation.py`)
- **Clean Ingestion**: Verifies parsing of multi-sensor attributes, date formatting, and FRP extraction.
- **Corrupt Coordinate & Date Rejection**: Verifies that missing coordinates, out-of-range latitudes/longitudes, and negative FRP values are counted and recorded in rejection reasons.
- **AOI Bounding Box Filter**: Verifies that observations outside the specified bounding box are excluded from active counts and tracked in quality telemetry.

### C. Analytics & MAD Anomaly Scoring (`backend/tests/test_analytics.py`)
- **Insufficient Baseline Guard**: Verifies that datasets with fewer than 2 historical baseline years produce an `Insufficient Baseline` status rather than false positive anomalies.
- **MAD Robustness**: Verifies that severe departures from median trigger `Significantly Above Baseline` with correct mathematical MAD scaling.
- **FRP & Sensor Share KPIs**: Verifies accurate calculation of mean FRP, max FRP, and sensor share percentages.

### D. End-to-End API Integration (`backend/tests/test_api_flow.py`)
- Verifies `/api/health`, `/api/data/sources`, `/api/data/datasets`, CSV ingestion, `/api/analysis/run`, map data retrieval, timeseries aggregation, and CSV/GeoJSON export downloads.
