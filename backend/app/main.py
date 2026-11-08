"""Main entry point for FireSignal FastAPI backend."""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.endpoints import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("firesignal")

app = FastAPI(
    title="FireSignal API",
    description=(
        "Unified MODIS–VIIRS Fire Activity Intelligence Platform. "
        "Provides transparent sensor harmonization, spatial-temporal aggregation, "
        "historical baseline comparison, and robust anomaly detection."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred during data processing.",
            "error_type": "internal_error"
        }
    )

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "One view of fire activity. Across sensors. Across time.",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": f"{settings.API_V1_PREFIX}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
