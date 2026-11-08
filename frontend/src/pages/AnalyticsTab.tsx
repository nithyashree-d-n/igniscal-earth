import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import { BarChart3, AlertTriangle, CheckCircle2, TrendingUp, Calendar, Zap, Info } from 'lucide-react';
import { BaselineMonthComparison, SeasonalityAnalysis, SummaryMetrics } from '../types';

interface AnalyticsTabProps {
  anomalies: BaselineMonthComparison[];
  seasonality: SeasonalityAnalysis | null;
  metrics: SummaryMetrics | null;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  anomalies,
  seasonality,
  metrics
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <span>Historical Baseline & Anomaly Intelligence</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Robust median-based climatological comparisons and Median Absolute Deviation (MAD) anomaly scoring.
          Identifies statistically unusual fire periods relative to historical baselines.
        </p>
      </div>

      {/* 1. Historical Baseline vs Current Year Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Monthly Fire Activity vs. Historical Median
            </h3>
            <p className="text-xs text-slate-400">
              Compares active season hotspots against multi-year historical distribution
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-orange-500"></span>
              <span className="text-slate-300">Current Year</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-sky-400"></span>
              <span className="text-slate-300">Historical Median</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {anomalies.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={anomalies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month_name" stroke="#64748b" fontSize={11} tickFormatter={(v) => v.slice(0, 3)} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="current_count" name="Current Hotspots" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="historical_median" name="Historical Median" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No historical anomaly data available.
            </div>
          )}
        </div>
      </div>

      {/* 2. Anomaly Classification Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Monthly Anomaly Scoring (MAD & IQR)
            </h3>
            <p className="text-xs text-slate-400">
              Robust statistical deviation from monthly median. Safe against skewed fire distributions.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Month</th>
                <th className="px-3 py-2.5 text-right">Current Count</th>
                <th className="px-3 py-2.5 text-right">Historical Median</th>
                <th className="px-3 py-2.5 text-right">Mean ± Std</th>
                <th className="px-3 py-2.5 text-right">IQR (Q75-Q25)</th>
                <th className="px-3 py-2.5 text-right">MAD Score</th>
                <th className="px-3 py-2.5 text-center">Classification</th>
                <th className="px-3 py-2.5">Analytical Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {anomalies.map((item) => {
                let badgeClass = 'bg-slate-800 text-slate-400';
                if (item.status === 'Significantly Above Baseline') {
                  badgeClass = 'bg-red-500/20 text-red-300 border border-red-500/30';
                } else if (item.status === 'Above Baseline') {
                  badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                } else if (item.status === 'Within Range') {
                  badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                }

                return (
                  <tr key={item.month} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 font-sans font-semibold text-slate-200">{item.month_name}</td>
                    <td className="px-3 py-2 text-right font-bold text-orange-400">{item.current_count}</td>
                    <td className="px-3 py-2 text-right text-sky-400">{item.historical_median}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{item.historical_mean} ± {item.historical_std}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{item.historical_iqr}</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {item.historical_years_count >= 2 ? (
                        <span className={item.anomaly_score > 2 ? 'text-red-400' : 'text-slate-300'}>
                          {item.anomaly_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${badgeClass}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-sans text-slate-400 text-[11px] max-w-xs truncate" title={item.explanation}>
                      {item.explanation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Seasonality Climatology & Interannual Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Climatology Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-200">Annual Fire Climatology Profile</h3>
            <p className="text-xs text-slate-400">Percentage distribution of fire activity throughout the year</p>
          </div>

          <div className="h-60 w-full">
            {seasonality && seasonality.monthly_climatology.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonality.monthly_climatology} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month_name" stroke="#64748b" fontSize={10} tickFormatter={(v) => v.slice(0, 3)} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(val: any) => [`${val}%`, 'Climatological Share']}
                  />
                  <Bar dataKey="percentage" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No climatology data available.
              </div>
            )}
          </div>

          {seasonality && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-300">
              <span><strong>Peak Fire Season:</strong> {seasonality.peak_months.join(', ') || 'N/A'}</span>
              <span><strong>Lowest Season:</strong> {seasonality.lowest_months.join(', ') || 'N/A'}</span>
            </div>
          )}
        </div>

        {/* Interannual Matrix Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-200">Multi-Year Interannual Matrix</h3>
            <p className="text-xs text-slate-400">Total detected hotspots by calendar year and month</p>
          </div>

          <div className="overflow-x-auto max-h-60">
            {seasonality && Object.keys(seasonality.interannual_comparison).length > 0 ? (
              <table className="w-full text-center text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Year</th>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                      <th key={m} className="px-1.5 py-1.5">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Object.entries(seasonality.interannual_comparison).map(([year, months]) => (
                    <tr key={year} className="hover:bg-slate-800/40">
                      <td className="px-2 py-1.5 font-bold text-left text-slate-100">{year}</td>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(mo => {
                        const cnt = months[mo] || 0;
                        let heatBg = '';
                        if (cnt > 30) heatBg = 'bg-red-500/30 text-red-300 font-bold';
                        else if (cnt > 15) heatBg = 'bg-amber-500/20 text-amber-300';
                        else if (cnt > 0) heatBg = 'text-slate-300';
                        else heatBg = 'text-slate-700';

                        return (
                          <td key={mo} className={`px-1 py-1.5 ${heatBg}`}>
                            {cnt}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-500 text-xs">
                No multi-year records in selected dataset.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
