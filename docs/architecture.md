# FireSignal Architecture & Design Document

## System Overview
FireSignal is an end-to-end geospatial and remote-sensing analytical platform designed to harmoniously ingest, standardize, spatial-temporally harmonize, and analyze active fire observations from NASA's MODIS and VIIRS satellite instruments.

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Data Sources
        FIRMS[NASA FIRMS NRT API]
        CSV[User Historical CSVs]
        SAMPLE[Bundled Curated Datasets]
    end

    subgraph Ingestion & Validation
        CLIENT[FIRMS Client]
        ADAPTER[CSV Ingestion Adapter]
        VAL[Data Validation Engine]
        QUAL[Quality Reporting]
    end

    subgraph Scientific Processing Pipeline
        NORM[Canonical Normalizer\nStandardized Schema + UTC Timestamps]
        GRID[Spatial Harmonization Engine\nNominal 1km Projected Grid Aggregation]
        COLOC[Cross-Sensor Co-Location Detector\nConfigurable Spatiotemporal Proximity]
        CONF[Confidence Harmonizer\nExplicit Sensor-Specific Categorization]
    end

    subgraph Analytics Engine
        METRICS[Core Metrics & Sensor Shares]
        BASE[Historical Baseline Calculator\nMonthly Median & IQR]
        ANOM[Robust Anomaly Detector\nMAD & Deviation Classifiers]
        SEAS[Seasonal Climatology & Trends]
    end

    subgraph API Layer (FastAPI)
        API_DATA[/api/data/*]
        API_ANALYSIS[/api/analysis/*]
        API_EXPORT[/api/export/*]
    end

    subgraph Frontend (React + Vite + Tailwind + Leaflet)
        MAP[Leaflet Interactive Map\nSensor hot spots & 1km Grids]
        CHARTS[Recharts Analytical Visualizations]
        DASH[Scientific Exploration & Control Panels]
        EXPORT[Data & GeoJSON Export UI]
    end

    FIRMS --> CLIENT
    CSV --> ADAPTER
    SAMPLE --> ADAPTER
    CLIENT --> VAL
    ADAPTER --> VAL
    VAL --> QUAL
    VAL --> NORM
    NORM --> GRID
    NORM --> COLOC
    NORM --> CONF
    GRID --> METRICS
    COLOC --> METRICS
    CONF --> METRICS
    GRID --> BASE
    BASE --> ANOM
    GRID --> SEAS
    METRICS --> API_ANALYSIS
    ANOM --> API_ANALYSIS
    SEAS --> API_ANALYSIS
    QUAL --> API_DATA
    API_DATA --> FRONTEND
    API_ANALYSIS --> FRONTEND
    API_EXPORT --> EXPORT
```

## Core Modules and Responsibilities

1. **`app.core.config`**:
   Environment settings, FIRMS API key management, path resolutions, and default spatial/temporal parameters.

2. **`app.services.firms_client`**:
   Direct REST client for NASA FIRMS API (`/api/area/csv/`, `/api/data_availability/`), including error handling (403, 429, timeouts), parameter serialization, and streaming CSV parser.

3. **`app.services.ingestion`**:
   Multi-format CSV parser capable of recognizing MODIS C6.1 (standard & NRT) and VIIRS (SNPP, NOAA-20, NOAA-21) schemas.

4. **`app.services.validation`**:
   Rigorous data validation checks for spatial coordinate boundaries, datetime validation, FRP plausibility, and duplicate detection. Generates an auditable Data Quality Summary.

5. **`app.services.normalization`**:
   Projects incoming raw records into a standardized canonical observation model (`observation_id`, `latitude`, `longitude`, `acquisition_datetime_utc`, `sensor_family`, `satellite`, `confidence_class`, `frp`, etc.) preserving raw sensor attributes.

6. **`app.services.harmonization`**:
   - Assigns observations to an equal-area common spatial grid (~1 km) using localized or universal projections.
   - Computes dual-sensor metrics (MODIS detections vs. VIIRS detections per cell and temporal bucket).
   - Identifies spatio-temporal co-locations within a specified spatial buffer (default 1000m) and temporal window (default ±60 min) to highlight simultaneous detections without loss of raw records.

7. **`app.services.analytics`**:
   - Calculates historical baselines (monthly median, mean, standard deviation, interquartile range).
   - Computes robust Median Absolute Deviation (MAD) anomaly scores to classify activity (Within Expected Range, Above Baseline, Significantly Above Baseline, Below Baseline, Insufficient Baseline).
   - Computes seasonal climatology and multi-year rolling trendlines.

8. **`app.services.export_service`**:
   Exports filtered observations, common-grid summaries, temporal aggregates, and GeoJSON spatial structures.
