# FireSignal — Unified MODIS–VIIRS Fire Activity Intelligence Platform

> **"One view of fire activity. Across sensors. Across time."**

FireSignal is a full-stack geospatial remote-sensing intelligence platform designed to ingest, standardize, spatially harmonize, and analyze active fire and thermal anomaly observations from NASA's Earth-observing satellite instruments (**MODIS** and **VIIRS**).

---

## 1. Problem Statement
NASA's **MODIS** (on Terra and Aqua) and **VIIRS** (on Suomi-NPP, NOAA-20, and NOAA-21) provide critical active-fire thermal detections worldwide. However, their physical characteristics differ substantially:
- **Spatial Resolution:** MODIS observes at ~1 km pixel resolution; VIIRS 375 m I-bands resolve fires at roughly 8× smaller area per pixel.
- **Sensitivity:** VIIRS detects cooler, smaller, and early-stage fires that fall below MODIS's radiometric detection threshold.
- **Confidence Representation:** MODIS outputs a continuous percentage (0–100%); VIIRS outputs categorical classes (`low`, `nominal`, `high`).
- **Overpass Times & Orbits:** Morning and afternoon orbits sample fires at different times of the diurnal burn cycle.

Blindly concatenating these records introduces severe statistical artifacts. FireSignal provides an explainable, sensor-aware harmonization engine and robust climatological anomaly detection to solve this challenge.

---

## 2. Architecture Diagram

```mermaid
flowchart TD
    subgraph Data Sources
        FIRMS[NASA FIRMS REST API\nNear-Real-Time Feeds]
        CSV[User Historical CSVs\nFIRMS Archive Downloads]
        SAMPLE[Bundled Benchmark Dataset\nKarnataka 2021-2024]
    end

    subgraph Ingestion & Validation Engine
        CLIENT[FirmsClient\nAPI Key & Rate Limiting]
        VAL[DataValidator\nCoordinate, Date, FRP & Deduplication]
        NORM[DataNormalizer\nCanonical Schema & UTC Mapping]
    end

    subgraph Harmonization & Analytics Engine
        GRID[Spatial Harmonizer\nNominal 1km Projected Grid Aggregation]
        COLOC[Co-location Detector\nSpatiotemporal Proximity Flagging]
        BASE[Historical Baseline Calculator\nMonthly Median & IQR Distribution]
        ANOM[Robust Anomaly Detector\nMedian Absolute Deviation MAD Scoring]
    end

    subgraph Backend API (FastAPI)
        API[/api/health, /api/data/*, /api/analysis/*, /api/export/*]
    end

    subgraph Modern Web UI (React + TypeScript + Tailwind + Leaflet)
        MAP[Interactive Leaflet GIS Map\nSensor hot spots & 1km Grids]
        CHARTS[Recharts Analytical Visualizations\nTimeseries & Climatology]
        EXPORT[Data & GeoJSON Exporter]
    end

    FIRMS --> CLIENT
    CSV --> VAL
    SAMPLE --> VAL
    CLIENT --> VAL
    VAL --> NORM
    NORM --> GRID
    NORM --> COLOC
    GRID --> BASE
    BASE --> ANOM
    GRID --> API
    COLOC --> API
    ANOM --> API
    API --> MAP
    API --> CHARTS
    API --> EXPORT
```

---

## 3. Technology Stack

### Backend
- **Python 3.11 / 3.13 / 3.14**
- **FastAPI & Uvicorn**: High-performance asynchronous REST API.
- **Pydantic v2**: Strict canonical schema validation.
- **GeoPandas, Shapely & PyProj**: Cartographic coordinate reprojection (UTM) and equal-area spatial grid partitioning.
- **Pandas, NumPy & SciPy**: Robust non-parametric statistics and MAD computation.
- **Pytest**: Unit, scientific correctness, and end-to-end integration test suites.

### Frontend
- **React 18 & TypeScript**: Strongly-typed component architecture.
- **Vite & Tailwind CSS v4**: Ultra-fast build pipeline with custom dark scientific theme.
- **Leaflet & React-Leaflet**: GPU-accelerated interactive mapping with CartoDB Dark Matter basemaps.
- **Recharts**: Responsive SVG analytical timeseries and climatology charts.
- **Lucide React**: Clean scientific iconography.

---

## 4. Key Features

1. **Sensor-Aware Normalization**: Converts raw MODIS and VIIRS records into a canonical schema while preserving raw instrument columns, primary brightness temperatures, and distinct confidence representations.
2. **Projected Common-Grid Harmonization**: Projects geographic coordinates into local UTM equal-area grids (~1 km) without degree-based distortion, aggregating observations while maintaining distinct sensor counts.
3. **Co-location Detection without Data Deletion**: Identifies cross-sensor observations within 1000 m and ±60 minutes, clustering them under common group identifiers without deleting raw records.
4. **Robust MAD Anomaly Detection**: Employs Median Absolute Deviation (MAD) to evaluate current fire activity against multi-year historical monthly baselines, resistant to extreme wildfire outliers.
5. **Interactive GIS Map**: Visualizes sensor hotspots (gold for MODIS, orange for VIIRS, cyan for co-located), 1 km common-grid polygons, and selected AOI bounding boxes.
6. **Multi-Source Ingestion**:
   - Live NASA FIRMS NRT API fetching with client-side or server-side `FIRMS_MAP_KEY`.
   - Drag-and-drop CSV upload for custom or historical FIRMS files.
   - Bundled 2021–2024 multi-sensor benchmark dataset for Karnataka forest reserves and agricultural zones.
7. **Comprehensive Data Export**: One-click download of canonical observations (CSV), common-grid spatial cells (CSV & GeoJSON), temporal aggregates (CSV), and anomaly reports (CSV).

---

## 5. Installation & Setup on Windows 11

### Prerequisites
- Node.js (v18+)
- Python (3.11, 3.12, or 3.13 recommended)

### Step 1: Clone or Navigate to Repository
```powershell
cd d:\Nasa
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
To query live NASA data, obtain a free 32-character `MAP_KEY` from [NASA FIRMS API Key Registration](https://firms.modaps.eosdis.nasa.gov/api/map_key/) and configure it in `.env`:
```env
FIRMS_MAP_KEY=your_32_character_map_key_here
```
*(Note: If you do not have a MAP_KEY, FireSignal runs in Demo Mode using the bundled Karnataka benchmark dataset or custom uploaded CSVs).*

### Step 3: Start Backend API
Install backend dependencies:
```powershell
python -m pip install -r backend/requirements.txt
```
Start the FastAPI server:
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and Swagger docs will be accessible at `http://127.0.0.1:8000/docs`.

### Step 4: Start Frontend Dashboard
In a separate terminal:
```powershell
cd d:\Nasa\frontend
npm install
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## 6. How to Run Tests

### Run Backend Tests (Unit, Correctness, and Integration)
```powershell
cd d:\Nasa
python -m pytest backend/tests -v
```
All 15 tests verify:
- Sensor identity preservation
- Projected spatial grid assignment
- Co-location detection without record deletion
- Minimum baseline requirements (preventing false anomalies)
- Robust MAD anomaly scoring
- CSV validation, coordinate range checks, and end-to-end API workflows.

### Run Frontend Typecheck & Production Build
```powershell
cd d:\Nasa\frontend
npm run build
```

---

## 7. Limitations & Operational Positioning

- **Thermal Anomalies ≠ Burned Area:** Satellite hotspots signify instantaneous thermal signatures at overpass time, not total burned perimeter or land area.
- **FRP ≠ Total Damage:** Fire Radiative Power (MW) measures the instantaneous rate of radiant heat output.
- **Cloud/Smoke Obscuration:** Heavy clouds, rain, and thick smoke plumes attenuate thermal emissions and can conceal active ground fires.
- **No Wildfire Prediction:** FireSignal identifies statistically elevated observed activity against historical baselines; it does NOT forecast future ignition locations.

---

## 8. License & Attribution
- Active fire data courtesy of **NASA FIRMS** (EOSDIS / LANCE / NASA / NOAA).
- Software released under the MIT License.
