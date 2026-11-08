import React, { useState } from 'react';
import {
  Compass, UploadCloud, Sliders, Database, Play, CheckCircle2,
  Calendar, Layers, MapPin, AlertCircle, Info, Sparkles
} from 'lucide-react';
import { DatasetInfo, PredefinedRegion, HarmonizationConfig } from '../types';

interface ExploreTabProps {
  datasets: DatasetInfo[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  regions: PredefinedRegion[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  customBbox: [number, number, number, number] | null;
  onSetCustomBbox: (bbox: [number, number, number, number] | null) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  selectedSensors: string[];
  onToggleSensor: (s: string) => void;
  harmonizationConfig: HarmonizationConfig;
  onUpdateHarmonizationConfig: (cfg: Partial<HarmonizationConfig>) => void;
  onRunHarmonization: () => void;
  onUploadCSV: (file: File) => Promise<void>;
  loading: boolean;
  onOpenLiveFetch: () => void;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  regions,
  selectedRegionId,
  onSelectRegion,
  customBbox,
  onSetCustomBbox,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedSensors,
  onToggleSensor,
  harmonizationConfig,
  onUpdateHarmonizationConfig,
  onRunHarmonization,
  onUploadCSV,
  loading,
  onOpenLiveFetch
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [customBboxInputs, setCustomBboxInputs] = useState({
    minLon: '74.05', minLat: '11.59', maxLon: '78.58', maxLat: '18.45'
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setUploadMessage('Processing and validating CSV...');
        await onUploadCSV(file);
        setUploadMessage(`Successfully ingested ${file.name}`);
        setTimeout(() => setUploadMessage(null), 4000);
      } catch (err: any) {
        setUploadMessage(`Upload error: ${err.message}`);
      }
    }
  };

  const handleApplyCustomBbox = () => {
    const minLon = parseFloat(customBboxInputs.minLon);
    const minLat = parseFloat(customBboxInputs.minLat);
    const maxLon = parseFloat(customBboxInputs.maxLon);
    const maxLat = parseFloat(customBboxInputs.maxLat);
    if (!isNaN(minLon) && !isNaN(minLat) && !isNaN(maxLon) && !isNaN(maxLat)) {
      onSetCustomBbox([minLon, minLat, maxLon, maxLat]);
      onSelectRegion('custom');
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Compass className="w-5 h-5 text-amber-400" />
          <span>Exploration & Harmonization Workspace</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Select an Area of Interest (AOI), date window, and configure cross-sensor harmonization parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data Source & AOI Selection */}
        <div className="space-y-6 lg:col-span-1">
          {/* 1. Dataset Selection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <span>1. Select Dataset</span>
              </span>
              <button
                onClick={onOpenLiveFetch}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold"
              >
                + NASA Live
              </button>
            </div>

            <div className="space-y-2">
              {datasets.map((ds) => (
                <div
                  key={ds.dataset_id}
                  onClick={() => onSelectDataset(ds.dataset_id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedDatasetId === ds.dataset_id
                      ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 truncate">{ds.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      ds.is_demo ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {ds.source_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {ds.total_records.toLocaleString()} records • MODIS: {ds.modis_count} | VIIRS: {ds.viirs_count}
                  </div>
                </div>
              ))}
            </div>

            {/* CSV Upload Dropzone */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Upload Custom NASA FIRMS CSV
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-amber-400 bg-amber-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    onUploadCSV(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[11px] text-slate-300 font-medium">Click or drop FIRMS CSV here</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Supports standard MODIS C6.1 and VIIRS 375m CSVs</span>
                </label>
              </div>
              {uploadMessage && (
                <div className="text-[11px] text-amber-400 mt-2 p-1.5 rounded bg-slate-800 border border-slate-700">
                  {uploadMessage}
                </div>
              )}
            </div>
          </div>

          {/* 2. Geographic AOI Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>2. Area of Interest (AOI)</span>
            </span>

            {/* Predefined Regions */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Predefined Regions</label>
              <div className="grid grid-cols-2 gap-1.5">
                {regions.map((reg) => (
                  <button
                    key={reg.id}
                    onClick={() => onSelectRegion(reg.id)}
                    className={`px-2.5 py-1.5 rounded text-xs text-left truncate transition-colors ${
                      selectedRegionId === reg.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {reg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Coordinates Bounding Box */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Custom BBox [Lon, Lat]</span>
                {selectedRegionId === 'custom' && (
                  <span className="text-[10px] text-sky-400 font-mono">Custom active</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Min Lon</span>
                  <input
                    type="text"
                    value={customBboxInputs.minLon}
                    onChange={(e) => setCustomBboxInputs({ ...customBboxInputs, minLon: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Min Lat</span>
                  <input
                    type="text"
                    value={customBboxInputs.minLat}
                    onChange={(e) => setCustomBboxInputs({ ...customBboxInputs, minLat: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Max Lon</span>
                  <input
                    type="text"
                    value={customBboxInputs.maxLon}
                    onChange={(e) => setCustomBboxInputs({ ...customBboxInputs, maxLon: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Max Lat</span>
                  <input
                    type="text"
                    value={customBboxInputs.maxLat}
                    onChange={(e) => setCustomBboxInputs({ ...customBboxInputs, maxLat: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyCustomBbox}
                className="w-full py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 rounded transition-colors"
              >
                Apply Custom Coordinates
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (2 spans): Harmonization Engine Parameters & Execution */}
        <div className="space-y-6 lg:col-span-2">
          {/* 3. Sensor Toggles & Date Filtering */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>3. Temporal Window & Sensor Filters</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Date Range Window</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Active Sensors</label>
                <div className="flex space-x-3 pt-1">
                  <label className="flex items-center space-x-2 text-xs cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedSensors.includes('MODIS')}
                      onChange={() => onToggleSensor('MODIS')}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>MODIS (Terra/Aqua 1km)</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedSensors.includes('VIIRS')}
                      onChange={() => onToggleSensor('VIIRS')}
                      className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
                    />
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>VIIRS (SNPP/N20/N21 375m)</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Harmonization Parameters (The Core Scientific Feature) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>4. Scientific Harmonization Parameters</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Equal-Area Projected CRS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Spatial Common Grid Resolution */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Common Grid Size</label>
                <select
                  value={harmonizationConfig.grid_size_km}
                  onChange={(e) => onUpdateHarmonizationConfig({ grid_size_km: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={0.5}>0.5 km (High resolution)</option>
                  <option value={1.0}>1.0 km (Nominal MODIS equivalent)</option>
                  <option value={2.0}>2.0 km (Regional scale)</option>
                  <option value={5.0}>5.0 km (Coarse synoptic)</option>
                </select>
                <span className="text-[10px] text-slate-500 block">Projected equal-area cell size</span>
              </div>

              {/* Co-location Distance Buffer */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Co-location Distance</label>
                <select
                  value={harmonizationConfig.colocation_distance_meters}
                  onChange={(e) => onUpdateHarmonizationConfig({ colocation_distance_meters: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={500}>500 meters</option>
                  <option value={1000}>1,000 meters (1 km)</option>
                  <option value={2000}>2,000 meters (2 km)</option>
                </select>
                <span className="text-[10px] text-slate-500 block">Proximity threshold in meters</span>
              </div>

              {/* Co-location Temporal Window */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Time Window Threshold</label>
                <select
                  value={harmonizationConfig.colocation_time_window_minutes}
                  onChange={(e) => onUpdateHarmonizationConfig({ colocation_time_window_minutes: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={30}>±30 minutes</option>
                  <option value={60}>±60 minutes (1 hour)</option>
                  <option value={120}>±120 minutes (2 hours)</option>
                </select>
                <span className="text-[10px] text-slate-500 block">Cross-sensor overpass window</span>
              </div>
            </div>

            {/* Scientific Explanation Callout */}
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-[11px]">
                <Info className="w-3.5 h-3.5" />
                <span>Explainable Harmonization Principles:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                • <strong>No Data Deletion:</strong> Co-located detections are flagged, never silently deleted, preserving multi-angle views.
                <br />
                • <strong>Sensor Separation:</strong> MODIS and VIIRS counts remain separated inside each grid cell to reflect their distinct spatial detection footprints.
              </p>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={onRunHarmonization}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-slate-950 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Harmonizing & Calculating Analytics...' : 'Run Harmonization Engine'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
