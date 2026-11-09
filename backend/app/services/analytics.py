"""Scientific Analytics Engine for FireSignal.

Computes core metrics, sensor contributions, historical baselines,
robust MAD-based anomaly scores, and seasonal climatology.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import numpy as np
from app.models.canonical import ObservationRecord
from app.schemas.responses import (
    SummaryMetrics,
    TimeSeriesPoint,
    BaselineMonthComparison,
    SeasonalityAnalysis,
    AnomalySummary,
)

logger = logging.getLogger("firesignal.analytics")

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


class AnalyticsEngine:
    """Calculates scientific analytics, baselines, and anomalies."""

    @staticmethod
    def calculate_summary_metrics(
        records: List[ObservationRecord],
        timeseries: List[TimeSeriesPoint],
        anomaly_status: str = "Within Range",
        anomaly_score: float = 0.0,
        anomaly_explanation: str = "No significant anomaly detected."
    ) -> SummaryMetrics:
        """Calculate high-level KPIs and sensor contributions."""
        total_obs = len(records)
        if total_obs == 0:
            return SummaryMetrics(
                total_combined_detections=0,
                total_modis_detections=0,
                total_viirs_detections=0,
                modis_share_percent=0.0,
                viirs_share_percent=0.0,
                active_days_count=0,
                active_grid_cells_count=0,
                daily_average_detections=0.0,
                peak_activity_date=None,
                peak_activity_count=0,
                total_frp_mw=None,
                mean_frp_mw=None,
                max_frp_mw=None,
                day_detections_count=0,
                night_detections_count=0,
                colocated_detections_count=0,
                colocated_percentage=0.0,
                anomaly_status="Insufficient Baseline",
                anomaly_score=0.0,
                anomaly_explanation="No observation records available."
            )

        modis_count = sum(1 for r in records if r.sensor_family == "MODIS")
        viirs_count = sum(1 for r in records if r.sensor_family == "VIIRS")
        modis_pct = round((modis_count / total_obs) * 100.0, 1)
        viirs_pct = round((viirs_count / total_obs) * 100.0, 1)

        unique_dates = {r.acquisition_date for r in records}
        active_days = len(unique_dates)

        unique_cells = {r.grid_cell_id for r in records if r.grid_cell_id}
        active_cells_count = len(unique_cells)

        daily_avg = round(total_obs / max(1, active_days), 2)

        # Peak activity date
        date_counts: Dict[str, int] = {}
        for r in records:
            date_counts[r.acquisition_date] = date_counts.get(r.acquisition_date, 0) + 1
        
        peak_date = None
        peak_count = 0
        if date_counts:
            peak_date, peak_count = max(date_counts.items(), key=lambda x: x[1])

        # FRP metrics
        frps = [r.frp for r in records if r.frp is not None]
        total_frp = round(float(sum(frps)), 2) if frps else None
        mean_frp = round(float(np.mean(frps)), 2) if frps else None
        max_frp = round(float(max(frps)), 2) if frps else None

        # Day / Night
        night_count = sum(1 for r in records if r.day_night == "N")
        day_count = total_obs - night_count

        # Co-located observations
        colocated_count = sum(1 for r in records if r.is_colocated)
        colocated_pct = round((colocated_count / total_obs) * 100.0, 1)

        return SummaryMetrics(
            total_combined_detections=total_obs,
            total_modis_detections=modis_count,
            total_viirs_detections=viirs_count,
            modis_share_percent=modis_pct,
            viirs_share_percent=viirs_pct,
            active_days_count=active_days,
            active_grid_cells_count=active_cells_count,
            daily_average_detections=daily_avg,
            peak_activity_date=peak_date,
            peak_activity_count=peak_count,
            total_frp_mw=total_frp,
            mean_frp_mw=mean_frp,
            max_frp_mw=max_frp,
            day_detections_count=day_count,
            night_detections_count=night_count,
            colocated_detections_count=colocated_count,
            colocated_percentage=colocated_pct,
            anomaly_status=anomaly_status,
            anomaly_score=anomaly_score,
            anomaly_explanation=anomaly_explanation
        )

    @staticmethod
    def calculate_historical_baseline(
        all_records: List[ObservationRecord],
        current_year: Optional[int] = None
    ) -> List[BaselineMonthComparison]:
        """
        Build monthly climatological baseline from multi-year records and
        evaluate current year's observations against historical distribution.
        """
        if not all_records:
            return []

        # Group counts by year and month
        matrix: Dict[int, Dict[int, int]] = {}
        years_set = set()
        for r in all_records:
            dt = datetime.strptime(r.acquisition_date, "%Y-%m-%d")
            y, m = dt.year, dt.month
            years_set.add(y)
            if y not in matrix:
                matrix[y] = {mo: 0 for mo in range(1, 13)}
            matrix[y][m] += 1

        if not current_year:
            current_year = max(years_set) if years_set else datetime.now(timezone.utc).year

        comparisons: List[BaselineMonthComparison] = []

        for month in range(1, 13):
            month_name = MONTH_NAMES[month]
            current_count = matrix.get(current_year, {}).get(month, 0)

            # Collect historical counts for this month from prior years
            hist_counts = [
                matrix[y][month] for y in sorted(years_set)
                if y != current_year
            ]

            n_years = len(hist_counts)

            # Check if sufficient historical baseline exists (minimum 2 prior years)
            if n_years < 2:
                comparisons.append(BaselineMonthComparison(
                    month=month,
                    month_name=month_name,
                    current_count=current_count,
                    historical_median=round(float(np.median(hist_counts)), 1) if hist_counts else 0.0,
                    historical_mean=round(float(np.mean(hist_counts)), 1) if hist_counts else 0.0,
                    historical_std=0.0,
                    historical_iqr=0.0,
                    historical_mad=0.0,
                    historical_years_count=n_years,
                    anomaly_score=0.0,
                    status="Insufficient Baseline",
                    explanation=f"Insufficient historical baseline: only {n_years} baseline year(s) available; at least 2 required to determine anomalies."
                ))
                continue

            arr = np.array(hist_counts, dtype=float)
            median_val = float(np.median(arr))
            mean_val = float(np.mean(arr))
            std_val = float(np.std(arr, ddof=1)) if n_years > 1 else 0.0

            q75, q25 = np.percentile(arr, [75, 25])
            iqr_val = float(q75 - q25)

            # Robust Median Absolute Deviation (MAD)
            mad_val = float(np.median(np.abs(arr - median_val)))
            # Standard normal scale factor for MAD
            mad_scaled = 1.4826 * mad_val

            # Compute robust anomaly score
            if mad_scaled > 0:
                anomaly_score = (current_count - median_val) / mad_scaled
            elif std_val > 0:
                anomaly_score = (current_count - median_val) / std_val
            elif current_count == median_val:
                anomaly_score = 0.0
            else:
                # If historical activity is constant (e.g. 0) and current has fires
                anomaly_score = 3.5 if current_count > median_val else -3.5

            # Categorize status
            if anomaly_score > 3.0:
                status = "Significantly Above Baseline"
                expl = (
                    f"Observation count ({current_count}) significantly exceeds historical median "
                    f"({median_val:.0f}) by {anomaly_score:.1f} MAD scales."
                )
            elif anomaly_score >= 1.5:
                status = "Above Baseline"
                expl = (
                    f"Observation count ({current_count}) is above the historical median "
                    f"({median_val:.0f}) for {month_name}."
                )
            elif anomaly_score <= -1.5:
                status = "Below Baseline"
                expl = (
                    f"Observation count ({current_count}) is noticeably below historical median "
                    f"({median_val:.0f})."
                )
            else:
                status = "Within Range"
                expl = (
                    f"Observation count ({current_count}) falls within the normal historical range "
                    f"(median {median_val:.0f}, IQR {iqr_val:.0f})."
                )

            comparisons.append(BaselineMonthComparison(
                month=month,
                month_name=month_name,
                current_count=current_count,
                historical_median=round(median_val, 1),
                historical_mean=round(mean_val, 1),
                historical_std=round(std_val, 1),
                historical_iqr=round(iqr_val, 1),
                historical_mad=round(mad_val, 1),
                historical_years_count=n_years,
                anomaly_score=round(anomaly_score, 2),
                status=status,
                explanation=expl
            ))

        return comparisons

    @staticmethod
    def calculate_seasonality(
        records: List[ObservationRecord]
    ) -> SeasonalityAnalysis:
        """Compute monthly climatology, peak seasons, and interannual matrices."""
        if not records:
            return SeasonalityAnalysis(
                monthly_climatology=[],
                peak_months=[],
                lowest_months=[],
                interannual_comparison={}
            )

        matrix: Dict[str, Dict[str, int]] = {}
        month_totals = {m: 0 for m in range(1, 13)}

        for r in records:
            dt = datetime.strptime(r.acquisition_date, "%Y-%m-%d")
            y_str = str(dt.year)
            m_str = f"{dt.month:02d}"
            
            if y_str not in matrix:
                matrix[y_str] = {f"{mo:02d}": 0 for mo in range(1, 13)}
            matrix[y_str][m_str] += 1
            month_totals[dt.month] += 1

        total_obs = len(records)
        climatology = []
        for m in range(1, 13):
            cnt = month_totals[m]
            pct = round((cnt / total_obs) * 100.0, 1) if total_obs > 0 else 0.0
            climatology.append({
                "month": m,
                "month_name": MONTH_NAMES[m],
                "detections": cnt,
                "percentage": pct
            })

        # Identify peak and lowest active months
        sorted_months = sorted(climatology, key=lambda x: x["detections"], reverse=True)
        peak_months = [x["month_name"] for x in sorted_months[:3] if x["detections"] > 0]
        lowest_months = [x["month_name"] for x in sorted_months[-3:]]

        return SeasonalityAnalysis(
            monthly_climatology=climatology,
            peak_months=peak_months,
            lowest_months=lowest_months,
            interannual_comparison=matrix
        )

    @classmethod
    def evaluate_overall_anomaly(
        cls,
        baseline_comparisons: List[BaselineMonthComparison]
    ) -> Tuple[str, float, str]:
        """Summarize current period anomaly based on active month comparisons."""
        if not baseline_comparisons:
            return "Insufficient Baseline", 0.0, "No historical baseline comparisons available."

        active_comps = [c for c in baseline_comparisons if c.current_count > 0]
        if not active_comps:
            return "Within Range", 0.0, "Zero active fire detections in the analyzed period."

        # Pick month with highest anomaly score
        worst_month = max(active_comps, key=lambda c: c.anomaly_score)
        
        if worst_month.status == "Insufficient Baseline":
            return "Insufficient Baseline", 0.0, worst_month.explanation

        return worst_month.status, worst_month.anomaly_score, worst_month.explanation
