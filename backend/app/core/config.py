"""Application configuration for FireSignal backend."""
import os
from pathlib import Path
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")


class Settings(BaseModel):
    APP_NAME: str = "FireSignal"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # NASA FIRMS API configuration
    FIRMS_MAP_KEY: str = os.getenv("FIRMS_MAP_KEY", "")
    FIRMS_BASE_URL: str = "https://firms.modaps.eosdis.nasa.gov"
    
    # Server configuration
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Directory paths
    DATA_RAW_DIR: Path = BASE_DIR / "data" / "raw" if (BASE_DIR / "data").exists() else BASE_DIR.parent / "data" / "raw"
    DATA_PROCESSED_DIR: Path = BASE_DIR / "data" / "processed" if (BASE_DIR / "data").exists() else BASE_DIR.parent / "data" / "processed"
    DATA_SAMPLE_DIR: Path = BASE_DIR / "data" / "sample" if (BASE_DIR / "data").exists() else BASE_DIR.parent / "data" / "sample"
    DATA_BOUNDARIES_DIR: Path = BASE_DIR / "data" / "boundaries" if (BASE_DIR / "data").exists() else BASE_DIR.parent / "data" / "boundaries"
    
    # Harmonization defaults
    DEFAULT_GRID_SIZE_KM: float = 1.0
    DEFAULT_COLOCATION_DISTANCE_METERS: float = 1000.0
    DEFAULT_COLOCATION_TIME_WINDOW_MINUTES: int = 60
    
    # Predefined regions (GeoJSON bounding boxes: [min_lon, min_lat, max_lon, max_lat])
    PREDEFINED_REGIONS: dict = {
        "karnataka": {
            "name": "Karnataka, India",
            "bbox": [74.05, 11.59, 78.58, 18.45],
            "center": [15.0, 76.0],
            "zoom": 7,
            "crs_epsg": 32643  # UTM zone 43N
        },
        "western_ghats": {
            "name": "Western Ghats, India",
            "bbox": [73.0, 8.0, 77.5, 21.0],
            "center": [14.0, 75.0],
            "zoom": 6,
            "crs_epsg": 32643
        },
        "india_central": {
            "name": "Central India (Madhya Pradesh / Chhattisgarh)",
            "bbox": [74.0, 17.5, 84.5, 26.5],
            "center": [22.0, 79.0],
            "zoom": 6,
            "crs_epsg": 32644  # UTM zone 44N
        },
        "california": {
            "name": "California, USA",
            "bbox": [-124.4, 32.5, -114.1, 42.0],
            "center": [37.0, -119.5],
            "zoom": 6,
            "crs_epsg": 3310  # California Albers
        }
    }


settings = Settings()

# Ensure directories exist
for path in [settings.DATA_RAW_DIR, settings.DATA_PROCESSED_DIR, settings.DATA_SAMPLE_DIR, settings.DATA_BOUNDARIES_DIR]:
    path.mkdir(parents=True, exist_ok=True)
