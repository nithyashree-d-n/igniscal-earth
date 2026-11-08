"""Sensor-Aware Harmonization Engine for FireSignal.

Implements equal-area spatial grid aggregation, temporal binning,
cross-sensor co-location detection, and sensor-preserving analytics.
"""
import math
import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
import numpy as np
from pyproj import Transformer
from app.models.canonical import ObservationRecord, HarmonizationConfig
from app.schemas.responses import GridCellFeature, TimeSeriesPoint

logger = logging.getLogger("firesignal.harmonization")


def get_utm_epsg(lon: float, lat: float) -> int:
    """Calculate the appropriate UTM EPSG code for a given WGS84 coordinate."""
    zone = int((lon + 180) / 6) + 1
    if lat >= 0:
        return 32600 + zone
    else:
        return 32700 + zone


class HarmonizationEngine:
    """Orchestrates spatial, temporal, and sensor harmonization."""

    def __init__(self, config: Optional[HarmonizationConfig] = None):
        self.config = config or HarmonizationConfig()
        self.grid_size_m = self.config.grid_size_km * 1000.0

    def get_projection_transformers(
        self,
        center_lon: float,
        center_lat: float,
        explicit_epsg: Optional[int] = None
    ) -> Tuple[Transformer, Transformer, int]:
        """Obtain forward and reverse coordinate transformers for local projection."""
        epsg = explicit_epsg or self.config.crs_epsg or get_utm_epsg(center_lon, center_lat)
        forward_transformer = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)
        reverse_transformer = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
        return forward_transformer, reverse_transformer, epsg

    def filter_by_confidence(
        self,
        records: List[ObservationRecord]
    ) -> List[ObservationRecord]:
        """Apply sensor-specific confidence filters without homogenizing them."""
        filtered = []
        modis_filter = set(self.config.confidence_filter_modis or ["low", "nominal", "high"])
        viirs_filter = set(self.config.confidence_filter_viirs or ["low", "nominal", "high"])

        for r in records:
            if r.sensor_family == "MODIS":
                if r.confidence_class in modis_filter:
                    filtered.append(r)
            elif r.sensor_family == "VIIRS":
                if r.confidence_class in viirs_filter:
                    filtered.append(r)
            else:
                filtered.append(r)
        return filtered

    def detect_colocations(
        self,
        records: List[ObservationRecord],
        forward_transformer: Transformer
    ) -> Tuple[List[ObservationRecord], int]:
        """
        Identify potential cross-sensor and same-day co-located observations.
        
        Two satellite observations are flagged as potential co-locations if:
        1. Their projected spatial distance is within `colocation_distance_meters` (default 1000m).
        2. Their acquisition timestamps are within `colocation_time_window_minutes` (default 60m).
        
        CRITICAL SCIENTIFIC PRINCIPLE:
        Observations are flagged, NEVER silently deleted. Multiple sensors viewing
        the same active front provide multi-angle validation, not data errors.
        """
        if not records:
            return records, 0

        dist_threshold_sq = self.config.colocation_distance_meters ** 2
        time_thresh_sec = self.config.colocation_time_window_minutes * 60

        # Project coordinates and parse timestamps
        coords = []
        dts = []
        for r in records:
            x, y = forward_transformer.transform(r.longitude, r.latitude)
            r.grid_x = x
            r.grid_y = y
            coords.append((x, y))
            try:
                dt = datetime.fromisoformat(r.acquisition_datetime_utc.replace("Z", "+00:00"))
            except ValueError:
                dt = datetime.strptime(r.acquisition_date, "%Y-%m-%d")
            dts.append(dt)

        n = len(records)
        colocation_group_map: Dict[int, str] = {}
        group_counter = 0

        # Efficient spatial-temporal proximity search
        for i in range(n):
            for j in range(i + 1, n):
                # Time window check
                dt_diff = abs((dts[i] - dts[j]).total_seconds())
                if dt_diff > time_thresh_sec:
                    continue

                # Projected distance check (in meters)
                dx = coords[i][0] - coords[j][0]
                dy = coords[i][1] - coords[j][1]
                dist_sq = dx * dx + dy * dy
                if dist_sq <= dist_threshold_sq:
                    # Assign group id
                    if i in colocation_group_map and j in colocation_group_map:
                        pass
                    elif i in colocation_group_map:
                        colocation_group_map[j] = colocation_group_map[i]
                    elif j in colocation_group_map:
                        colocation_group_map[i] = colocation_group_map[j]
                    else:
                        group_counter += 1
                        gid = f"COLOC_{group_counter:04d}"
                        colocation_group_map[i] = gid
                        colocation_group_map[j] = gid

        # Apply flags to records
        colocated_count = 0
        for idx, r in enumerate(records):
            if idx in colocation_group_map:
                r.is_colocated = True
                r.colocation_group_id = colocation_group_map[idx]
                colocated_count += 1
            else:
                r.is_colocated = False
                r.colocation_group_id = None

        return records, group_counter

    def assign_spatial_grid(
        self,
        records: List[ObservationRecord],
        forward_transformer: Transformer,
        reverse_transformer: Transformer
    ) -> Tuple[List[ObservationRecord], List[GridCellFeature]]:
        """
        Assign each observation to a common projected grid cell (~1 km).
        Calculates separate MODIS vs VIIRS counts and FRP statistics per cell.
        """
        if not records:
            return records, []

        cell_buckets: Dict[str, Dict[str, Any]] = {}

        for r in records:
            x = r.grid_x
            y = r.grid_y
            if x is None or y is None:
                x, y = forward_transformer.transform(r.longitude, r.latitude)
                r.grid_x = x
                r.grid_y = y

            cell_x_idx = int(math.floor(x / self.grid_size_m))
            cell_y_idx = int(math.floor(y / self.grid_size_m))
            cell_id = f"G_{cell_x_idx}_{cell_y_idx}"
            r.grid_cell_id = cell_id

            if cell_id not in cell_buckets:
                # Cell bounds in projected space
                min_x = cell_x_idx * self.grid_size_m
                max_x = min_x + self.grid_size_m
                min_y = cell_y_idx * self.grid_size_m
                max_y = min_y + self.grid_size_m

                # Reproject corners back to WGS84 for GeoJSON mapping
                c1_lon, c1_lat = reverse_transformer.transform(min_x, min_y)
                c2_lon, c2_lat = reverse_transformer.transform(max_x, min_y)
                c3_lon, c3_lat = reverse_transformer.transform(max_x, max_y)
                c4_lon, c4_lat = reverse_transformer.transform(min_x, max_y)
                center_lon, center_lat = reverse_transformer.transform(
                    (min_x + max_x) / 2.0, (min_y + max_y) / 2.0
                )

                cell_buckets[cell_id] = {
                    "grid_cell_id": cell_id,
                    "center_lat": round(center_lat, 5),
                    "center_lon": round(center_lon, 5),
                    "bounds": [
                        [round(c1_lon, 5), round(c1_lat, 5)],
                        [round(c2_lon, 5), round(c2_lat, 5)],
                        [round(c3_lon, 5), round(c3_lat, 5)],
                        [round(c4_lon, 5), round(c4_lat, 5)],
                        [round(c1_lon, 5), round(c1_lat, 5)]  # Closed polygon
                    ],
                    "total_detections": 0,
                    "modis_detections": 0,
                    "viirs_detections": 0,
                    "frp_values": []
                }

            b = cell_buckets[cell_id]
            b["total_detections"] += 1
            if r.sensor_family == "MODIS":
                b["modis_detections"] += 1
            else:
                b["viirs_detections"] += 1

            if r.frp is not None:
                b["frp_values"].append(r.frp)

        grid_features: List[GridCellFeature] = []
        for cell_id, data in cell_buckets.items():
            frps = data["frp_values"]
            total_frp = round(float(sum(frps)), 2) if frps else None
            mean_frp = round(float(np.mean(frps)), 2) if frps else None
            
            dominant = "MODIS" if data["modis_detections"] > data["viirs_detections"] else (
                "VIIRS" if data["viirs_detections"] > data["modis_detections"] else "DUAL"
            )

            feat = GridCellFeature(
                grid_cell_id=cell_id,
                center_lat=data["center_lat"],
                center_lon=data["center_lon"],
                bounds=data["bounds"],
                total_detections=data["total_detections"],
                modis_detections=data["modis_detections"],
                viirs_detections=data["viirs_detections"],
                total_frp=total_frp,
                mean_frp=mean_frp,
                dominant_sensor=dominant
            )
            grid_features.append(feat)

        return records, grid_features

    def aggregate_temporal(
        self,
        records: List[ObservationRecord]
    ) -> List[TimeSeriesPoint]:
        """
        Aggregate observations into specified temporal buckets (daily, weekly, monthly, yearly).
        """
        if not records:
            return []

        buckets: Dict[str, Dict[str, Any]] = {}
        agg_type = self.config.time_aggregation.lower()

        for r in records:
            date_str = r.acquisition_date
            dt = datetime.strptime(date_str, "%Y-%m-%d")

            if agg_type == "weekly":
                # Year-Wxx format
                period_key = f"{dt.year}-W{dt.isocalendar()[1]:02d}"
            elif agg_type == "monthly":
                period_key = f"{dt.year}-{dt.month:02d}"
            elif agg_type == "yearly":
                period_key = str(dt.year)
            else:  # default daily
                period_key = date_str

            if period_key not in buckets:
                buckets[period_key] = {
                    "period": period_key,
                    "modis_count": 0,
                    "viirs_count": 0,
                    "combined_count": 0,
                    "active_cells": set(),
                    "frp_list": [],
                    "day_count": 0,
                    "night_count": 0
                }

            b = buckets[period_key]
            b["combined_count"] += 1
            if r.sensor_family == "MODIS":
                b["modis_count"] += 1
            else:
                b["viirs_count"] += 1

            if r.grid_cell_id:
                b["active_cells"].add(r.grid_cell_id)

            if r.frp is not None:
                b["frp_list"].append(r.frp)

            if r.day_night == "N":
                b["night_count"] += 1
            else:
                b["day_count"] += 1

        points: List[TimeSeriesPoint] = []
        for key in sorted(buckets.keys()):
            b = buckets[key]
            frps = b["frp_list"]
            mean_frp = round(float(np.mean(frps)), 2) if frps else None
            max_frp = round(float(max(frps)), 2) if frps else None

            p = TimeSeriesPoint(
                period=key,
                modis_count=b["modis_count"],
                viirs_count=b["viirs_count"],
                combined_count=b["combined_count"],
                active_cells=len(b["active_cells"]),
                mean_frp=mean_frp,
                max_frp=max_frp,
                day_count=b["day_count"],
                night_count=b["night_count"]
            )
            points.append(p)

        return points

    def harmonize(
        self,
        records: List[ObservationRecord],
        explicit_epsg: Optional[int] = None
    ) -> Tuple[List[ObservationRecord], List[GridCellFeature], List[TimeSeriesPoint], int]:
        """
        Execute full harmonization workflow:
        Confidence filtering -> Local projection -> Co-location detection ->
        Common-grid spatial binning -> Temporal aggregation.
        """
        if not records:
            return [], [], [], 0

        # 1. Filter by sensor confidence
        filtered = self.filter_by_confidence(records)
        if not filtered:
            return [], [], [], 0

        # 2. Derive geographic center for CRS projection
        lats = [r.latitude for r in filtered]
        lons = [r.longitude for r in filtered]
        center_lat = float(np.mean(lats))
        center_lon = float(np.mean(lons))

        forward_trans, reverse_trans, epsg = self.get_projection_transformers(
            center_lon, center_lat, explicit_epsg
        )

        # 3. Detect co-locations
        harmonized_records, colocation_groups = self.detect_colocations(filtered, forward_trans)

        # 4. Assign spatial grid (~1 km)
        harmonized_records, grid_features = self.assign_spatial_grid(
            harmonized_records, forward_trans, reverse_trans
        )

        # 5. Aggregate temporally
        timeseries = self.aggregate_temporal(harmonized_records)

        return harmonized_records, grid_features, timeseries, colocation_groups
