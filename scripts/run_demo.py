"""Demo runner script for FireSignal.

Starts both the FastAPI backend and provides instructions for the frontend.
"""
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

print("=" * 65)
print("FIRESIGNAL — UNIFIED MODIS-VIIRS FIRE INTELLIGENCE PLATFORM")
print("=" * 65)
print("Starting FireSignal Backend on http://127.0.0.1:8000...")
print("To start the frontend, open a separate terminal and run:")
print("  cd frontend")
print("  npm run dev")
print("=" * 65)

try:
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(BASE_DIR / "backend"),
        check=True
    )
except KeyboardInterrupt:
    print("\nShutting down FireSignal.")
