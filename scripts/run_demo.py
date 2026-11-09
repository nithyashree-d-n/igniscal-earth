"""Demo runner script for FireSignal.

Starts the FireSignal FastAPI server and serves both the API and the
built frontend application directly at http://127.0.0.1:8000.
"""
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

print("=" * 70)
print("  FIRESIGNAL — UNIFIED MODIS-VIIRS FIRE INTELLIGENCE PLATFORM")
print("  One view of fire activity. Across sensors. Across time.")
print("=" * 70)

# Check if frontend is built
frontend_dist = BASE_DIR / "frontend" / "dist"
if not frontend_dist.exists():
    print("Frontend build not found. Building frontend production bundle...")
    try:
        subprocess.run(["npm", "run", "build"], cwd=str(BASE_DIR / "frontend"), check=True, shell=True)
        print("Frontend production bundle built successfully!")
    except Exception as e:
        print(f"Notice: Failed to auto-build frontend ({e}).")
        print("You can build it manually by running 'npm run build' in the frontend folder.")

print("\nStarting FireSignal Server on http://127.0.0.1:8000...")
print("• Web Application UI: http://127.0.0.1:8000/")
print("• Interactive API Docs: http://127.0.0.1:8000/docs")
print("• Backend Health Endpoint: http://127.0.0.1:8000/api/health")
print("\nFor active frontend development with Hot-Module-Reloading:")
print("  cd frontend && npm run dev (http://localhost:5173)")
print("=" * 70)
print("Press CTRL+C to stop the server.\n")

try:
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(BASE_DIR / "backend"),
        check=True
    )
except KeyboardInterrupt:
    print("\nShutting down FireSignal.")
