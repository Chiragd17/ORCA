import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react';

export type MapMode = 'fisherman' | 'marine-monitoring' | 'protected-areas' | 'coastal-authority' | 'disaster-management';
export type TileStyle = 'vector' | 'satellite' | 'ocean';

interface Props {
  mode: MapMode;
  height?: string;
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  highlightSector?: string | null;
  interactive?: boolean;
  onMarkerClick?: (name: string, details: any) => void;
}

const TILE_SOURCES: Record<TileStyle, { url: string; attribution: string; name: string }> = {
  vector: {
    name: 'Street / Nav',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  },
  ocean: {
    name: 'Ocean / Bathymetry',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri Ocean Basemap',
  },
};

// Key coastal coordinates along Karnataka corridor (320km)
const KARNATAKA_LOCATIONS = [
  { id: 'karwar', name: 'Karwar Port', lat: 14.815, lon: 74.128, type: 'port', status: 'Operational', safe: true },
  { id: 'gokarna', name: 'Gokarna Coastal Sanctuary', lat: 14.545, lon: 74.316, type: 'protected', status: 'Eco-sensitive', safe: true },
  { id: 'kumta', name: 'Kumta Estuary', lat: 14.432, lon: 74.418, type: 'harbour', status: 'Operational', safe: true },
  { id: 'honnavar', name: 'Sharavathi Mangroves', lat: 14.283, lon: 74.445, type: 'mangrove', status: 'Protected', safe: true },
  { id: 'bhatkal', name: 'Bhatkal Light & Harbour', lat: 13.985, lon: 74.548, type: 'harbour', status: 'Operational', safe: true },
  { id: 'kundapura', name: 'Kundapura Estuarine Zone', lat: 13.630, lon: 74.685, type: 'mangrove', status: 'Protected', safe: true },
  { id: 'st_marys', name: "St. Mary's Islands", lat: 13.380, lon: 74.673, type: 'protected', status: 'Geo-heritage', safe: true },
  { id: 'malpe', name: 'Malpe Fishing Harbour', lat: 13.355, lon: 74.700, type: 'harbour', status: 'Operational', safe: true },
  { id: 'udupi_hosp', name: 'Udupi District Hospital', lat: 13.342, lon: 74.747, type: 'hospital', status: 'Operational', safe: true },
  { id: 'surathkal', name: 'Surathkal Harbour', lat: 13.010, lon: 74.792, type: 'harbour', status: 'Safe (14.2 km)', safe: true },
  { id: 'new_mangalore', name: 'New Mangalore Deep Port', lat: 12.935, lon: 74.812, type: 'port', status: 'Operational', safe: true },
  { id: 'wenlock', name: 'District Wenlock Hospital', lat: 12.868, lon: 74.845, type: 'hospital', status: 'Critical Care', safe: true },
  { id: 'mangaluru', name: 'Mangaluru Old Harbour', lat: 12.858, lon: 74.836, type: 'harbour', status: 'Safe (2.4 km)', safe: true },
  { id: 'netravati', name: 'Netravati-Gurupuru Mangroves', lat: 12.842, lon: 74.856, type: 'mangrove', status: 'Ecosystem Reserve', safe: true },
  { id: 'ullal', name: 'Ullal Sea Front & Harbour', lat: 12.805, lon: 74.852, type: 'harbour', status: 'Safe (8.7 km)', safe: true },
];

export const WorkspaceMapViewer: React.FC<Props> = ({
  mode,
  height = '420px',
  center = [74.50, 13.85],
  zoom = 7.6,
  highlightSector = null,
  onMarkerClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [activeTile, setActiveTile] = useState<TileStyle>('vector');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        name: 'ORCA Workspace Map',
        sources: {
          'base-tile': {
            type: 'raster',
            tiles: [TILE_SOURCES[activeTile].url],
            tileSize: 256,
            attribution: TILE_SOURCES[activeTile].attribution,
          },
        },
        layers: [
          {
            id: 'base-layer',
            type: 'raster',
            source: 'base-tile',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: center,
      zoom: zoom,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
    };
  }, []);

  // Update base tile when layer changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    try {
      if (map.getSource('base-tile')) {
        map.removeLayer('base-layer');
        map.removeSource('base-tile');
      }

      map.addSource('base-tile', {
        type: 'raster',
        tiles: [TILE_SOURCES[activeTile].url],
        tileSize: 256,
        attribution: TILE_SOURCES[activeTile].attribution,
      });

      map.addLayer(
        {
          id: 'base-layer',
          type: 'raster',
          source: 'base-tile',
          minzoom: 0,
          maxzoom: 19,
        },
        map.getLayersOrder()[0] // render underneath any vector shapes
      );
    } catch (e) {
      console.warn('Tile layer switch glitch:', e);
    }
  }, [activeTile, mapLoaded]);

  // Render workspace-specific overlays (Fishing zones, Heatmap, Protected polygons, Cyclone tracks)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter relevant locations by workspace mode
    let targetLocs = KARNATAKA_LOCATIONS;
    if (mode === 'fisherman') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'harbour' || l.type === 'port');
    } else if (mode === 'protected-areas') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'mangrove' || l.type === 'protected');
    } else if (mode === 'coastal-authority') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'port' || l.type === 'hospital' || l.type === 'harbour');
    }

    targetLocs.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer';

      let bgBadge = 'bg-blue-600';
      let iconEmoji = '⚓';
      if (loc.type === 'port') {
        bgBadge = 'bg-indigo-600';
        iconEmoji = '🚢';
      } else if (loc.type === 'protected' || loc.type === 'mangrove') {
        bgBadge = 'bg-emerald-600';
        iconEmoji = '🌿';
      } else if (loc.type === 'hospital') {
        bgBadge = 'bg-rose-600';
        iconEmoji = '🏥';
      }

      const isHighlighted = highlightSector && loc.name.toLowerCase().includes(highlightSector.toLowerCase());

      el.innerHTML = `
        <div class="w-7 h-7 rounded-full ${bgBadge} ${isHighlighted ? 'ring-4 ring-amber-400 animate-bounce' : 'ring-2 ring-white'} text-white shadow-md flex items-center justify-center text-xs transition-transform hover:scale-125">
          ${iconEmoji}
        </div>
      `;

      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(loc.name, loc);
        }
      });

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="padding: 6px 10px; font-family: sans-serif; font-size: 11px; color: #0a1628;">
          <strong style="display:block; font-size: 12px; margin-bottom: 2px;">${loc.name}</strong>
          <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1;">
            ${loc.status}
          </span>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 10px;">
            Coords: ${loc.lat}°N, ${loc.lon}°E
          </p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.lon, loc.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add Polygon Layers based on Mode
    try {
      // 1. Fisherman Safe & Caution Zones
      if (mode === 'fisherman') {
        const safeZoneGeo: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [74.30, 13.20],
                [74.75, 13.20],
                [74.82, 12.80],
                [74.40, 12.80],
                [74.30, 13.20],
              ],
            ],
          },
        };

        if (map.getSource('fishing-safe-zone')) {
          (map.getSource('fishing-safe-zone') as maplibregl.GeoJSONSource).setData(safeZoneGeo);
        } else {
          map.addSource('fishing-safe-zone', { type: 'geojson', data: safeZoneGeo });
          map.addLayer({
            id: 'fishing-safe-fill',
            type: 'fill',
            source: 'fishing-safe-zone',
            paint: {
              'fill-color': '#0284c7',
              'fill-opacity': 0.22,
            },
          });
          map.addLayer({
            id: 'fishing-safe-line',
            type: 'line',
            source: 'fishing-safe-zone',
            paint: {
              'line-color': '#0284c7',
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });
        }
      }

      // 2. Disaster Management Historical Cyclone Tracks
      if (mode === 'disaster-management') {
        const tauktaeTrackGeo: any = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [73.2, 11.8],
              [73.8, 12.9],
              [74.2, 14.1],
              [74.5, 15.3],
              [73.9, 16.8],
              [72.8, 18.9],
            ],
          },
        };

        if (map.getSource('tauktae-track')) {
          (map.getSource('tauktae-track') as maplibregl.GeoJSONSource).setData(tauktaeTrackGeo);
        } else {
          map.addSource('tauktae-track', { type: 'geojson', data: tauktaeTrackGeo });
          map.addLayer({
            id: 'tauktae-track-line',
            type: 'line',
            source: 'tauktae-track',
            paint: {
              'line-color': '#ef4444',
              'line-width': 3,
            },
          });
        }
      }

      // 3. Coastal Authority 30km Hazard Radius
      if (mode === 'coastal-authority') {
        const coords: [number, number][] = [];
        const [lon, lat] = [74.812, 12.935];
        const radKm = 30;
        const dX = radKm / (111.32 * Math.cos((lat * Math.PI) / 180));
        const dY = radKm / 110.574;
        for (let i = 0; i < 64; i++) {
          const theta = (i / 64) * (2 * Math.PI);
          coords.push([lon + dX * Math.cos(theta), lat + dY * Math.sin(theta)]);
        }
        coords.push(coords[0]);

        const hazardGeo: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
        };

        if (map.getSource('coastal-hazard-zone')) {
          (map.getSource('coastal-hazard-zone') as maplibregl.GeoJSONSource).setData(hazardGeo);
        } else {
          map.addSource('coastal-hazard-zone', { type: 'geojson', data: hazardGeo });
          map.addLayer({
            id: 'coastal-hazard-fill',
            type: 'fill',
            source: 'coastal-hazard-zone',
            paint: {
              'fill-color': '#f97316',
              'fill-opacity': 0.18,
            },
          });
          map.addLayer({
            id: 'coastal-hazard-line',
            type: 'line',
            source: 'coastal-hazard-zone',
            paint: {
              'line-color': '#ea580c',
              'line-width': 2,
            },
          });
        }
      }
    } catch (e) {
      console.warn('Map overlay sync:', e);
    }
  }, [mode, mapLoaded, highlightSector]);

  // Zoom handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => {
    mapRef.current?.flyTo({ center: center, zoom: zoom });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#d8e4f0] bg-slate-100 shadow-2xs" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center"
            title="Switch Map Layers"
          >
            <Layers className="w-4 h-4" />
          </button>

          {layerMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white border border-[#d8e4f0] shadow-lg p-1.5 z-20 space-y-1 text-xs">
              {(Object.keys(TILE_SOURCES) as TileStyle[]).map(key => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTile(key);
                    setLayerMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between ${
                    activeTile === key
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{TILE_SOURCES[key].name}</span>
                  {activeTile === key && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Legend Bottom-Left */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur border border-[#d8e4f0] rounded-xl px-3 py-2 text-[10.5px] text-slate-700 shadow-xs z-10 flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold text-[#0a1628]">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Karnataka 320km Coast</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-2">
          {mode === 'fisherman' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Safe Zone</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Harbours</span>
            </>
          )}
          {mode === 'marine-monitoring' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Telemetry Buoys</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Heatmap</span>
            </>
          )}
          {mode === 'protected-areas' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> MPAs / Mangroves</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Sanctuaries</span>
            </>
          )}
          {mode === 'coastal-authority' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Ports</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 30km Hazard Zone</span>
            </>
          )}
          {mode === 'disaster-management' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-600" /> Cyclone Tracks</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Surge Inundation</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
