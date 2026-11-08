# FireSignal Build Status & Implementation Tracker

## Phase 1 — Environment Inspection and Architecture
- [x] Inspect runtime environment (Node v24.16.0, Python 3.14.5, Windows 11).
- [x] Verify geospatial & backend libraries (FastAPI, uvicorn, pydantic, geopandas, shapely, pyproj, scipy, pandas, numpy, pytest).
- [x] Create project directory layout (`backend`, `frontend`, `data`, `docs`, `scripts`).
- [x] Create `.gitignore` and `.env.example`.
- [x] Create initial `docs/architecture.md`.

## Phase 2 — Data Ingestion & Validation
- [ ] Implement robust NASA FIRMS API client (`FIRMS_MAP_KEY` handling, NRT area query, availability check, rate limiting, error handling).
- [ ] Implement CSV file ingestion adapter (supporting MODIS C6.1 and VIIRS 375m NRT/standard formats).
- [ ] Create realistic multi-year sample datasets (Karnataka & Western Ghats, central India) with clearly documented provenance.
- [ ] Implement data validation engine (coordinate range, date parsing, FRP validity, AOI bounding, quality metrics summary).

## Phase 3 — Normalization & Sensor-Aware Harmonization Engine
- [ ] Canonical Schema implementation preserving raw fields, sensor type, satellite platform, primary/secondary brightness temps.
- [ ] UTC timestamp normalization (`acq_date` + `acq_time` -> ISO UTC).
- [ ] Sensor-specific confidence classification (MODIS numeric % -> categories; VIIRS categorical Low/Nominal/High preserved).
- [ ] Spatial common-grid aggregation (nominal ~1km projected CRS cells, retaining separate sensor counts, FRP stats, active cells).
- [ ] Temporal aggregation (Daily, Weekly, Monthly, Yearly).
- [ ] Co-location detection algorithm (configurable spatial buffer e.g. 1000m, temporal window e.g. 60m, flagging without silent deletion).

## Phase 4 — Analytics Engine
- [ ] Core metrics calculator (MODIS vs VIIRS counts, active days, active cells, mean/max FRP, day/night split).
- [ ] Historical baseline calculator (monthly medians, means, IQR, standard deviations, minimum historical sample requirements).
- [ ] Robust Anomaly Detection (MAD-based deviation, handling MAD=0, classifications: within baseline, above, significantly above, below, insufficient baseline).
- [ ] Seasonal & Climatology analysis (monthly profile, interannual patterns, peak months).
- [ ] Trend estimation (monthly series, rolling averages).

## Phase 5 — Frontend Dashboard & Visualization
- [ ] Vite + React + TypeScript + Tailwind CSS setup.
- [ ] Leaflet map component with custom sensor symbols (MODIS vs VIIRS), spatial grid overlay, AOI selector (India, Karnataka, custom bbox).
- [ ] Dashboard views: Overview, Explore & Harmonize, Analytics & Anomalies, Methodology, Data Quality, Export.
- [ ] Dynamic Recharts charts (timeseries, sensor comparisons, baseline bands, FRP distribution).
- [ ] NASA API fetch modal + Sample dataset loader + CSV file uploader.

## Phase 6 — Export & Reports
- [ ] CSV exports (raw filtered, canonical normalized, common-grid spatial, temporal summaries, anomaly metrics).
- [ ] GeoJSON export for spatial grid and hotspot geometries.
- [ ] Formatted analytical report generation.

## Phase 7 — Testing, Verification & Documentation
- [ ] Backend unit & scientific correctness tests (`tests/test_validation.py`, `tests/test_harmonization.py`, `tests/test_analytics.py`, `tests/test_firms_client.py`).
- [ ] End-to-end integration test (`tests/test_api_flow.py`).
- [ ] Frontend build verification (`npm run build`).
- [ ] Comprehensive documentation (`docs/architecture.md`, `docs/methodology.md`, `docs/data_sources.md`, `docs/limitations.md`, `docs/testing.md`, `README.md`).
