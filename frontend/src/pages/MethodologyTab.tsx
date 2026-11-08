import React from 'react';
import { BookOpen, AlertOctagon, CheckCircle2, Layers, Cpu, ShieldAlert, Zap, Compass } from 'lucide-react';

export const MethodologyTab: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span>Scientific Methodology & Instrument Physics</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Technical specifications, sensor harmonization mechanics, anomaly mathematics, and explicit analytical limitations.
        </p>
      </div>

      {/* 1. Sensor Differences (MODIS vs. VIIRS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
          <Cpu className="w-4 h-4" />
          <span>1. The Complementary Sensors: MODIS and VIIRS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* MODIS Panel */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-amber-400 text-sm">MODIS (Moderate Resolution Imaging Spectroradiometer)</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px]">Collection 6.1</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed">
              <li>• <strong>Platforms:</strong> Terra (morning overpass ~10:30 AM/PM) and Aqua (afternoon overpass ~1:30 PM/PM).</li>
              <li>• <strong>Spatial Resolution:</strong> ~1 km at nadir (expanding up to ~2 km × 4.8 km towards scan edges).</li>
              <li>• <strong>Spectral Bands:</strong> 4 µm (Band 21/22) high-saturation thermal band and 11 µm (Band 31) background channel.</li>
              <li>• <strong>Confidence Score:</strong> Expressed as a percentage probability from 0% to 100%.</li>
              <li>• <strong>Historical Baseline:</strong> Provides an unmatched multi-decadal historical record spanning from 2000 to the present.</li>
            </ul>
          </div>

          {/* VIIRS Panel */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-orange-400 text-sm">VIIRS (Visible Infrared Imaging Radiometer Suite)</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300 font-mono text-[10px]">375 m Active Fire</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed">
              <li>• <strong>Platforms:</strong> Suomi-NPP (overpass ~1:30 PM/AM), NOAA-20 (JPSS-1), and NOAA-21 (JPSS-2).</li>
              <li>• <strong>Spatial Resolution:</strong> 375 m at nadir using high-resolution Imagery (I) bands with pixel aggregation to constrain edge growth.</li>
              <li>• <strong>Spectral Bands:</strong> I-4 (3.74 µm) thermal anomaly band and I-5 (11.45 µm) background infrared band.</li>
              <li>• <strong>Confidence Score:</strong> Categorical classification: <em>Low</em>, <em>Nominal</em>, and <em>High</em>.</li>
              <li>• <strong>High Sensitivity:</strong> Detects substantially smaller, cooler, and early-stage agricultural or forest fire fronts.</li>
            </ul>
          </div>
        </div>

        {/* Why they cannot be concatenated */}
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Core Scientific Constraint:</strong> Because VIIRS has approximately 8 times smaller pixel area than MODIS at nadir,
            a single MODIS fire pixel often corresponds to multiple VIIRS detections. Simply summing MODIS and VIIRS rows into a single count
            artificially inflates perceived fire activity and destroys historical comparability.
          </p>
        </div>
      </div>

      {/* 2. Harmonization Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
          <Layers className="w-4 h-4" />
          <span>2. Harmonization Engine: Common Spatial Grid & Co-location</span>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            FireSignal harmonizes data using an explainable, multi-stage processing pipeline:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-1 text-xs">A. Equal-Area Projection</span>
              <p className="text-[11px] text-slate-400">
                Geographic coordinates (WGS84) are reprojected using localized Universal Transverse Mercator (UTM) or user-specified equal-area projected CRS to eliminate latitude-dependent degree distortion.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-1 text-xs">B. Common 1 km Grid Cells</span>
              <p className="text-[11px] text-slate-400">
                Projected space is partitioned into nominal 1.0 km cells. MODIS and VIIRS counts are tallied independently per cell, preserving sensor provenance and dominant footprint indicators.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-1 text-xs">C. Co-location Flagging</span>
              <p className="text-[11px] text-slate-400">
                Detections occurring within a spatial buffer (default 1000 m) and temporal window (default ±60 minutes) are flagged with a unified cluster ID without destroying either sensor's record.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Anomaly Detection Mathematics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
          <Zap className="w-4 h-4" />
          <span>3. Statistical Anomaly Formulation (MAD)</span>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Wildfire occurrences follow highly skewed distributions with extreme seasonal zeros and sporadic extreme spikes. Traditional Gaussian z-scores based on standard deviations are severely distorted by extreme fire events.
          </p>

          <p>
            FireSignal implements the <strong>Median Absolute Deviation (MAD)</strong> anomaly score:
          </p>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-center text-xs text-amber-300">
            Anomaly Score = (Count_current − Median_historical) / (1.4826 × MAD_historical)
          </div>

          <p className="text-[11px] text-slate-400">
            Where <span className="font-mono text-slate-200">MAD = median(|X_i − median(X)|)</span> and <span className="font-mono text-slate-200">1.4826</span> is the asymptotic normal scale consistency factor.
            When MAD is zero (e.g. constant historical counts), the engine falls back to interquartile range (IQR) and absolute deviation thresholds to avoid division by zero.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
              <span className="text-red-400 block font-bold">&gt; 3.0</span>
              <span className="text-slate-400 text-[10px]">Significantly Above</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
              <span className="text-amber-400 block font-bold">1.5 to 3.0</span>
              <span className="text-slate-400 text-[10px]">Above Baseline</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
              <span className="text-emerald-400 block font-bold">-1.5 to 1.5</span>
              <span className="text-slate-400 text-[10px]">Within Expected Range</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
              <span className="text-slate-400 block font-bold">&lt; -1.5</span>
              <span className="text-slate-400 text-[10px]">Below Baseline</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Scientific Limitations Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <span>4. Mandatory Operational & Scientific Limitations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="font-semibold text-red-400 block">Thermal Anomaly ≠ Burned Area</span>
            <p className="text-[11px] text-slate-400">
              A satellite hotspot indicates subpixel thermal energy at the exact overpass moment. It does NOT delineate fire perimeter or burned acreage.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="font-semibold text-red-400 block">Cloud & Canopy Obscuration</span>
            <p className="text-[11px] text-slate-400">
              Thick cloud decks, dense smoke plumes, and heavy tree canopies can prevent thermal infrared emissions from reaching satellite sensors.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="font-semibold text-red-400 block">Orbital Overpass Timing</span>
            <p className="text-[11px] text-slate-400">
              Low-Earth orbiting satellites sample each coordinate 2-4 times per day. Fires that ignite and extinguish between overpasses will not be detected.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="font-semibold text-red-400 block">No Future Wildfire Prediction</span>
            <p className="text-[11px] text-slate-400">
              Anomaly detection identifies whether observed detections are historically elevated. FireSignal does NOT forecast where future wildfires will ignite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
