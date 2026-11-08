# NASA Earth Science Data Sources & Ingestion Guide

## 1. Primary Data Source: NASA FIRMS
FireSignal integrates data from NASA's **Fire Information for Resource Management System (FIRMS)**, part of NASA's Earth Observing System Data and Information System (EOSDIS) Land, Atmosphere Near real-time Capability for EOS (LANCE).

Official Resources:
- FIRMS Home: [https://firms.modaps.eosdis.nasa.gov/](https://firms.modaps.eosdis.nasa.gov/)
- FIRMS REST API: [https://firms.modaps.eosdis.nasa.gov/api/](https://firms.modaps.eosdis.nasa.gov/api/)
- Free MAP_KEY Registration: [https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)
- NASA Worldview: [https://worldview.earthdata.nasa.gov/](https://worldview.earthdata.nasa.gov/)

---

## 2. Supported Sensor Products

### A. MODIS (Terra & Aqua)
- **`MODIS_NRT`**: Near Real-Time active fire detections from Terra (AM) and Aqua (PM).
- **`MODIS_SP`**: Standard science-quality processing with full calibration.
- **Resolution:** ~1 km at nadir.
- **Key Columns:** `latitude`, `longitude`, `brightness` (4 µm brightness temp, K), `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `instrument`, `confidence` (0-100%), `version`, `bright_t31` (11 µm brightness temp, K), `frp` (MW), `daynight`.

### B. VIIRS 375 m (Suomi-NPP, NOAA-20, NOAA-21)
- **`VIIRS_SNPP_NRT`**: Suomi National Polar-orbiting Partnership 375 m NRT.
- **`VIIRS_NOAA20_NRT`**: NOAA-20 (JPSS-1) 375 m active fire NRT.
- **`VIIRS_NOAA21_NRT`**: NOAA-21 (JPSS-2) 375 m active fire NRT.
- **Resolution:** 375 m nominal at nadir.
- **Key Columns:** `latitude`, `longitude`, `bright_ti4` (I-4 channel 375m, K), `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `instrument`, `confidence` (`low`, `nominal`, `high`), `version`, `bright_ti5` (I-5 channel, K), `frp` (MW), `daynight`.

---

## 3. Ingestion Modes
FireSignal supports three ingestion paths:
1. **NASA FIRMS REST API**: Real-time HTTP GET to `/api/area/csv/[MAP_KEY]/[SOURCE]/[BBOX]/[DAYS]` with rate-limiting backoff and automated retry.
2. **User CSV Upload**: Manual drag-and-drop of historical archive or NRT CSV downloads obtained from FIRMS Download.
3. **Bundled Benchmark Dataset**: Multi-year (2021-2024) realistic benchmark covering Karnataka and the Western Ghats for instant offline and test exploration.
