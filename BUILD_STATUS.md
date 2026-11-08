# FireSignal Build Status & Implementation Tracker

## Phase 1 — Environment Inspection and Architecture
- [x] Inspect runtime environment (Node v24.16.0, Python 3.13 / 3.14, Windows 11).
- [x] Verify geospatial & backend libraries (FastAPI, uvicorn, pydantic, geopandas, shapely, pyproj, scipy, pandas, numpy, pytest).
- [x] Create project directory layout (`backend`, `frontend`, `data`, `docs`, `scripts`).
- [x] Create `.gitignore` and `.env.example`.
- [x] Create architecture documentation (`docs/architecture.md`).

## Phase 2 — Data Ingestion & Validation
- [x] Implement robust NASA FIRMS API client (`FIRMS_MAP_KEY` handling, NRT area query, availability check, rate limiting, error handling).
- [x] Implement CSV file ingestion adapter (supporting MODIS C6.1 and VIIRS 375m NRT/standard formats).
- [x] Create realistic multi-year sample datasets (Karnataka & Western Ghats 2021-2024 benchmark) with clearly documented provenance.
- [x] Implement data validation engine (coordinate range, date parsing, FRP validity, AOI bounding, quality metrics summary).

## Phase 3 — Normalization & Sensor-Aware Harmonization Engine
- [x] Canonical Schema implementation preserving raw fields, sensor type, satellite platform, primary/secondary brightness temps.
- [x] UTC timestamp normalization (`acq_date` + `acq_time` -> ISO UTC).
- [x] Sensor-specific confidence classification (MODIS numeric % -> categories; VIIRS categorical Low/Nominal/High preserved).
- [x] Spatial common-grid aggregation (nominal ~1km projected UTM CRS cells, retaining separate sensor counts, FRP stats, active cells).
- [x] Temporal aggregation (Daily, Weekly, Monthly, Yearly).
- [x] Co-location detection algorithm (configurable spatial buffer e.g. 1000m, temporal window e.g. 60m, flagging without silent deletion).

## Phase 4 — Analytics Engine
- [x] Core metrics calculator (MODIS vs VIIRS counts, active days, active cells, mean/max FRP, day/night split).
- [x] Historical baseline calculator (monthly medians, means, IQR, standard deviations, minimum historical sample requirements).
- [x] Robust Anomaly Detection (MAD-based deviation, handling MAD=0, classifications: within baseline, above, significantly above, below, insufficient baseline).
- [x] Seasonal & Climatology analysis (monthly profile, interannual patterns, peak months).
- [x] Trend estimation (monthly series, rolling averages).

## Phase 5 — Frontend Dashboard & Visualization
- [x] Vite + React + TypeScript + Tailwind CSS setup.
- [x] Leaflet map component with custom sensor symbols (MODIS vs VIIRS), spatial grid overlay, AOI selector (India, Karnataka, custom bbox).
- [x] Dashboard views: Overview, Explore & Harmonize, Analytics & Anomalies, Methodology, Data Quality, Export.
- [x] Dynamic Recharts charts (timeseries, sensor comparisons, baseline bands, FRP distribution).
- [x] NASA API fetch modal + Sample dataset loader + CSV file uploader.

## Phase 6 — Export & Reports
- [x] CSV exports (raw filtered, canonical normalized, common-grid spatial, temporal summaries, anomaly metrics).
- [x] GeoJSON export for spatial grid and hotspot geometries.
- [x] Formatted analytical report generation.

## Phase 7 — Testing, Verification & Documentation
- [x] Backend unit & scientific correctness tests (`tests/test_validation.py`, `tests/test_harmonization.py`, `tests/test_analytics.py`, `tests/test_firms_client.py`).
- [x] End-to-end integration test (`tests/test_api_flow.py`).
- [x] 15 / 15 backend tests passing.
- [x] Frontend build verification (`npm run build` completed cleanly).
- [x] Comprehensive documentation (`docs/architecture.md`, `docs/methodology.md`, `docs/data_sources.md`, `docs/limitations.md`, `docs/testing.md`, `README.md`).
