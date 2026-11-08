"""Data Export Service for FireSignal.

Generates CSV and GeoJSON exports for observations, common-grid aggregations,
temporal summaries, and analytical anomaly reports.
"""
import io
import csv
import json
from typing import List, Dict, Any, Optional
from app.models.canonical import ObservationRecord
from app.schemas.responses import GridCellFeature, TimeSeriesPoint, BaselineMonthComparison, SummaryMetrics


class ExportService:
    """Formats and exports analytical datasets."""

    @staticmethod
    def export_observations_csv(records: List[ObservationRecord]) -> str:
        """Export canonical observations to CSV string."""
        output = io.StringIO()
        fieldnames = [
            "observation_id", "latitude", "longitude", "acquisition_datetime_utc",
            "acquisition_date", "acquisition_time", "sensor_family", "satellite",
            "instrument", "product", "processing_type", "confidence_class",
            "confidence_raw", "brightness_temperature_primary",
            "brightness_temperature_secondary", "frp", "scan", "track",
            "day_night", "grid_cell_id", "is_colocated", "colocation_group_id",
            "source_file"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            writer.writerow(r.model_dump())
        return output.getvalue()

    @staticmethod
    def export_grid_csv(grid_cells: List[GridCellFeature]) -> str:
        """Export harmonized spatial grid summary to CSV."""
        output = io.StringIO()
        fieldnames = [
            "grid_cell_id", "center_lat", "center_lon", "total_detections",
            "modis_detections", "viirs_detections", "total_frp", "mean_frp",
            "dominant_sensor"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for c in grid_cells:
            writer.writerow(c.model_dump())
        return output.getvalue()

    @staticmethod
    def export_grid_geojson(grid_cells: List[GridCellFeature]) -> Dict[str, Any]:
        """Export harmonized spatial grid cells as standard GeoJSON FeatureCollection."""
        features = []
        for c in grid_cells:
            # bounds is list of [lon, lat] closed polygon
            feat = {
                "type": "Feature",
                "id": c.grid_cell_id,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [c.bounds]
                },
                "properties": {
                    "grid_cell_id": c.grid_cell_id,
                    "center_lat": c.center_lat,
                    "center_lon": c.center_lon,
                    "total_detections": c.total_detections,
                    "modis_detections": c.modis_detections,
                    "viirs_detections": c.viirs_detections,
                    "total_frp": c.total_frp,
                    "mean_frp": c.mean_frp,
                    "dominant_sensor": c.dominant_sensor
                }
            }
            features.append(feat)

        return {
            "type": "FeatureCollection",
            "features": features
        }

    @staticmethod
    def export_timeseries_csv(timeseries: List[TimeSeriesPoint]) -> str:
        """Export temporal aggregated time-series to CSV."""
        output = io.StringIO()
        fieldnames = [
            "period", "combined_count", "modis_count", "viirs_count",
            "active_cells", "mean_frp", "max_frp", "day_count", "night_count"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for p in timeseries:
            writer.writerow(p.model_dump())
        return output.getvalue()

    @staticmethod
    def export_anomalies_csv(comparisons: List[BaselineMonthComparison]) -> str:
        """Export historical baseline comparisons and anomaly classifications to CSV."""
        output = io.StringIO()
        fieldnames = [
            "month", "month_name", "current_count", "historical_median",
            "historical_mean", "historical_std", "historical_iqr",
            "historical_mad", "historical_years_count", "anomaly_score",
            "status", "explanation"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for c in comparisons:
            writer.writerow(c.model_dump())
        return output.getvalue()
