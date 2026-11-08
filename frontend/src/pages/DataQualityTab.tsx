import React from 'react';
import { ShieldCheck, AlertCircle, FileText, CheckCircle2, XCircle, Copy, AlertTriangle } from 'lucide-react';
import { DatasetInfo } from '../types';

interface DataQualityTabProps {
  currentDataset: DatasetInfo | null;
}

export const DataQualityTab: React.FC<DataQualityTabProps> = ({ currentDataset }) => {
  if (!currentDataset || !currentDataset.quality_summary) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p>No dataset currently loaded to assess data quality.</p>
      </div>
    );
  }

  const qs = currentDataset.quality_summary;
  const validRate = qs.total_raw_records > 0
    ? ((qs.valid_records / qs.total_raw_records) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <span>Data Ingestion & Quality Audit Report</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete audit trail of data validation, coordinate range checks, deduplication, and parsing telemetry.
        </p>
      </div>

      {/* Dataset Provenance Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Dataset Provenance Metadata</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">
            ID: {qs.dataset_id}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Source Name</span>
            <span className="font-semibold text-slate-200">{qs.source_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Product Specification</span>
            <span className="font-semibold text-slate-200">{qs.product_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Ingestion Timestamp</span>
            <span className="font-mono text-slate-300">{qs.ingestion_time}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Date Range Coverage</span>
            <span className="font-mono text-slate-300">{qs.date_range_start || 'N/A'} to {qs.date_range_end || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Validation Telemetry Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">Total Raw Ingested</span>
          <span className="text-2xl font-bold text-white tracking-tight">{qs.total_raw_records.toLocaleString()}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-emerald-400 flex items-center space-x-1 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validated & Accepted</span>
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">{qs.valid_records.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-mono">({validRate}%)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-red-400 flex items-center space-x-1 mb-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected Records</span>
          </span>
          <span className="text-2xl font-bold text-red-400">{qs.invalid_records.toLocaleString()}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-amber-400 flex items-center space-x-1 mb-1">
            <Copy className="w-3.5 h-3.5" />
            <span>Deduplicated Records</span>
          </span>
          <span className="text-2xl font-bold text-amber-400">{qs.duplicate_records.toLocaleString()}</span>
        </div>
      </div>

      {/* Rejection Diagnostics Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">
          Validation Filter Diagnostics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
            <span className="text-slate-400 font-sans">Missing Coordinates:</span>
            <span className="text-slate-200">{qs.rejection_reasons['missing_coordinates'] || 0}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
            <span className="text-slate-400 font-sans">Invalid Coord Range:</span>
            <span className="text-slate-200">{qs.rejection_reasons['invalid_coordinate_range'] || 0}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
            <span className="text-slate-400 font-sans">Corrupt Date/Time:</span>
            <span className="text-slate-200">{qs.rejection_reasons['invalid_date_or_time'] || 0}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
            <span className="text-slate-400 font-sans">Negative FRP Discards:</span>
            <span className="text-slate-200">{qs.rejection_reasons['invalid_frp'] || 0}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
            <span className="text-slate-400 font-sans">Outside AOI Filter:</span>
            <span className="text-slate-200">{qs.out_of_aoi_records || 0}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
            <span className="text-slate-400 font-sans">Missing FRP Values:</span>
            <span className="text-amber-400">{qs.missing_frp_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Warning Logs & Auditable Notices */}
      {qs.warning_messages.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Data Ingestion Advisories & Quality Warnings</span>
          </span>
          <ul className="text-xs text-amber-200/80 space-y-1 list-disc pl-5">
            {qs.warning_messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
