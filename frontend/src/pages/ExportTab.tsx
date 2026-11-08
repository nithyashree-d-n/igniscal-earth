import React from 'react';
import { Download, FileText, Globe, Table, Calendar, Zap, CheckCircle2 } from 'lucide-react';
import { getExportDownloadUrl } from '../services/api';
import { SummaryMetrics, DatasetInfo } from '../types';

interface ExportTabProps {
  analysisId: string | null;
  metrics: SummaryMetrics | null;
  currentDataset: DatasetInfo | null;
}

export const ExportTab: React.FC<ExportTabProps> = ({
  analysisId,
  metrics,
  currentDataset
}) => {
  if (!analysisId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Download className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p>No active harmonization analysis session to export. Please run an analysis in the Explore tab first.</p>
      </div>
    );
  }

  const exportItems = [
    {
      title: 'Canonical Normalized Observations',
      description: 'Standardized observation records with UTC timestamps, sensor metadata, brightness temperatures, and FRP values.',
      format: 'CSV',
      formatType: 'observations_csv',
      icon: Table,
      color: 'text-amber-400'
    },
    {
      title: 'Harmonized 1 km Grid Cells (GeoJSON)',
      description: 'Equal-area projected spatial polygons with separate MODIS vs. VIIRS detection counts and mean FRP. Compatible with QGIS, ArcGIS, and Leaflet.',
      format: 'GeoJSON',
      formatType: 'grid_geojson',
      icon: Globe,
      color: 'text-sky-400'
    },
    {
      title: 'Harmonized 1 km Grid Summary (CSV)',
      description: 'Tabular spatial aggregation listing grid cell identifiers, coordinates, detection counts, and dominant sensor categories.',
      format: 'CSV',
      formatType: 'grid_csv',
      icon: FileText,
      color: 'text-purple-400'
    },
    {
      title: 'Temporal Aggregated Series',
      description: 'Temporal series binned by daily, weekly, or monthly periods with dual-sensor split, active cells count, and night observations.',
      format: 'CSV',
      formatType: 'timeseries_csv',
      icon: Calendar,
      color: 'text-emerald-400'
    },
    {
      title: 'Historical Baseline & Anomaly Report',
      description: 'Monthly baseline comparisons containing historical median, mean, standard deviation, IQR, robust MAD scores, and anomaly classifications.',
      format: 'CSV',
      formatType: 'anomalies_csv',
      icon: Zap,
      color: 'text-orange-400'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Download className="w-5 h-5 text-amber-400" />
          <span>Data & Analytical Report Export</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Export harmonized datasets, spatial geometries, and statistical anomaly reports for external research and GIS software.
        </p>
      </div>

      {/* Active Analysis Session Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Analysis Session Overview
          </span>
          <span className="text-xs font-mono text-amber-400">
            Session: {analysisId}
          </span>
        </div>

        {metrics && currentDataset && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Dataset</span>
              <span className="font-semibold text-slate-200 truncate block">{currentDataset.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Detections</span>
              <span className="font-semibold text-white">{metrics.total_combined_detections.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Active 1km Cells</span>
              <span className="font-semibold text-purple-300">{metrics.active_grid_cells_count.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Baseline Status</span>
              <span className="font-semibold text-orange-400">{metrics.anomaly_status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Export Options Grid */}
      <div className="space-y-3">
        {exportItems.map((item) => {
          const Icon = item.icon;
          const downloadUrl = getExportDownloadUrl(analysisId, item.formatType);

          return (
            <div
              key={item.formatType}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-slate-200">{item.title}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.format}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    {item.description}
                  </p>
                </div>
              </div>

              <a
                href={downloadUrl}
                download
                className="self-end sm:self-auto shrink-0 flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-700 shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {item.format}</span>
              </a>
            </div>
          );
        })}
      </div>

      {/* Scientific Citation Notice */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <span className="font-semibold text-slate-200 block">Data Attribution & Citation Guidelines:</span>
        <p className="text-[11px] leading-relaxed">
          NASA FIRMS active fire data: MODIS Collection 6.1 active fire data produced by NASA EOSDIS LANCE and VIIRS 375 m active fire data produced by NASA/NOAA.
          When publishing results obtained from FireSignal, cite NASA FIRMS (doi:10.5067/FIRMS/WELD/MODIS_NRT) alongside sensor-specific documentation.
        </p>
      </div>
    </div>
  );
};
