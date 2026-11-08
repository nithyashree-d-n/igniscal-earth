"""Data validation and quality assessment service for FireSignal."""
import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from app.models.canonical import DataQualitySummary

logger = logging.getLogger("firesignal.validation")


class DataValidator:
    """Validates raw sensor records and produces an auditable DataQualitySummary."""

    @staticmethod
    def validate_records(
        raw_records: List[Dict[str, Any]],
        dataset_id: str,
        source_name: str,
        product_name: str,
        aoi_bbox: Optional[List[float]] = None
    ) -> Tuple[List[Dict[str, Any]], DataQualitySummary]:
        """
        Validate incoming raw observation records.
        
        Args:
            raw_records: List of dictionaries parsed from CSV or API response.
            dataset_id: Identifier for this dataset batch.
            source_name: Source descriptor (e.g. 'NASA FIRMS NRT', 'Uploaded CSV').
            product_name: Specific product descriptor (e.g. 'MODIS_C6_1', 'VIIRS_375M').
            aoi_bbox: Optional bounding box [min_lon, min_lat, max_lon, max_lat] to filter.
            
        Returns:
            Tuple of (valid_records, DataQualitySummary)
        """
        valid_records: List[Dict[str, Any]] = []
        seen_keys = set()
        
        rejection_reasons: Dict[str, int] = {
            "missing_coordinates": 0,
            "invalid_coordinate_range": 0,
            "invalid_date_or_time": 0,
            "duplicate_record": 0,
            "outside_aoi": 0,
            "invalid_frp": 0
        }
        
        warning_messages: List[str] = []
        modis_count = 0
        viirs_count = 0
        missing_frp_count = 0
        missing_confidence_count = 0
        
        min_lon = float('inf')
        max_lon = float('-inf')
        min_lat = float('inf')
        max_lat = float('-inf')
        dates = []

        total_raw = len(raw_records)
        
        if total_raw == 0:
            warning_messages.append("Dataset contains 0 observation records.")
            summary = DataQualitySummary(
                dataset_id=dataset_id,
                source_name=source_name,
                product_name=product_name,
                ingestion_time=datetime.utcnow().isoformat() + "Z",
                total_raw_records=0,
                valid_records=0,
                invalid_records=0,
                duplicate_records=0,
                out_of_aoi_records=0,
                modis_count=0,
                viirs_count=0,
                warning_messages=warning_messages
            )
            return [], summary

        for idx, row in enumerate(raw_records):
            # 1. Normalize field keys to lowercase for flexible inspection
            normalized_row = {k.strip().lower(): v for k, v in row.items() if k is not None}
            
            # 2. Extract and validate coordinates
            raw_lat = normalized_row.get('latitude') or normalized_row.get('lat')
            raw_lon = normalized_row.get('longitude') or normalized_row.get('lon') or normalized_row.get('long')
            
            if raw_lat is None or raw_lon is None or str(raw_lat).strip() == "" or str(raw_lon).strip() == "":
                rejection_reasons["missing_coordinates"] += 1
                continue
                
            try:
                lat = float(raw_lat)
                lon = float(raw_lon)
            except (ValueError, TypeError):
                rejection_reasons["missing_coordinates"] += 1
                continue
                
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                rejection_reasons["invalid_coordinate_range"] += 1
                continue

            # 3. Check AOI bounding box if supplied
            if aoi_bbox and len(aoi_bbox) == 4:
                b_min_lon, b_min_lat, b_max_lon, b_max_lat = aoi_bbox
                if not (b_min_lon <= lon <= b_max_lon and b_min_lat <= lat <= b_max_lat):
                    rejection_reasons["outside_aoi"] += 1
                    continue

            # 4. Validate acquisition date and time
            raw_date = normalized_row.get('acq_date') or normalized_row.get('date')
            raw_time = normalized_row.get('acq_time') or normalized_row.get('time')
            
            if not raw_date:
                rejection_reasons["invalid_date_or_time"] += 1
                continue
                
            raw_date_str = str(raw_date).strip()
            # Handle various date string formats: YYYY-MM-DD, YYYY/MM/DD
            date_clean = raw_date_str.replace('/', '-')
            try:
                parsed_date = datetime.strptime(date_clean[:10], "%Y-%m-%d")
                date_str = parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                rejection_reasons["invalid_date_or_time"] += 1
                continue

            # Format time: e.g. '0435', '435', '04:35', or integer 435
            time_str = "0000"
            if raw_time is not None:
                cleaned_time = str(raw_time).strip().replace(":", "")
                if cleaned_time.isdigit():
                    time_str = cleaned_time.zfill(4)[:4]
                else:
                    time_str = "0000"

            # 5. Check for duplicate observation records
            sat = str(normalized_row.get('satellite', '')).strip()
            instr = str(normalized_row.get('instrument', '')).strip()
            dedup_key = (round(lat, 5), round(lon, 5), date_str, time_str, sat)
            
            if dedup_key in seen_keys:
                rejection_reasons["duplicate_record"] += 1
                continue
            seen_keys.add(dedup_key)

            # 6. Validate FRP
            raw_frp = normalized_row.get('frp')
            parsed_frp = None
            if raw_frp is not None and str(raw_frp).strip() != "":
                try:
                    f = float(raw_frp)
                    if f < 0:
                        rejection_reasons["invalid_frp"] += 1
                        continue
                    parsed_frp = f
                except (ValueError, TypeError):
                    missing_frp_count += 1
            else:
                missing_frp_count += 1

            # 7. Check confidence field
            conf = normalized_row.get('confidence')
            if conf is None or str(conf).strip() == "":
                missing_confidence_count += 1

            # 8. Determine sensor family
            sensor_fam = "UNKNOWN"
            if "viirs" in instr.lower() or "bright_ti4" in normalized_row or "ti4" in normalized_row or "noaa" in sat.lower() or "npp" in sat.lower():
                sensor_fam = "VIIRS"
                viirs_count += 1
            elif "modis" in instr.lower() or "bright_t31" in normalized_row or "terra" in sat.lower() or "aqua" in sat.lower() or "brightness" in normalized_row:
                sensor_fam = "MODIS"
                modis_count += 1
            else:
                # Default heuristics based on columns
                if "bright_ti4" in normalized_row:
                    sensor_fam = "VIIRS"
                    viirs_count += 1
                else:
                    sensor_fam = "MODIS"
                    modis_count += 1

            # Track spatial and temporal extent
            min_lon = min(min_lon, lon)
            max_lon = max(max_lon, lon)
            min_lat = min(min_lat, lat)
            max_lat = max(max_lat, lat)
            dates.append(date_str)

            # Keep cleaned record
            normalized_row['_parsed_lat'] = lat
            normalized_row['_parsed_lon'] = lon
            normalized_row['_parsed_date'] = date_str
            normalized_row['_parsed_time'] = time_str
            normalized_row['_parsed_frp'] = parsed_frp
            normalized_row['_sensor_family'] = sensor_fam
            
            valid_records.append(normalized_row)

        dates.sort()
        date_start = dates[0] if dates else None
        date_end = dates[-1] if dates else None
        spatial_extent = [min_lon, min_lat, max_lon, max_lat] if valid_records else None

        valid_count = len(valid_records)
        invalid_count = (
            rejection_reasons["missing_coordinates"] +
            rejection_reasons["invalid_coordinate_range"] +
            rejection_reasons["invalid_date_or_time"] +
            rejection_reasons["invalid_frp"]
        )

        if missing_frp_count > 0:
            warning_messages.append(f"{missing_frp_count} records had missing or unparseable FRP values.")
        if missing_confidence_count > 0:
            warning_messages.append(f"{missing_confidence_count} records had missing confidence values.")
        if rejection_reasons["duplicate_record"] > 0:
            warning_messages.append(f"Identified and deduplicated {rejection_reasons['duplicate_record']} duplicate records.")
        if rejection_reasons["outside_aoi"] > 0:
            warning_messages.append(f"Filtered out {rejection_reasons['outside_aoi']} records outside the specified AOI.")

        summary = DataQualitySummary(
            dataset_id=dataset_id,
            source_name=source_name,
            product_name=product_name,
            ingestion_time=datetime.utcnow().isoformat() + "Z",
            total_raw_records=total_raw,
            valid_records=valid_count,
            invalid_records=invalid_count,
            duplicate_records=rejection_reasons["duplicate_record"],
            out_of_aoi_records=rejection_reasons["outside_aoi"],
            modis_count=modis_count,
            viirs_count=viirs_count,
            date_range_start=date_start,
            date_range_end=date_end,
            spatial_extent=spatial_extent,
            missing_frp_count=missing_frp_count,
            missing_confidence_count=missing_confidence_count,
            rejection_reasons=rejection_reasons,
            warning_messages=warning_messages
        )

        logger.info(
            f"Validation complete for dataset {dataset_id}: "
            f"raw={total_raw}, valid={valid_count}, invalid={invalid_count}, "
            f"duplicates={rejection_reasons['duplicate_record']}, out_of_aoi={rejection_reasons['outside_aoi']}"
        )

        return valid_records, summary
