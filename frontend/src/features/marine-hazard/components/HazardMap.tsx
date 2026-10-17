import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, AlertCircle, RotateCcw } from 'lucide-react';
import { HazardTrackPoint } from '../types';

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
}

const DEFAULT_CENTER: [number, number] = [74.50, 13.85]; // Karnataka Coastal Shelf midpoint
const DEFAULT_ZOOM = 6.5;

const formatCoord = (lat: number | null | undefined, lon: number | null | undefined): string => {
  if (lat === null || lat === undefined || lon === null || lon === undefined || isNaN(lat) || isNaN(lon)) {
    return 'N/A';
  }
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
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
  stormId,
  basin,
  trackPoints,
  isLoading,
  selectedPointIndex,
  onSelectPoint,
  className = 'h-[460px]',
  source,
  activeAlertCount: _activeAlertCount = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

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

  const centerLat = validPoints.length > 0
    ? validPoints.reduce((acc, p) => acc + p.latitude, 0) / validPoints.length
    : DEFAULT_CENTER[1];
  const centerLon = validPoints.length > 0
    ? validPoints.reduce((acc, p) => acc + p.longitude, 0) / validPoints.length
    : DEFAULT_CENTER[0];

  // Initialize MapLibre GL instance matching Person 1 & Person 3 styling
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'ORCA Marine Hazard & Trajectory Tracking',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors • NOAA IBTrACS & GDACS',
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
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Create GeoJSON source for cyclone trajectory line
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

      // Ambient glow layer
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

      // Core trajectory line
      map.addLayer({
        id: 'hazard-track-core',
        type: 'line',
        source: 'hazard-cyclone-track',
        paint: {
          'line-color': '#ea580c',
          'line-width': 3,
          'line-dasharray': [1, 0],
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

  // Sync Trajectory GeoJSON and fit map view
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const coordinates = validPoints.map((p) => [p.longitude, p.latitude]);

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

    if (validPoints.length >= 2) {
      const bounds = new maplibregl.LngLatBounds();
      validPoints.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 8.5,
        duration: 900,
      });
    } else if (validPoints.length === 1) {
      map.flyTo({
        center: [validPoints[0].longitude, validPoints[0].latitude],
        zoom: 7.2,
        duration: 900,
      });
    } else {
      map.flyTo({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        duration: 800,
      });
    }
  }, [validPoints, mapReady]);

  // Sync HTML waypoint markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    validPoints.forEach((pt, idx) => {
      const isSelected = selectedPointIndex === idx;
      const isGenesis = idx === 0 && validPoints.length > 1;
      const isLatest = idx === validPoints.length - 1 && validPoints.length > 1;
      const color = getIntensityColor(pt.wind_speed_knots, pt.category);

      const el = document.createElement('div');
      el.className = 'group cursor-pointer relative';

      // Pin badge / dot
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

      const dateStr = pt.time ? new Date(pt.time).toUTCString() : 'N/A';
      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
        <div class="p-2 text-xs font-sans text-slate-800 space-y-1">
          <div class="font-bold text-orange-900 text-[12.5px]">${stormName}</div>
          <div class="text-[10px] text-slate-500">${dateStr}</div>
          <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 border-t border-slate-200 text-[11px]">
            <span>Wind: <b>${pt.wind_speed_knots !== null && pt.wind_speed_knots !== undefined ? `${pt.wind_speed_knots} kts` : '--'}</b></span>
            <span>Pressure: <b>${pt.pressure_hpa !== null && pt.pressure_hpa !== undefined ? `${pt.pressure_hpa} hPa` : '--'}</b></span>
            <span>Fix #: <b>#${idx + 1}</b></span>
            <span>Category: <b class="text-orange-700 capitalize">${pt.category || 'Observation'}</b></span>
          </div>
          <div class="text-[9.5px] text-slate-400 font-mono mt-1">${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pt.longitude, pt.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [validPoints, mapReady, selectedPointIndex, stormName, onSelectPoint]);

  const handleResetView = () => {
    if (!mapRef.current) return;
    if (validPoints.length >= 2) {
      const bounds = new maplibregl.LngLatBounds();
      validPoints.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      mapRef.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 8.5,
      });
    } else {
      mapRef.current.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  };

  return (
    <div className={`rounded-2xl bg-white border border-[#d8e4f0] shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Top Map Header matching Person 1 & Person 3 */}
      <div className="p-3 bg-white border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[#0a1628]">
              {stormName ? `${stormName} (${stormId})` : 'Marine Hazard & Trajectory Track'}
            </h3>
            <span className="text-[10px] text-slate-400">
              {validPoints.length > 0
                ? `${validPoints.length} Chronological Waypoint Fixes`
                : 'Geospatial Hazard Monitoring & Coastal Shelf Tracking'}
            </span>
          </div>
          {basin && (
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-orange-50 text-orange-700 border border-orange-200">
              {basin.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span className="hidden sm:inline font-mono text-[11px]">
            Center: {formatCoord(centerLat, centerLon)}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px]">
            {source ? `WGS84 • ${source}` : 'WGS84 • NOAA IBTrACS'}
          </span>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Reset Map Frame"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full min-h-[380px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="w-7 h-7 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-orange-950 mt-2 font-semibold">Resolving geospatial hazard points...</span>
          </div>
        )}

        {/* Zero Fixes Notification */}
        {validPoints.length === 0 && !isLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 shadow-sm z-20 flex items-center gap-2 pointer-events-auto">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Select a storm from the Cyclone Inventory to plot trajectory waypoints</span>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl p-2.5 shadow-md text-xs space-y-1.5 z-10 pointer-events-auto max-w-[260px]">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700">
            <span>Storm Intensity (IMD / Saffir-Simpson)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 via-amber-400 via-orange-500 to-red-600" />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
            <span>&lt;34kt (Depr)</span>
            <span>48kt (SCS)</span>
            <span>64kt (VSCS)</span>
            <span>90+kt (ESCS)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HazardMap;
