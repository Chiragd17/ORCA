import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OceanStation } from '../../../types';
import { Compass } from 'lucide-react';

interface Props {
  stations: OceanStation[];
  loading: boolean;
  radiusKm?: number;
  center?: [number, number]; // [lon, lat]
  selectedStationId?: string | null;
  onSelectStation?: (station: OceanStation) => void;
}

const DEFAULT_CENTER: [number, number] = [74.50, 13.85];
const DEFAULT_ZOOM = 7.0;

// Generate GeoJSON circular polygon for ocean study radius
function createGeoJSONCircle(center: [number, number], radiusKm: number, points = 64) {
  const coords: [number, number][] = [];
  const [lon, lat] = center;
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lon + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: { radiusKm },
  };
}

export const OceanMap: React.FC<Props> = ({
  stations,
  loading: _loading,
  radiusKm = 160,
  center,
  selectedStationId,
  onSelectStation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'sst' | 'waves' | 'currents' | 'stations'>('sst');

  const effectiveCenter: [number, number] = center && center[0] && center[1] ? center : DEFAULT_CENTER;

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'ORCA Oceanographic Research',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors • Open-Meteo ECMWF Marine',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: effectiveCenter,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Add study area circle source and layer
      const circleData = createGeoJSONCircle(effectiveCenter, radiusKm);
      map.addSource('ocean-study-circle', {
        type: 'geojson',
        data: circleData as any,
      });

      map.addLayer({
        id: 'ocean-study-circle-fill',
        type: 'fill',
        source: 'ocean-study-circle',
        paint: {
          'fill-color': '#0d9488',
          'fill-opacity': 0.08,
        },
      });

      map.addLayer({
        id: 'ocean-study-circle-line',
        type: 'line',
        source: 'ocean-study-circle',
        paint: {
          'line-color': '#0d9488',
          'line-width': 1.5,
          'line-dasharray': [4, 3],
          'line-opacity': 0.7,
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update center and radius when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: effectiveCenter,
      zoom: radiusKm > 100 ? 7.0 : radiusKm > 45 ? 7.8 : 8.5,
      essential: true,
      duration: 1200,
    });

    const source = map.getSource('ocean-study-circle') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(createGeoJSONCircle(effectiveCenter, radiusKm) as any);
    }
  }, [effectiveCenter[0], effectiveCenter[1], radiusKm, mapReady]);

  // Render Buoy and Observation Stations
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stations.forEach((st) => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer relative';

      const isSelected = selectedStationId === st.id;

      // Color coding based on active layer
      let metricBadge = `${st.latest_sst.toFixed(1)}°C`;
      let badgeBg = 'bg-teal-600';
      if (activeLayer === 'waves') {
        metricBadge = `${st.wave_height.toFixed(2)}m`;
        badgeBg = 'bg-blue-600';
      } else if (activeLayer === 'currents') {
        metricBadge = `${st.current_speed.toFixed(2)}m/s`;
        badgeBg = 'bg-purple-600';
      }

      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="px-1.5 py-0.5 rounded-md ${badgeBg} text-white font-mono text-[10px] font-bold shadow-md ring-1 ring-white/50 mb-1 whitespace-nowrap">
            ${metricBadge}
          </div>
          <div class="w-6 h-6 rounded-full bg-white border-2 ${
            isSelected ? 'border-amber-500 scale-125' : 'border-teal-600'
          } shadow-md flex items-center justify-center text-[12px] transition-transform">
            ⚓
          </div>
        </div>
      `;

      el.onclick = () => {
        if (onSelectStation) onSelectStation(st);
      };

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
        <div class="p-2 text-xs font-sans text-slate-800 space-y-1">
          <div class="font-bold text-teal-800 text-[13px]">${st.name}</div>
          <div class="text-[10.5px] text-slate-500">${st.sector}</div>
          <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 border-t border-slate-200 text-[11px]">
            <span>SST: <b>${st.latest_sst.toFixed(2)} °C</b></span>
            <span>Waves: <b>${st.wave_height.toFixed(2)} m</b></span>
            <span>Current: <b>${st.current_speed.toFixed(2)} m/s</b></span>
            <span>Status: <b class="text-emerald-700 uppercase">${st.status}</b></span>
          </div>
          <div class="text-[9.5px] text-slate-400 font-mono mt-1">${st.latitude.toFixed(2)}°N, ${st.longitude.toFixed(2)}°E</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([st.longitude, st.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [stations, mapReady, activeLayer, selectedStationId]);

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] shadow-xs overflow-hidden flex flex-col h-[460px]">
      {/* Top Map Header & Controls */}
      <div className="p-3 bg-white border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[#0a1628]">Karnataka Coastal Shelf & Arabian Sea</h3>
            <span className="text-[10px] text-slate-400">Physical Oceanography & Numerical Models</span>
          </div>
        </div>

        {/* Layer Selector */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 px-1.5">Layer:</span>
          <button
            type="button"
            onClick={() => setActiveLayer('sst')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
              activeLayer === 'sst'
                ? 'bg-teal-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SST (°C)
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('waves')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
              activeLayer === 'waves'
                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waves (m)
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('currents')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
              activeLayer === 'currents'
                ? 'bg-purple-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current (m/s)
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full min-h-[380px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl p-2.5 shadow-md text-xs space-y-1.5 z-10 pointer-events-auto max-w-[240px]">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700">
            <span>{activeLayer === 'sst' ? 'Sea Surface Temp (°C)' : activeLayer === 'waves' ? 'Significant Wave (m)' : 'Current Speed (m/s)'}</span>
            <span className="text-[10px] text-teal-700">Active</span>
          </div>

          {activeLayer === 'sst' && (
            <div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-rose-500" />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>27.0°C (Upwelling)</span>
                <span>29.5°C</span>
                <span>31.5°C (Warm)</span>
              </div>
            </div>
          )}

          {activeLayer === 'waves' && (
            <div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-700" />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>0.5m (Calm)</span>
                <span>1.5m (Moderate)</span>
                <span>3.0m+ (Swell)</span>
              </div>
            </div>
          )}

          {activeLayer === 'currents' && (
            <div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-purple-300 via-purple-600 to-fuchsia-700" />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>0.05 m/s</span>
                <span>0.18 m/s</span>
                <span>0.35+ m/s (Jet)</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 pt-1 border-t border-slate-100">
            <span className="w-2 h-2 rounded-full border border-teal-600 bg-white" />
            <span>5 Moored Research Buoys & Observatories</span>
          </div>
        </div>
      </div>
    </div>
  );
};
