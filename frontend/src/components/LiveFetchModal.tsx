import React, { useState } from 'react';
import { X, Satellite, Key, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { PredefinedRegion } from '../types';

interface LiveFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: PredefinedRegion[];
  firmsConfigured: boolean;
  onFetch: (params: {
    regionId?: string;
    bbox?: [number, number, number, number];
    dayRange: number;
    sensors: string[];
    customKey?: string;
  }) => Promise<void>;
}

export const LiveFetchModal: React.FC<LiveFetchModalProps> = ({
  isOpen,
  onClose,
  regions,
  firmsConfigured,
  onFetch
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState('karnataka');
  const [dayRange, setDayRange] = useState(3);
  const [customKey, setCustomKey] = useState('');
  const [sensors, setSensors] = useState<string[]>([
    'MODIS_NRT',
    'VIIRS_SNPP_NRT',
    'VIIRS_NOAA20_NRT',
    'VIIRS_NOAA21_NRT'
  ]);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleSensor = (s: string) => {
    if (sensors.includes(s)) {
      if (sensors.length > 1) setSensors(sensors.filter(x => x !== s));
    } else {
      setSensors([...sensors, s]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFetching(true);
    try {
      await onFetch({
        regionId: selectedRegionId,
        dayRange,
        sensors,
        customKey: customKey.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'NASA FIRMS fetch failed');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Fetch Live NASA FIRMS Data</h3>
            <p className="text-xs text-slate-400">Direct near-real-time satellite thermal anomaly query</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* MAP_KEY Guidance */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>NASA FIRMS MAP_KEY</span>
              </span>
              <a
                href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
              >
                <span>Get free MAP_KEY</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {firmsConfigured ? (
              <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Default FIRMS_MAP_KEY configured on server. You may override below if needed.</span>
              </div>
            ) : (
              <div className="text-[11px] text-amber-400/90 flex items-start space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>No server MAP_KEY configured. Please enter your MAP_KEY below to query NASA live.</span>
              </div>
            )}

            <input
              type="password"
              placeholder="Enter NASA FIRMS MAP_KEY (32-character hex)"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Area of Interest */}
          <div>
            <label className="text-slate-300 font-medium block mb-1">Target Geographic Region</label>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
            >
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Day Range (1 to 10) */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-slate-300 font-medium">Recent Observation Window</label>
              <span className="font-mono text-amber-400 font-semibold">{dayRange} Days</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={dayRange}
              onChange={(e) => setDayRange(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>1 Day (Past 24h)</span>
              <span>5 Days</span>
              <span>10 Days (API Limit)</span>
            </div>
          </div>

          {/* Sensor Products Checkboxes */}
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">Active Satellite Feeds</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'MODIS_NRT', name: 'MODIS (Terra & Aqua)' },
                { id: 'VIIRS_SNPP_NRT', name: 'VIIRS (Suomi-NPP 375m)' },
                { id: 'VIIRS_NOAA20_NRT', name: 'VIIRS (NOAA-20 375m)' },
                { id: 'VIIRS_NOAA21_NRT', name: 'VIIRS (NOAA-21 375m)' }
              ].map(s => (
                <label key={s.id} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensors.includes(s.id)}
                    onChange={() => handleToggleSensor(s.id)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span className="text-[11px] truncate">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={fetching}
              className="px-4 py-2 rounded-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md disabled:opacity-50 transition-colors"
            >
              {fetching ? 'Fetching NASA FIRMS...' : 'Fetch Live Observations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
