"""Canonical normalization service for FireSignal.

Maps disparate MODIS and VIIRS records to a unified canonical schema while
preserving source characteristics and raw attributes.
"""
import uuid
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.canonical import ObservationRecord


class DataNormalizer:
    """Transforms validated raw records into canonical ObservationRecord instances."""

    @staticmethod
    def _parse_confidence(conf_raw: Any, sensor_family: str) -> str:
        """
        Map sensor-specific confidence values to canonical classes.
        
        Important scientific principle:
        MODIS outputs 0-100% confidence.
        VIIRS 375m algorithm outputs categorical: 'low', 'nominal', 'high'.
        We map into explicit classes ('low', 'nominal', 'high') without pretending
        that 80% MODIS is physically identical to VIIRS High.
        """
        if conf_raw is None:
            return "nominal"

        s_val = str(conf_raw).strip().lower()
        if not s_val:
            return "nominal"

        if sensor_family == "VIIRS":
            if s_val in ["l", "low"]:
                return "low"
            elif s_val in ["n", "nominal"]:
                return "nominal"
            elif s_val in ["h", "high"]:
                return "high"
            return "nominal"
        else:
            # MODIS numeric confidence (0-100) or occasionally 'l', 'n', 'h'
            if s_val in ["l", "low"]:
                return "low"
            elif s_val in ["n", "nominal"]:
                return "nominal"
            elif s_val in ["h", "high"]:
                return "high"
            
            try:
                numeric_val = float(s_val)
                if numeric_val < 30.0:
                    return "low"
                elif numeric_val < 80.0:
                    return "nominal"
                else:
                    return "high"
            except (ValueError, TypeError):
                return "nominal"

    @staticmethod
    def _parse_float(val: Any) -> Optional[float]:
        if val is None or str(val).strip() == "":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _normalize_satellite(sat_raw: Any, sensor_family: str) -> str:
        if not sat_raw:
            return "Terra" if sensor_family == "MODIS" else "Suomi-NPP"
        s = str(sat_raw).strip().upper()
        if s in ["T", "TERRA"]:
            return "Terra"
        elif s in ["A", "AQUA"]:
            return "Aqua"
        elif s in ["N", "NPP", "SNPP", "SUOMI-NPP"]:
            return "Suomi-NPP"
        elif s in ["1", "JPSS1", "NOAA20", "NOAA-20", "N20"]:
            return "NOAA-20"
        elif s in ["2", "JPSS2", "NOAA21", "NOAA-21", "N21"]:
            return "NOAA-21"
        return str(sat_raw).strip()

    @classmethod
    def normalize_records(
        cls,
        valid_records: List[Dict[str, Any]],
        source_file: str,
        product: str,
        processing_type: str = "NRT"
    ) -> List[ObservationRecord]:
        """
        Normalize validated raw records into canonical ObservationRecord models.
        """
        canonical_records: List[ObservationRecord] = []

        for row in valid_records:
            lat = row['_parsed_lat']
            lon = row['_parsed_lon']
            date_str = row['_parsed_date']
            time_str = row['_parsed_time']
            frp = row['_parsed_frp']
            sensor_fam = row.get('_sensor_family', 'MODIS')
            
            # Format acquisition datetime UTC
            hour = int(time_str[:2])
            minute = int(time_str[2:4])
            dt_iso = f"{date_str}T{hour:02d}:{minute:02d}:00Z"

            # Derive satellite
            raw_sat = row.get('satellite')
            satellite = cls._normalize_satellite(raw_sat, sensor_fam)
            instrument = "VIIRS" if sensor_fam == "VIIRS" else "MODIS"

            # Primary and secondary brightness temperature mapping
            # VIIRS uses bright_ti4 (375m) and bright_ti5
            # MODIS uses brightness / bright_t21 (1km) and bright_t31
            bright_prim = cls._parse_float(
                row.get('bright_ti4') or row.get('brightness') or row.get('bright_t21')
            )
            bright_sec = cls._parse_float(
                row.get('bright_ti5') or row.get('bright_t31')
            )

            # Confidence handling
            conf_raw = row.get('confidence')
            conf_class = cls._parse_confidence(conf_raw, sensor_fam)

            # Scan and track
            scan_val = cls._parse_float(row.get('scan'))
            track_val = cls._parse_float(row.get('track'))

            # Day / Night
            raw_dn = str(row.get('daynight') or row.get('day_night') or 'D').strip().upper()
            day_night = 'N' if raw_dn.startswith('N') else 'D'

            # Generate unique deterministic observation ID
            hash_input = f"{sensor_fam}_{satellite}_{lat:.5f}_{lon:.5f}_{date_str}_{time_str}"
            obs_id = hashlib.md5(hash_input.encode('utf-8')).hexdigest()[:16]

            # Collect unmapped original attributes to preserve full provenance
            exclude_keys = {
                '_parsed_lat', '_parsed_lon', '_parsed_date', '_parsed_time',
                '_parsed_frp', '_sensor_family'
            }
            orig_attrs = {k: v for k, v in row.items() if k not in exclude_keys}

            obs = ObservationRecord(
                observation_id=obs_id,
                latitude=lat,
                longitude=lon,
                acquisition_datetime_utc=dt_iso,
                acquisition_date=date_str,
                acquisition_time=time_str,
                sensor_family=sensor_fam,
                satellite=satellite,
                instrument=instrument,
                product=product,
                processing_type=processing_type,
                confidence_raw=str(conf_raw) if conf_raw is not None else None,
                confidence_class=conf_class,
                brightness_temperature_primary=bright_prim,
                brightness_temperature_secondary=bright_sec,
                frp=frp,
                scan=scan_val,
                track=track_val,
                day_night=day_night,
                source_version=str(row.get('version', '')),
                source_file=source_file,
                original_attributes=orig_attrs
            )
            canonical_records.append(obs)

        return canonical_records
