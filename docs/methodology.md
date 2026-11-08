# Scientific Harmonization & Anomaly Methodology

## 1. Problem Statement
NASA's Earth-observing satellite constellation provides two primary active fire and thermal anomaly product families:
1. **MODIS** (Moderate Resolution Imaging Spectroradiometer) on Terra and Aqua (~1 km nominal resolution).
2. **VIIRS** (Visible Infrared Imaging Radiometer Suite) on Suomi-NPP, NOAA-20, and NOAA-21 (375 m nominal resolution).

Blindly concatenating observations from these two instrument suites produces severe biases. VIIRS's finer spatial footprint (~8x smaller area per pixel) detects smaller, cooler, and fragmented fires that fall below MODIS detection limits. Furthermore, MODIS measures detection confidence as a numeric percentage (0–100%), whereas VIIRS outputs categorical confidence classes (`low`, `nominal`, `high`).

FireSignal harmonizes these disparate feeds using an explainable, sensor-aware methodology that never discards physical sensor provenance.

---

## 2. Canonical Data Normalization
Every incoming record (whether from NASA FIRMS API, uploaded archive CSV, or sample benchmark datasets) is parsed into a canonical schema:
- `observation_id`: Deterministic hash of sensor, platform, coordinates, and timestamp.
- `latitude`, `longitude`: WGS84 decimal degrees.
- `acquisition_datetime_utc`: ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:MM:00Z`).
- `sensor_family`: Explicitly retained as `MODIS` or `VIIRS`.
- `instrument` & `satellite`: `MODIS (Terra/Aqua)` or `VIIRS (Suomi-NPP/NOAA-20/NOAA-21)`.
- `confidence_class`: Normalized to `low`, `nominal`, or `high` while preserving raw confidence values.
- `brightness_temperature_primary`: 4 µm channel (MODIS Band 21/22 or VIIRS I-4) in Kelvin.
- `brightness_temperature_secondary`: 11 µm channel (MODIS Band 31 or VIIRS I-5) in Kelvin.
- `frp`: Fire Radiative Power (MW).
- `original_attributes`: Full dictionary of raw unmapped source columns retained to prevent data loss.

---

## 3. Spatial Common-Grid Harmonization
To compare fire density across sensor platforms without distorting area representations:
1. Coordinates are projected into a local equal-area or conformal projected Coordinate Reference System (Universal Transverse Mercator - UTM) derived automatically from the AOI's geographic centroid:
   $$\text{Zone} = \left\lfloor \frac{\text{Longitude} + 180}{6} \right\rfloor + 1$$
   $$\text{EPSG} = 32600 + \text{Zone (Northern Hemisphere)} \quad \text{or} \quad 32700 + \text{Zone (Southern)}$$
2. Projected meter space is divided into configurable equal-area square cells (nominal $\Delta x = \Delta y = 1.0\text{ km}$).
3. Detections are assigned to grid cells using spatial bucketing:
   $$\text{Cell}_x = \left\lfloor \frac{x}{\Delta x} \right\rfloor, \quad \text{Cell}_y = \left\lfloor \frac{y}{\Delta y} \right\rfloor$$
4. Each cell retains separate MODIS counts, VIIRS counts, combined counts, and FRP statistics.

---

## 4. Spatiotemporal Co-location Identification
When satellites from both suites observe the same fire ground within overlapping overpass windows:
- Observations within a configurable spatial distance threshold ($D \le 1000\text{ m}$) and temporal window ($\Delta t \le \pm 60\text{ min}$) are flagged as `is_colocated = True` and assigned a `colocation_group_id`.
- **Scientific Rule:** Detections are flagged, **never deleted**. Dual-satellite detection represents valuable multi-angle radiometric confirmation, not redundant data.

---

## 5. Statistical Anomaly Detection (MAD)
Because wildland fire distributions are heavily right-skewed and zero-inflated, conventional Gaussian mean/standard-deviation metrics are heavily distorted by extreme fire years.

FireSignal calculates a robust anomaly score based on the **Median Absolute Deviation (MAD)**:
$$\text{Median}_{\text{hist}} = \text{median}(X_{\text{hist}})$$
$$\text{MAD} = \text{median}\left(\left| X_i - \text{Median}_{\text{hist}} \right|\right)$$
$$\text{Anomaly Score} = \frac{X_{\text{current}} - \text{Median}_{\text{hist}}}{1.4826 \times \text{MAD}}$$

Where $1.4826$ is the standard normal scaling factor.

### Classification Categories:
- **Score > 3.0:** Significantly Above Baseline
- **1.5 < Score $\le$ 3.0:** Above Baseline
- **-1.5 $\le$ Score $\le$ 1.5:** Within Expected Range
- **Score < -1.5:** Below Baseline
- **Fewer than 2 Historical Years:** Insufficient Baseline
