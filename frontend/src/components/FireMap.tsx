import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Eye, EyeOff, ZoomIn, Info } from 'lucide-react';
import { GridCellFeature, ObservationPoint } from '../types';

interface FireMapProps {
  gridCells: GridCellFeature[];
  observations: ObservationPoint[];
  aoiBbox?: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  selectedCenter?: [number, number];
  zoomLevel?: number;
}

export const FireMap: React.FC<FireMapProps> = ({
  gridCells,
  observations,
  aoiBbox,
  selectedCenter = [15.0, 76.0],
  zoomLevel = 7
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Layer groups refs (FeatureGroup supports getBounds() properly)
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const modisLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const viirsLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const gridLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const aoiLayerRef = useRef<L.FeatureGroup>(L.featureGroup());

  // Basemap style: 'satellite' (Esri World Imagery) or 'osm' (OpenStreetMap)
  const [baseMapStyle, setBaseMapStyle] = useState<'satellite' | 'osm'>('satellite');

  // Layer toggle states
  const [showModis, setShowModis] = useState(true);
  const [showViirs, setShowViirs] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAOI, setShowAOI] = useState(true);

  // Initialize Leaflet Map safely
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent "Map container is already initialized" error (React 18 StrictMode / Remount)
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: selectedCenter,
          zoom: zoomLevel,
          zoomControl: false,
          attributionControl: false
        });

        // Free reliable satellite tile layer (Esri World Imagery - requires NO API key)
        const tileUrl = baseMapStyle === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const tileLayer = L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: baseMapStyle === 'satellite'
            ? 'Tiles &copy; Esri &mdash; NASA FIRMS'
            : '&copy; OpenStreetMap contributors | NASA FIRMS'
        }).addTo(map);

        baseTileLayerRef.current = tileLayer;

        // Controls
        L.control.attribution({ position: 'bottomright' }).addTo(map);
        L.control.zoom({ position: 'bottomleft' }).addTo(map);

        // Add layer groups to map
        modisLayerRef.current.addTo(map);
        viirsLayerRef.current.addTo(map);
        gridLayerRef.current.addTo(map);
        aoiLayerRef.current.addTo(map);

        mapInstanceRef.current = map;
      } catch (err) {
        console.error('Failed to initialize Leaflet map instance:', err);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing map instance:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update base tile layer on style toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      try {
        map.removeLayer(baseTileLayerRef.current);
      } catch (e) {
        // safe ignore
      }
    }

    const tileUrl = baseMapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: baseMapStyle === 'satellite'
        ? 'Tiles &copy; Esri &mdash; NASA FIRMS'
        : '&copy; OpenStreetMap contributors | NASA FIRMS'
    }).addTo(map);

    baseTileLayerRef.current = tileLayer;
  }, [baseMapStyle]);

  // Handle Layer Visibility Toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showModis) {
      if (!map.hasLayer(modisLayerRef.current)) map.addLayer(modisLayerRef.current);
    } else {
      if (map.hasLayer(modisLayerRef.current)) map.removeLayer(modisLayerRef.current);
    }

    if (showViirs) {
      if (!map.hasLayer(viirsLayerRef.current)) map.addLayer(viirsLayerRef.current);
    } else {
      if (map.hasLayer(viirsLayerRef.current)) map.removeLayer(viirsLayerRef.current);
    }

    if (showGrid) {
      if (!map.hasLayer(gridLayerRef.current)) map.addLayer(gridLayerRef.current);
    } else {
      if (map.hasLayer(gridLayerRef.current)) map.removeLayer(gridLayerRef.current);
    }

    if (showAOI) {
      if (!map.hasLayer(aoiLayerRef.current)) map.addLayer(aoiLayerRef.current);
    } else {
      if (map.hasLayer(aoiLayerRef.current)) map.removeLayer(aoiLayerRef.current);
    }
  }, [showModis, showViirs, showGrid, showAOI]);

  // Render AOI Bounding Box
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    aoiLayerRef.current.clearLayers();

    if (aoiBbox && aoiBbox.length === 4) {
      const [minLon, minLat, maxLon, maxLat] = aoiBbox;
      if ([minLon, minLat, maxLon, maxLat].every(n => typeof n === 'number' && isFinite(n))) {
        const bounds: L.LatLngBoundsExpression = [
          [minLat, minLon],
          [maxLat, maxLon]
        ];

        const rect = L.rectangle(bounds, {
          color: '#38bdf8',
          weight: 2,
          fillColor: '#0284c7',
          fillOpacity: 0.05,
          dashArray: '6, 6'
        });

        rect.bindTooltip('Area of Interest (AOI)', { sticky: true, className: 'text-xs font-mono' });
        aoiLayerRef.current.addLayer(rect);
      }
    }
  }, [aoiBbox]);

  // Render Harmonized Common Grid (~1km) Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    gridLayerRef.current.clearLayers();

    gridCells.forEach((cell) => {
      if (!cell.bounds || cell.bounds.length === 0) return;
      
      // Cell bounds are [lon, lat], Leaflet polygon requires [lat, lon]
      const latLngs = cell.bounds
        .filter(([lon, lat]) => typeof lon === 'number' && typeof lat === 'number' && isFinite(lon) && isFinite(lat))
        .map(([lon, lat]) => [lat, lon] as [number, number]);

      if (latLngs.length < 3) return;

      let color = '#f59e0b'; // Amber for MODIS
      if (cell.dominant_sensor === 'VIIRS') color = '#ef4444'; // Red for VIIRS
      if (cell.dominant_sensor === 'DUAL') color = '#a855f7'; // Purple for DUAL

      const poly = L.polygon(latLngs, {
        color: color,
        weight: 1,
        fillColor: color,
        fillOpacity: Math.min(0.65, 0.2 + (cell.total_detections * 0.08)),
      });

      poly.bindPopup(`
        <div class="text-xs space-y-1">
          <div class="font-bold text-sm text-slate-100 flex items-center justify-between border-b border-slate-700 pb-1">
            <span>Grid Cell: ${cell.grid_cell_id}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${
              cell.dominant_sensor === 'VIIRS' ? 'bg-red-500/20 text-red-300' :
              cell.dominant_sensor === 'MODIS' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
            }">
              ${cell.dominant_sensor} Dominant
            </span>
          </div>
          <div class="grid grid-cols-2 gap-x-2 pt-1">
            <span class="text-slate-400">Total Detections:</span>
            <span class="font-semibold text-slate-200 text-right">${cell.total_detections}</span>
            <span class="text-slate-400">MODIS Hotspots:</span>
            <span class="font-semibold text-amber-400 text-right">${cell.modis_detections}</span>
            <span class="text-slate-400">VIIRS Hotspots:</span>
            <span class="font-semibold text-red-400 text-right">${cell.viirs_detections}</span>
            <span class="text-slate-400">Mean FRP:</span>
            <span class="font-semibold text-slate-200 text-right">${cell.mean_frp ? cell.mean_frp + ' MW' : 'N/A'}</span>
          </div>
          <div class="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
            Nominal ~1 km projected equal-area cell
          </div>
        </div>
      `);

      gridLayerRef.current.addLayer(poly);
    });
  }, [gridCells]);

  // Render Hotspot Observation Points safely
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    modisLayerRef.current.clearLayers();
    viirsLayerRef.current.clearLayers();

    observations.forEach((obs) => {
      if (typeof obs.lat !== 'number' || typeof obs.lon !== 'number' || !isFinite(obs.lat) || !isFinite(obs.lon)) {
        return;
      }

      const isModis = obs.sensor === 'MODIS';
      const color = isModis ? '#fbbf24' : '#f97316'; // Gold for MODIS, Bright Orange for VIIRS

      const marker = L.circleMarker([obs.lat, obs.lon], {
        radius: isModis ? 6 : 4,
        color: obs.is_colocated ? '#38bdf8' : color, // Cyan border if co-located
        weight: obs.is_colocated ? 2 : 1,
        fillColor: color,
        fillOpacity: 0.85
      });

      marker.bindPopup(`
        <div class="text-xs space-y-1.5 min-w-[200px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-1">
            <span class="font-bold text-slate-100 flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full ${isModis ? 'bg-amber-400' : 'bg-orange-500'}"></span>
              <span>${obs.sensor || 'Sensor'} (${obs.satellite || 'Sat'})</span>
            </span>
            <span class="px-1 py-0.5 rounded text-[10px] uppercase font-mono ${
              obs.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300' :
              obs.confidence === 'low' ? 'bg-slate-700 text-slate-400' : 'bg-blue-500/20 text-blue-300'
            }">
              ${obs.confidence || 'nominal'}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-x-2">
            <span class="text-slate-400">Acquisition:</span>
            <span class="text-slate-200 text-right">${obs.date || ''} ${obs.time || ''}Z</span>
            <span class="text-slate-400">Coordinates:</span>
            <span class="text-slate-200 text-right font-mono">${obs.lat.toFixed(4)}, ${obs.lon.toFixed(4)}</span>
            <span class="text-slate-400">Radiative Power (FRP):</span>
            <span class="font-semibold text-amber-400 text-right">${obs.frp ? obs.frp + ' MW' : 'N/A'}</span>
            <span class="text-slate-400">Brightness Temp:</span>
            <span class="text-slate-200 text-right">${obs.brightness ? obs.brightness + ' K' : 'N/A'}</span>
          </div>
          ${obs.is_colocated ? `
            <div class="p-1 rounded bg-sky-950/60 border border-sky-800/40 text-[10px] text-sky-300 flex items-center space-x-1">
              <span class="font-bold">Co-located:</span>
              <span>Near concurrent cross-sensor detection</span>
            </div>
          ` : ''}
          <div class="text-[9px] text-slate-500 italic pt-0.5">
            Note: Satellite thermal anomaly; not confirmed ground fire perimeter.
          </div>
        </div>
      `);

      if (isModis) {
        modisLayerRef.current.addLayer(marker);
      } else {
        viirsLayerRef.current.addLayer(marker);
      }
    });

    // Auto-fit bounds safely with full validity guards
    try {
      if (observations.length > 0) {
        const validCoords = observations
          .filter(o => typeof o.lat === 'number' && !isNaN(o.lat) && typeof o.lon === 'number' && !isNaN(o.lon))
          .map(o => [o.lat, o.lon] as [number, number]);

        if (validCoords.length > 0) {
          const bounds = L.latLngBounds(validCoords);
          if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.1), { maxZoom: 12, animate: false });
          }
        }
      } else if (aoiBbox && aoiBbox.length === 4) {
        const [minLon, minLat, maxLon, maxLat] = aoiBbox;
        if ([minLon, minLat, maxLon, maxLat].every(n => typeof n === 'number' && isFinite(n))) {
          const bounds = L.latLngBounds([[minLat, minLon], [maxLat, maxLon]]);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 12, animate: false });
          }
        }
      }
    } catch (err) {
      console.warn('Map fitBounds handled safely:', err);
    }
  }, [observations]);

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Layer Control Card in Top-Right */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 shadow-lg text-xs space-y-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200 pb-1 border-b border-slate-800">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Map Controls</span>
        </div>

        {/* Basemap Switcher (Free Esri Satellite vs Free OSM) */}
        <div className="pb-1.5 border-b border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">Basemap View</span>
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => setBaseMapStyle('satellite')}
              className={`py-1 text-[10px] rounded font-medium transition-colors ${
                baseMapStyle === 'satellite' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite (Esri)
            </button>
            <button
              type="button"
              onClick={() => setBaseMapStyle('osm')}
              className={`py-1 text-[10px] rounded font-medium transition-colors ${
                baseMapStyle === 'osm' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Street (OSM)
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center justify-between space-x-3 cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
              <span>MODIS (1 km)</span>
            </span>
            <input
              type="checkbox"
              checked={showModis}
              onChange={(e) => setShowModis(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between space-x-3 cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
              <span>VIIRS (375 m)</span>
            </span>
            <input
              type="checkbox"
              checked={showViirs}
              onChange={(e) => setShowViirs(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between space-x-3 cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded border border-amber-400 bg-amber-500/40"></span>
              <span>Harmonized Grid (~1 km)</span>
            </span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between space-x-3 cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded border border-sky-400 border-dashed"></span>
              <span>AOI Boundary</span>
            </span>
            <input
              type="checkbox"
              checked={showAOI}
              onChange={(e) => setShowAOI(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
          </label>
        </div>

        {/* Legend Quick Info */}
        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1 text-sky-300 font-medium">
            <span className="w-2 h-2 rounded-full border border-sky-400"></span>
            <span>Cyan Ring = Co-located</span>
          </div>
          <div className="text-[9px] text-slate-500 leading-tight">
            Concurrent MODIS & VIIRS detection within 1000m / 60min window
          </div>
        </div>
      </div>
    </div>
  );
};
