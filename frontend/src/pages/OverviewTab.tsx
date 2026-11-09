import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { Flame, Compass, AlertCircle, Eye, RefreshCw, Layers } from 'lucide-react';
import { SummaryMetrics, TimeSeriesPoint, GridCellFeature, ObservationPoint, DatasetInfo } from '../types';
import { KPICards } from '../components/KPICards';
import { FireMap } from '../components/FireMap';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface OverviewTabProps {
  metrics: SummaryMetrics | null;
  timeseries: TimeSeriesPoint[];
  gridCells: GridCellFeature[];
  observations: ObservationPoint[];
  currentDataset: DatasetInfo | null;
  aoiBbox?: [number, number, number, number];
  loading: boolean;
  onNavigateExplore: () => void;
  onRefresh: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  timeseries,
  gridCells,
  observations,
  currentDataset,
  aoiBbox,
  loading,
  onNavigateExplore,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 8;

  // Filter observations for preview table safely
  const filteredObs = (observations || []).filter(o => {
    if (!o) return false;
    const sTerm = (searchTerm || '').toLowerCase();
    const sensorStr = (o.sensor || '').toLowerCase();
    const satStr = (o.satellite || '').toLowerCase();
    const dateStr = (o.date || '').toLowerCase();
    return sensorStr.includes(sTerm) || satStr.includes(sTerm) || dateStr.includes(sTerm);
  });

  const totalPages = Math.max(1, Math.ceil(filteredObs.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const paginatedObs = filteredObs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Scientific Positioning */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Sensor-Harmonized Satellite Fire Intelligence
            </h2>
            <p className="text-xs text-slate-400">
              MODIS (1 km) and VIIRS (375 m) active-fire observations aggregated onto a ~1 km common projected grid.
              Thermal anomalies represent radiative heat signatures, not confirmed burned perimeters.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateExplore}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore AOI</span>
          </button>
        </div>
      </div>

      {/* High-Level KPI Summary Cards */}
      <ErrorBoundary fallbackTitle="Summary KPIs Interrupted">
        <KPICards metrics={metrics} />
      </ErrorBoundary>

      {/* Main Map & Interactive Spatiotemporal View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Spatial Fire Distribution & Common Grid</span>
            </h3>
            <span className="text-xs text-slate-400">
              Showing {(observations || []).length.toLocaleString()} sampled detections across {(gridCells || []).length.toLocaleString()} active cells
            </span>
          </div>
          <ErrorBoundary fallbackTitle="Map Rendering Interrupted">
            <FireMap
              gridCells={gridCells || []}
              observations={observations || []}
              aoiBbox={aoiBbox}
            />
          </ErrorBoundary>
        </div>

        {/* Temporal Activity Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-200">Temporal Activity Trend</h3>
              <span className="text-xs font-mono text-amber-400">
                {(timeseries || []).length} periods
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Detections over time separated by sensor family. Notice the higher sensitivity of VIIRS 375m.
            </p>

            <div className="h-64 w-full min-w-0">
              <ErrorBoundary fallbackTitle="Trend Chart Interrupted">
                {timeseries && timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={256}>
                    <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorViirs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorModis" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="period" stroke="#64748b" fontSize={10} tickFormatter={(val) => (val || '').slice(-5)} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Area type="monotone" dataKey="viirs_count" name="VIIRS (375m)" stroke="#f97316" fillOpacity={1} fill="url(#colorViirs)" />
                      <Area type="monotone" dataKey="modis_count" name="MODIS (1km)" stroke="#fbbf24" fillOpacity={1} fill="url(#colorModis)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    No timeseries data available.
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>

          {/* Quick Sensor Ratio Gauge */}
          {metrics && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Sensor Balance</span>
                <span className="font-mono text-amber-400">
                  {metrics.modis_share_percent ?? 0}% M / {metrics.viirs_share_percent ?? 0}% V
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div style={{ width: `${metrics.modis_share_percent ?? 0}%` }} className="bg-amber-400" title="MODIS" />
                <div style={{ width: `${metrics.viirs_share_percent ?? 0}%` }} className="bg-orange-500" title="VIIRS" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>MODIS: {metrics.total_modis_detections ?? 0}</span>
                <span>VIIRS: {metrics.total_viirs_detections ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Observations Table Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Standardized Observation Records</h3>
            <p className="text-xs text-slate-400">Canonical records preserved with original sensor attributes</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search sensor, satellite, date..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setTablePage(1); }}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Sensor / Sat</th>
                <th className="px-3 py-2">Date / Time (UTC)</th>
                <th className="px-3 py-2">Lat, Lon</th>
                <th className="px-3 py-2">Confidence</th>
                <th className="px-3 py-2">FRP (MW)</th>
                <th className="px-3 py-2">Brightness</th>
                <th className="px-3 py-2">Co-located?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {paginatedObs.length > 0 ? (
                paginatedObs.map((obs) => (
                  <tr key={obs.observation_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 text-slate-500">{(obs.observation_id || '').slice(0, 8)}...</td>
                    <td className="px-3 py-2 font-sans font-medium text-slate-200">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${obs.sensor === 'MODIS' ? 'bg-amber-400' : 'bg-orange-500'}`} />
                      {obs.sensor || 'Sensor'} ({obs.satellite || 'Sat'})
                    </td>
                    <td className="px-3 py-2">{obs.date || ''} {obs.time || ''}Z</td>
                    <td className="px-3 py-2">
                      {typeof obs.lat === 'number' && typeof obs.lon === 'number'
                        ? `${obs.lat.toFixed(3)}, ${obs.lon.toFixed(3)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-sans ${
                        obs.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        obs.confidence === 'low' ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {obs.confidence || 'nominal'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-amber-400">
                      {obs.frp != null ? `${obs.frp} MW` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {obs.brightness != null ? `${obs.brightness} K` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {obs.is_colocated ? (
                        <span className="text-sky-400 font-sans text-[11px] font-semibold">Yes</span>
                      ) : (
                        <span className="text-slate-600 font-sans text-[11px]">No</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No matching observation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredObs.length)} of {filteredObs.length}</span>
            <div className="flex space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-700"
              >
                Prev
              </button>
              <span className="px-2 py-1 font-mono text-slate-300">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
