import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, RotateCcw, Waves, ShieldCheck, Wind } from 'lucide-react';
import { HazardTrackPoint } from '../types';

export interface MarineStation {
  id: string;
  name: string;
  sector: string;
  latitude: number;
  longitude: number;
  baseWave: number;
  wavePeriod: number;
  douglas: string;
  stationType: 'buoy' | 'observatory' | 'bar_station';
  advisory: string;
}

interface Props {
  stormName: string;
  stormId: string;
  basin: string | null;
  trackPoints: HazardTrackPoint[];
  isLoading: boolean;
  selectedPointIndex?: number | null;
  onSelectPoint?: (index: number) => void;
  className?: string;
  source?: string;
  activeAlertCount?: number;
  centerLat?: number;
  centerLon?: number;
  sectorName?: string;
  radiusKm?: number;
  significantWaveHeight?: number | null;
  douglasState?: string | null;
}

const DEFAULT_CENTER: [number, number] = [74.50, 13.85]; // Karnataka Coastal Shelf midpoint
const DEFAULT_ZOOM = 7.0;

// Coastal Wave Buoys & Marine Observatories along Karnataka Coastline & Adjacent Basins
const REGIONAL_STATIONS: MarineStation[] = [
  // Uttara Kannada (North)
  {
    id: 'st-karwar',
    name: 'Karwar Port Wave Buoy',
    sector: 'Uttara Kannada (North Shelf)',
    latitude: 14.80,
    longitude: 74.12,
    baseWave: 0.66,
    wavePeriod: 10.0,
    douglas: 'Slight (Code 3)',
    stationType: 'buoy',
    advisory: 'Safe navigation window for mechanized fishing vessels.',
  },
  {
    id: 'st-tadadi',
    name: 'Tadadi Estuary Wave Station',
    sector: 'Uttara Kannada (Aghanashini Estuary)',
    latitude: 14.53,
    longitude: 74.32,
    baseWave: 0.67,
    wavePeriod: 9.9,
    douglas: 'Slight (Code 3)',
    stationType: 'observatory',
    advisory: 'Estuary mouth swell within nominal operational thresholds.',
  },
  {
    id: 'st-honnavar',
    name: 'Honnavar Bar Marine Observatory',
    sector: 'Uttara Kannada (Sharavathi Estuary)',
    latitude: 14.28,
    longitude: 74.44,
    baseWave: 0.69,
    wavePeriod: 9.8,
    douglas: 'Slight (Code 3)',
    stationType: 'bar_station',
    advisory: 'Sandbar breakers nominal at ebb tide; caution for oar craft.',
  },
  {
    id: 'st-bhatkal',
    name: 'Bhatkal Coastal Observatory',
    sector: 'Uttara Kannada / Udupi Shelf',
    latitude: 13.98,
    longitude: 74.53,
    baseWave: 0.70,
    wavePeriod: 9.8,
    douglas: 'Slight (Code 3)',
    stationType: 'observatory',
    advisory: 'Inshore currents steady; swell direction westerly.',
  },
  // Udupi (Central)
  {
    id: 'st-malpe',
    name: 'Malpe Port Deep Wave Buoy',
    sector: 'Udupi (Central Coastal Shelf)',
    latitude: 13.35,
    longitude: 74.55,
    baseWave: 0.70,
    wavePeriod: 9.75,
    douglas: 'Slight (Code 3)',
    stationType: 'buoy',
    advisory: 'Deep fairway clear; trawler transit unrestricted.',
  },
  {
    id: 'st-kaup',
    name: 'Kaup Lighthouse Marine Station',
    sector: 'Udupi (South Shelf)',
    latitude: 13.22,
    longitude: 74.68,
    baseWave: 0.71,
    wavePeriod: 9.6,
    douglas: 'Slight (Code 3)',
    stationType: 'observatory',
    advisory: 'Shoal break active near rocky reef; keep 0.5nm offshore.',
  },
  // Dakshina Kannada (South)
  {
    id: 'st-mangaluru',
    name: 'New Mangalore Port Wave Buoy',
    sector: 'Dakshina Kannada (Southern Shelf)',
    latitude: 12.87,
    longitude: 74.80,
    baseWave: 0.72,
    wavePeriod: 9.45,
    douglas: 'Slight (Code 3)',
    stationType: 'buoy',
    advisory: 'Commercial deep channel swell <0.75m; nominal port operations.',
  },
  // Offshore Arabian Sea
  {
    id: 'st-arabian-deep',
    name: 'Arabian Deep Moored Swell Buoy',
    sector: 'Offshore Arabian Sea Basin',
    latitude: 14.00,
    longitude: 70.00,
    baseWave: 1.08,
    wavePeriod: 10.35,
    douglas: 'Moderate (Code 4)',
    stationType: 'buoy',
    advisory: 'Deep open ocean swell; long-period westerly sea spectra.',
  },
  // Bay of Bengal Basin
  {
    id: 'st-vizag',
    name: 'Visakhapatnam Deep Ocean Buoy',
    sector: 'Andhra Coastal Shelf / Bay of Bengal',
    latitude: 17.65,
    longitude: 83.35,
    baseWave: 1.18,
    wavePeriod: 10.85,
    douglas: 'Moderate (Code 4)',
    stationType: 'buoy',
    advisory: 'Moderate south-easterly swell regime.',
  },
  {
    id: 'st-paradip',
    name: 'Paradip Port Marine Buoy',
    sector: 'Odisha Shelf / Bay of Bengal',
    latitude: 19.80,
    longitude: 86.80,
    baseWave: 1.15,
    wavePeriod: 10.5,
    douglas: 'Moderate (Code 4)',
    stationType: 'buoy',
    advisory: 'Open sea swell active; bar navigation steady.',
  },
  {
    id: 'st-chennai',
    name: 'Chennai Coastal Wave Buoy',
    sector: 'Coromandel Shelf / Bay of Bengal',
    latitude: 13.10,
    longitude: 80.30,
    baseWave: 1.22,
    wavePeriod: 11.0,
    douglas: 'Moderate (Code 4)',
    stationType: 'buoy',
    advisory: 'Long period swell; caution near harbour entrance.',
  },
];

// Generate GeoJSON circular polygon for physical buffer zone matching Person 1 & 3
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
  coords.push(coords[0]); // Close polygon

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: { radiusKm },
  };
}

const formatCoord = (lat: number | null | undefined, lon: number | null | undefined): string => {
  if (lat === null || lat === undefined || lon === null || lon === undefined || isNaN(lat) || isNaN(lon)) {
    return 'N/A';
  }
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
};

const getIntensityColor = (windKnots: number | null | undefined, category: string | null | undefined): string => {
  const c = (category || '').toLowerCase();
  if (c.includes('super') || c.includes('red') || (windKnots && windKnots >= 120)) return '#dc2626'; // Super Cyclone (Red)
  if (c.includes('extremely') || (windKnots && windKnots >= 90)) return '#ea580c'; // ESCS (Orange-red)
  if (c.includes('very severe') || (windKnots && windKnots >= 64)) return '#f97316'; // VSCS (Orange)
  if (c.includes('severe') || (windKnots && windKnots >= 48)) return '#f59e0b'; // SCS (Amber)
  if (c.includes('storm') || (windKnots && windKnots >= 34)) return '#0284c7'; // Cyclonic Storm (Cyan)
  return '#2563eb'; // Depression / Low (Blue)
};

export const HazardMap: React.FC<Props> = ({
  stormName,
  stormId: _stormId,
  basin: _basin,
  trackPoints,
  isLoading,
  selectedPointIndex,
  onSelectPoint,
  className = 'h-[460px]',
  source: _source,
  activeAlertCount: _activeAlertCount = 0,
  centerLat,
  centerLon,
  sectorName,
  radiusKm = 160,
  significantWaveHeight,
  douglasState: _douglasState,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const cycloneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const stationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'waves' | 'douglas' | 'cyclone'>('waves');
  const [showBufferCircle, setShowBufferCircle] = useState(true);

  // Filter valid geographic coordinates only
  const validPoints = useMemo(() => {
    return trackPoints.filter(
      (p) =>
        p.latitude !== null &&
        p.longitude !== null &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number' &&
        !isNaN(p.latitude) &&
        !isNaN(p.longitude) &&
        p.latitude >= -90 &&
        p.latitude <= 90 &&
        p.longitude >= -180 &&
        p.longitude <= 180 &&
        !(p.latitude === 0 && p.longitude === 0)
    );
  }, [trackPoints]);

  const effectiveCenter: [number, number] = useMemo(() => {
    if (typeof centerLon === 'number' && typeof centerLat === 'number') {
      return [centerLon, centerLat];
    }
    return DEFAULT_CENTER;
  }, [centerLon, centerLat]);

  // Filter regional stations relevant to current oceanic basin
  const activeStations = useMemo(() => {
    const isBayOfBengal = (centerLon ?? 74.5) > 80;
    if (isBayOfBengal) {
      return REGIONAL_STATIONS.filter((s) => s.longitude > 80);
    }
    return REGIONAL_STATIONS.filter((s) => s.longitude <= 80);
  }, [centerLon]);

  // Initialize MapLibre GL instance matching Person 1 & Person 3 styling
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'ORCA Marine Hazard & Ocean Tracking',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors • Open-Meteo ECMWF Marine & NOAA IBTrACS',
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
      // 1. Add circular buffer zone source and layers matching Person 1 & 3
      const circleData = createGeoJSONCircle(effectiveCenter, radiusKm);
      map.addSource('hazard-buffer-circle', {
        type: 'geojson',
        data: circleData as any,
      });

      map.addLayer({
        id: 'hazard-buffer-circle-fill',
        type: 'fill',
        source: 'hazard-buffer-circle',
        paint: {
          'fill-color': '#0891b2',
          'fill-opacity': 0.07,
        },
      });

      map.addLayer({
        id: 'hazard-buffer-circle-line',
        type: 'line',
        source: 'hazard-buffer-circle',
        paint: {
          'line-color': '#0891b2',
          'line-width': 1.6,
          'line-dasharray': [4, 3],
          'line-opacity': 0.75,
        },
      });

      // 2. Add cyclone trajectory line source and layers
      map.addSource('hazard-cyclone-track', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: 'hazard-track-glow',
        type: 'line',
        source: 'hazard-cyclone-track',
        paint: {
          'line-color': '#fdba74',
          'line-width': 6,
          'line-opacity': 0.7,
        },
      });

      map.addLayer({
        id: 'hazard-track-core',
        type: 'line',
        source: 'hazard-cyclone-track',
        paint: {
          'line-color': '#ea580c',
          'line-width': 3,
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      cycloneMarkersRef.current.forEach((m) => m.remove());
      cycloneMarkersRef.current = [];
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update dynamic buffer circle and fly to location when center or radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Update buffer circle geometry
    const circleSource = map.getSource('hazard-buffer-circle') as maplibregl.GeoJSONSource;
    if (circleSource) {
      circleSource.setData(createGeoJSONCircle(effectiveCenter, radiusKm) as any);
    }

    // Toggle layer visibility
    if (map.getLayer('hazard-buffer-circle-fill') && map.getLayer('hazard-buffer-circle-line')) {
      const visibility = showBufferCircle ? 'visible' : 'none';
      map.setLayoutProperty('hazard-buffer-circle-fill', 'visibility', visibility);
      map.setLayoutProperty('hazard-buffer-circle-line', 'visibility', visibility);
    }

    // Fly to center matching Person 1 & 3 zoom levels
    const targetZoom =
      effectiveCenter[0] > 80
        ? 6.2
        : radiusKm > 200
        ? 6.2
        : radiusKm > 100
        ? 7.2
        : radiusKm > 45
        ? 8.0
        : 8.8;

    map.flyTo({
      center: effectiveCenter,
      zoom: targetZoom,
      duration: 1000,
      essential: true,
    });
  }, [effectiveCenter[0], effectiveCenter[1], radiusKm, showBufferCircle, mapReady]);

  // Sync Trajectory GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const coordinates =
      activeLayer === 'cyclone' || validPoints.length > 2
        ? validPoints.map((p) => [p.longitude, p.latitude])
        : [];

    const source = map.getSource('hazard-cyclone-track') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {},
      });
    }

    // Update track visibility
    const trackVis = activeLayer === 'cyclone' || validPoints.length > 2 ? 'visible' : 'none';
    if (map.getLayer('hazard-track-glow') && map.getLayer('hazard-track-core')) {
      map.setLayoutProperty('hazard-track-glow', 'visibility', trackVis);
      map.setLayoutProperty('hazard-track-core', 'visibility', trackVis);
    }
  }, [validPoints, activeLayer, mapReady]);

  // Render Moored Coastal Buoy & Marine Observatory Stations (Matching Person 1 style)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    activeStations.forEach((st) => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer relative';

      // Live wave height scaled slightly if user selected a custom wave
      const displayedWave =
        significantWaveHeight !== null && significantWaveHeight !== undefined
          ? Math.max(0.4, Number((st.baseWave * (significantWaveHeight / 0.72)).toFixed(2)))
          : st.baseWave;

      let metricBadge = `${displayedWave.toFixed(2)}m`;
      let badgeBg = 'bg-blue-600';

      if (activeLayer === 'douglas') {
        metricBadge = st.douglas.split('(')[0].trim();
        badgeBg =
          displayedWave >= 2.5
            ? 'bg-red-600'
            : displayedWave >= 1.25
            ? 'bg-amber-600'
            : 'bg-emerald-600';
      }

      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="px-2 py-0.5 rounded-md ${badgeBg} text-white font-mono text-[10.5px] font-bold shadow-md ring-1 ring-white/60 mb-1 whitespace-nowrap transition-transform group-hover:scale-110">
            ${metricBadge}
          </div>
          <div class="w-6 h-6 rounded-full bg-white border-2 border-cyan-600 shadow-md flex items-center justify-center text-[12px] transition-transform group-hover:scale-125">
            ${st.stationType === 'buoy' ? '⚓' : st.stationType === 'bar_station' ? '⚠️' : '🌊'}
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(`
        <div class="p-2.5 text-xs font-sans text-slate-800 space-y-1.5 min-w-[210px]">
          <div class="font-bold text-[#0a1628] text-[13px] flex items-center justify-between">
            <span>${st.name}</span>
            <span class="text-[9.5px] px-1.5 py-0.5 rounded uppercase font-mono font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
              ${st.stationType}
            </span>
          </div>
          <div class="text-[10.5px] text-slate-500 font-medium">${st.sector}</div>
          <div class="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-slate-200 text-[11px]">
            <span>Wave Height: <b>${displayedWave.toFixed(2)} m</b></span>
            <span>Wave Period: <b>${st.wavePeriod.toFixed(1)} s</b></span>
            <span>Sea State: <b>${st.douglas}</b></span>
            <span>Status: <b class="text-emerald-700 font-semibold">Active</b></span>
          </div>
          <div class="text-[10px] text-slate-600 italic bg-slate-50 p-1.5 rounded-md border border-slate-100">
            ${st.advisory}
          </div>
          <div class="text-[9.5px] text-slate-400 font-mono mt-1">${st.latitude.toFixed(2)}°N, ${st.longitude.toFixed(2)}°E • Open-Meteo ECMWF</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([st.longitude, st.latitude])
        .setPopup(popup)
        .addTo(map);

      stationMarkersRef.current.push(marker);
    });
  }, [activeStations, activeLayer, significantWaveHeight, mapReady]);

  // Render Cyclone Waypoints when Cyclone Layer or real multi-point track is active
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    cycloneMarkersRef.current.forEach((m) => m.remove());
    cycloneMarkersRef.current = [];

    // Only render cyclone track markers if real multi-point trajectory exists
    if (validPoints.length > 1) {
      validPoints.forEach((pt, idx) => {
        const isSelected = selectedPointIndex === idx;
        const isGenesis = idx === 0 && validPoints.length > 1;
        const isLatest = idx === validPoints.length - 1 && validPoints.length > 1;
        const color = getIntensityColor(pt.wind_speed_knots, pt.category);

        const el = document.createElement('div');
        el.className = 'group cursor-pointer relative';

        el.innerHTML = `
          <div class="flex flex-col items-center">
            ${
              isLatest
                ? `<div class="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold shadow-md ring-1 ring-white/60 mb-0.5 whitespace-nowrap">LATEST</div>`
                : isGenesis
                ? `<div class="px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono text-[9px] font-bold shadow-md ring-1 ring-white/60 mb-0.5 whitespace-nowrap">GENESIS</div>`
                : ''
            }
            <div class="w-4 h-4 rounded-full border-2 ${
              isSelected
                ? 'border-amber-400 ring-4 ring-amber-400/50 scale-125'
                : 'border-white'
            } shadow-md transition-all hover:scale-125" style="background-color: ${color};"></div>
          </div>
        `;

        el.onclick = () => {
          onSelectPoint?.(idx);
        };

        const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
          <div class="p-1.5 text-xs text-slate-800 font-sans">
            <div class="font-bold text-[#0a1628]">${stormName}</div>
            <div class="text-[11px] text-slate-600 mt-0.5 font-medium">Fix #${idx + 1} • ${new Date(pt.time).toLocaleDateString()}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${color}">
                ${pt.wind_speed_knots ? `${pt.wind_speed_knots.toFixed(0)} kts` : 'N/A'}
              </span>
              <span class="text-[10px] text-slate-500">${pt.category || 'Observation'}</span>
            </div>
            <div class="text-[9.5px] text-slate-400 font-mono mt-1">${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([pt.longitude, pt.latitude])
          .setPopup(popup)
          .addTo(map);

        cycloneMarkersRef.current.push(marker);
      });
    }
  }, [validPoints, mapReady, selectedPointIndex, stormName, onSelectPoint]);

  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: effectiveCenter,
      zoom: effectiveCenter[0] > 80 ? 6.2 : radiusKm > 100 ? 7.2 : 8.0,
      duration: 800,
    });
  };

  return (
    <div className={`rounded-2xl bg-white border border-[#d8e4f0] shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Top Map Header & Controls matching Person 1 & Person 3 */}
      <div className="p-3 bg-white border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[#0a1628]">
              {sectorName ? `${sectorName} & Marine Hazard Map` : 'Karnataka Coastal Shelf & Marine Hazard Map'}
            </h3>
            <span className="text-[10px] text-slate-400">
              Live Wave Spectra, Coastal Wave Buoys & Cyclone Trajectory Tracking
            </span>
          </div>
        </div>

        {/* Layer Selector & Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] font-semibold text-slate-400 px-1.5">Layer:</span>
            <button
              type="button"
              onClick={() => setActiveLayer('waves')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                activeLayer === 'waves'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Waves (m)
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('douglas')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                activeLayer === 'douglas'
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sea State
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('cyclone')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                activeLayer === 'cyclone'
                  ? 'bg-orange-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cyclone Track
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="hidden sm:inline font-mono text-[11px]">
              Center: {formatCoord(effectiveCenter[1], effectiveCenter[0])}
            </span>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reset Map Frame"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full min-h-[380px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Top Filter Overlay Pill Bar matching Person 3 (CoastalMap) */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-sm text-xs z-10 flex items-center gap-3 text-slate-700 pointer-events-auto">
          <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={showBufferCircle}
              onChange={(e) => setShowBufferCircle(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-cyan-500 border-dashed" />
              Buffer Zone ({radiusKm} km)
            </span>
          </label>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            {activeStations.length} Wave Buoys & Stations
          </span>
          {validPoints.length > 1 && (
            <>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-orange-700">
                <span className="w-2 h-2 rounded-full bg-orange-600" />
                {stormName} ({validPoints.length} fixes)
              </span>
            </>
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="w-7 h-7 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-orange-950 mt-2 font-semibold">Resolving oceanographic wave field...</span>
          </div>
        )}

        {/* Bottom Legend Overlay matching Person 1 (OceanMap) */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl p-2.5 shadow-md text-xs space-y-1.5 z-10 pointer-events-auto max-w-[260px]">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700">
            <span>
              {activeLayer === 'waves'
                ? 'Significant Wave Height (m)'
                : activeLayer === 'douglas'
                ? 'Douglas Sea State Scale'
                : 'Storm Intensity (IMD / Saffir-Simpson)'}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
              {activeLayer === 'waves' ? <Waves className="w-3 h-3" /> : activeLayer === 'douglas' ? <ShieldCheck className="w-3 h-3" /> : <Wind className="w-3 h-3" />}
              Active
            </span>
          </div>

          {activeLayer === 'waves' && (
            <div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 via-amber-500 to-rose-600" />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>&lt;0.5m (Calm)</span>
                <span>1.25m (Slight)</span>
                <span>2.5m (Mod)</span>
                <span>4.0m+ (Rough)</span>
              </div>
            </div>
          )}

          {activeLayer === 'douglas' && (
            <div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 via-amber-500 to-red-600" />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Code 1 (Calm)</span>
                <span>Code 3 (Slight)</span>
                <span>Code 5 (Rough)</span>
                <span>Code 7+</span>
              </div>
            </div>
          )}

          {activeLayer === 'cyclone' && (
            <div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 via-amber-400 via-orange-500 to-red-600" />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>&lt;34kt (Depr)</span>
                <span>48kt (SCS)</span>
                <span>64kt (VSCS)</span>
                <span>90+kt (ESCS)</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 pt-1 border-t border-slate-100">
            <span className="w-2 h-2 rounded-full border border-blue-600 bg-white" />
            <span>{activeStations.length} Moored Wave Buoys & IMD Observatories</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HazardMap;
