import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { BarChart3, AlertTriangle, CheckCircle2, TrendingUp, Calendar, Zap, Info } from 'lucide-react';
import { BaselineMonthComparison, SeasonalityAnalysis, SummaryMetrics } from '../types';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AnalyticsTabProps {
  anomalies: BaselineMonthComparison[];
  seasonality: SeasonalityAnalysis | null;
  metrics: SummaryMetrics | null;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  anomalies = [],
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 min-w-0">
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

        <div className="h-72 w-full min-w-0">
          <ErrorBoundary fallbackTitle="Baseline Chart Interrupted">
            {anomalies && anomalies.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={anomalies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month_name" stroke="#64748b" fontSize={11} tickFormatter={(v) => (v || '').slice(0, 3)} />
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
          </ErrorBoundary>
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
                <th className="px-3 py-2.5 text-right">MAD Dispersion</th>
                <th className="px-3 py-2.5 text-right">Years Analyzed</th>
                <th className="px-3 py-2.5 text-right">Anomaly Score (MAD)</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Scientific Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {anomalies && anomalies.length > 0 ? (
                anomalies.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5 font-sans font-bold text-slate-100">{row.month_name}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-400">
                      {(row.current_count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {(row.historical_median ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400">
                      {row.historical_mad != null ? `±${row.historical_mad}` : 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400">
                      {row.historical_years_count ?? 0} yrs
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {row.anomaly_score != null ? (
                        <span className={
                          row.anomaly_score > 3.0 ? 'text-red-400 font-bold' :
                          row.anomaly_score > 1.5 ? 'text-orange-400' :
                          row.anomaly_score < -1.5 ? 'text-sky-400' : 'text-slate-300'
                        }>
                          {row.anomaly_score > 0 ? `+${row.anomaly_score.toFixed(2)}` : row.anomaly_score.toFixed(2)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        row.status === 'Significantly Above Baseline' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        row.status === 'Above Baseline' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        row.status === 'Below Baseline' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                        row.status === 'Insufficient Baseline' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-sans text-xs text-slate-400 max-w-xs truncate" title={row.explanation}>
                      {row.explanation}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No historical anomaly calculations available for this dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Seasonality Climatology & Interannual Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Climatology Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3 min-w-0">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-200">Annual Fire Climatology Profile</h3>
            <p className="text-xs text-slate-400">Percentage distribution of fire activity throughout the year</p>
          </div>

          <div className="h-60 w-full min-w-0">
            <ErrorBoundary fallbackTitle="Climatology Chart Interrupted">
              {seasonality && seasonality.monthly_climatology && seasonality.monthly_climatology.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={seasonality.monthly_climatology} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month_name" stroke="#64748b" fontSize={10} tickFormatter={(v) => (v || '').slice(0, 3)} />
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
            </ErrorBoundary>
          </div>

          {seasonality && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-300">
              <span><strong>Peak Fire Season:</strong> {(seasonality.peak_months || []).join(', ') || 'N/A'}</span>
              <span><strong>Lowest Season:</strong> {(seasonality.lowest_months || []).join(', ') || 'N/A'}</span>
            </div>
          )}
        </div>

        {/* Statistical Guardrail Explainer Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Methodology & Statistical Rigor</span>
              </h3>
              <p className="text-xs text-slate-400">Why FireSignal uses non-parametric MAD over simple means</p>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-semibold text-amber-400 block mb-1">1. Highly Skewed Distributions</span>
                Wildfire and crop burning activity is strongly episodic and zero-inflated. A standard mean and standard deviation creates false baselines inflated by extreme blowout seasons.
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-semibold text-sky-400 block mb-1">2. Median Absolute Deviation (MAD)</span>
                We use the median as the central climatological expectation, scaled by MAD:
                <code className="block mt-1 font-mono text-[11px] text-sky-300 bg-slate-900 p-1 rounded">
                  Score = (Current - Median) / (1.4826 * MAD)
                </code>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-400 block mb-1">3. Multi-Year Climatology Requirement</span>
                An anomaly classification is only marked valid if at least 2 distinct historical years are available for that calendar month. Otherwise, it is transparently flagged as &ldquo;Insufficient Baseline&rdquo;.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
