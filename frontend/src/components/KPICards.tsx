import React from 'react';
import { Flame, Activity, Zap, Calendar, Grid, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { SummaryMetrics } from '../types';

interface KPICardsProps {
  metrics: SummaryMetrics | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  // Determine anomaly badge styling
  let anomalyBg = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let AnomalyIcon = Activity;

  if (metrics.anomaly_status === 'Significantly Above Baseline') {
    anomalyBg = 'bg-red-500/10 text-red-400 border-red-500/30';
    AnomalyIcon = AlertTriangle;
  } else if (metrics.anomaly_status === 'Above Baseline') {
    anomalyBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    AnomalyIcon = AlertTriangle;
  } else if (metrics.anomaly_status === 'Within Range') {
    anomalyBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    AnomalyIcon = CheckCircle2;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Combined Observations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Combined Hotspots</span>
          <Flame className="w-4 h-4 text-orange-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.total_combined_detections.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {metrics.daily_average_detections} avg / active day
          </div>
        </div>
      </div>

      {/* 2. Sensor Composition (MODIS vs VIIRS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Sensor Share</span>
          <div className="flex space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-sm font-bold text-amber-400">{metrics.modis_share_percent}%</span>
            <span className="text-xs text-slate-500">vs</span>
            <span className="text-sm font-bold text-red-400">{metrics.viirs_share_percent}%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            MODIS: {metrics.total_modis_detections} • VIIRS: {metrics.total_viirs_detections}
          </div>
        </div>
      </div>

      {/* 3. Spatial Extent (Active Cells) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Active Grid Cells</span>
          <Grid className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-purple-300 tracking-tight">
            {metrics.active_grid_cells_count.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ~1 km common grid cells
          </div>
        </div>
      </div>

      {/* 4. Active Days */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Temporal Span</span>
          <Calendar className="w-4 h-4 text-sky-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.active_days_count} <span className="text-sm font-normal text-slate-400">days</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Peak: {metrics.peak_activity_date || 'N/A'} ({metrics.peak_activity_count})
          </div>
        </div>
      </div>

      {/* 5. Fire Radiative Power (MW) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Radiative Power (FRP)</span>
          <Zap className="w-4 h-4 text-yellow-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-yellow-400 tracking-tight">
            {metrics.mean_frp_mw ? `${metrics.mean_frp_mw}` : 'N/A'} <span className="text-xs font-normal text-slate-400">MW mean</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Max: {metrics.max_frp_mw ? `${metrics.max_frp_mw} MW` : 'N/A'} • {metrics.colocated_percentage}% co-located
          </div>
        </div>
      </div>

      {/* 6. Anomaly Status */}
      <div className={`border rounded-xl p-3.5 shadow-sm flex flex-col justify-between ${anomalyBg}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider">Baseline Status</span>
          <AnomalyIcon className="w-4 h-4" />
        </div>
        <div className="mt-2">
          <div className="text-sm font-bold truncate" title={metrics.anomaly_status}>
            {metrics.anomaly_status}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5 line-clamp-1" title={metrics.anomaly_explanation}>
            {metrics.anomaly_score !== 0 ? `MAD Score: ${metrics.anomaly_score.toFixed(1)}` : metrics.anomaly_explanation}
          </div>
        </div>
      </div>
    </div>
  );
};
