import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Compass, Radio } from 'lucide-react';

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

// Rich coastal stations, oceanographic buoys, and emergency points
const KARNATAKA_LOCATIONS = [
  // Harbours & Ports
  { id: 'karwar', name: 'Karwar Port & Naval Base', lat: 14.815, lon: 74.128, type: 'port', status: 'Operational', safe: true, info: 'Safe for commercial & motorized vessels. Wave 0.74m' },
  { id: 'kumta', name: 'Kumta Fishing Harbour', lat: 14.432, lon: 74.418, type: 'harbour', status: 'Operational', safe: true, info: 'Calm nearshore swell. Cleared for traditional craft.' },
  { id: 'bhatkal', name: 'Bhatkal Light & Harbour', lat: 13.985, lon: 74.548, type: 'harbour', status: 'Operational', safe: true, info: 'Swell 0.65m. All craft operational.' },
  { id: 'malpe', name: 'Malpe Deep Fishing Harbour', lat: 13.355, lon: 74.700, type: 'harbour', status: 'Operational', safe: true, info: 'Primary hub. 0.62m wave. Cleared for trawlers & gillnetters.' },
  { id: 'surathkal', name: 'Surathkal Harbour & Coast', lat: 13.010, lon: 74.792, type: 'harbour', status: 'Operational', safe: true, info: 'Safe (0.64m wave). Inshore operations cleared.' },
  { id: 'new_mangalore', name: 'New Mangalore Deep Port', lat: 12.935, lon: 74.812, type: 'port', status: 'Operational', safe: true, info: 'Zero draft restrictions. Channels clear.' },
  { id: 'mangaluru', name: 'Mangaluru Old Port (Bunder)', lat: 12.858, lon: 74.836, type: 'harbour', status: 'Operational', safe: true, info: 'Netravati mouth. Calm swell 0.62m.' },
  { id: 'ullal', name: 'Ullal Sea Front & Breakwater', lat: 12.805, lon: 74.852, type: 'harbour', status: 'Operational', safe: true, info: 'Wave attenuation normal. Safe for small craft.' },

  // Live Oceanographic Telemetry Buoys (Open-Meteo & INCOIS)
  { id: 'buoy_malpe', name: 'Malpe Inshore Buoy #04', lat: 13.380, lon: 74.520, type: 'buoy', status: '🟢 Calm / Safe', safe: true, info: 'Wave: 0.69m | SST: 30.75°C | Current: 0.07 m/s | Wind: 8.2 kt' },
  { id: 'buoy_mangalore', name: 'Mangaluru Deep Buoy #02', lat: 12.850, lon: 74.650, type: 'buoy', status: '🟢 Calm / Safe', safe: true, info: 'Wave: 0.64m | SST: 30.80°C | Current: 0.08 m/s | Wind: 7.9 kt' },
  { id: 'buoy_karwar', name: 'Karwar Offshore Buoy #01', lat: 14.800, lon: 73.950, type: 'buoy', status: '🟢 Calm / Safe', safe: true, info: 'Wave: 0.74m | SST: 30.60°C | Current: 0.09 m/s | Wind: 9.1 kt' },
  { id: 'buoy_bhatkal', name: 'Bhatkal Coastal Buoy #03', lat: 13.980, lon: 74.380, type: 'buoy', status: '🟢 Calm / Safe', safe: true, info: 'Wave: 0.67m | SST: 30.70°C | Current: 0.07 m/s | Wind: 8.5 kt' },

  // Cyclone Tauktae Track Nodes
  { id: 'cyclone_c1', name: 'Tauktae Cat 1 Node', lat: 11.800, lon: 73.200, type: 'cyclone', status: 'Cat 1 (65 kt)', safe: false, info: 'Wind: 120 km/h | Swell: 3.2m | Direction: NNW' },
  { id: 'cyclone_c2', name: 'Tauktae Cat 2 Node', lat: 12.900, lon: 73.800, type: 'cyclone', status: 'Cat 2 (90 kt)', safe: false, info: 'Wind: 165 km/h | Swell: 4.5m | 110km off Mangaluru' },
  { id: 'cyclone_c3', name: 'Tauktae Cat 3 Node (Peak Approach)', lat: 14.100, lon: 74.200, type: 'cyclone', status: 'Cat 3 (115 kt)', safe: false, info: 'Wind: 215 km/h | Peak Wave: 5.8m | 75km off Bhatkal' },
  { id: 'cyclone_c4', name: 'Tauktae Cat 4 Node', lat: 15.300, lon: 74.500, type: 'cyclone', status: 'Cat 4 (120 kt)', safe: false, info: 'Wind: 225 km/h | Severe Cyclone | Heavy Gale' },

  // Emergency Shelters & Hospitals
  { id: 'wenlock', name: 'District Wenlock Hospital', lat: 12.868, lon: 74.845, type: 'hospital', status: 'Emergency Trauma Hub', safe: true, info: 'Triage Ready • 450 Emergency Beds' },
  { id: 'udupi_hosp', name: 'Udupi District Hospital', lat: 13.342, lon: 74.747, type: 'hospital', status: 'Disaster Relief Hub', safe: true, info: 'Relief Staging Area • Medical Mobile Units' },
  { id: 'shelter_surathkal', name: 'Surathkal High School Shelter', lat: 13.005, lon: 74.800, type: 'shelter', status: 'Designated Cyclone Shelter', safe: true, info: 'Capacity: 1,200 evacuees • Water & Power Generator' },

  // Marine Protected Areas & Mangroves
  { id: 'st_marys', name: "St. Mary's Geo-Heritage Sanctuary", lat: 13.380, lon: 74.673, type: 'protected', status: 'Strict No-Trawl Zone', safe: true, info: 'Columnar basalt reserve • Coral buffer zone' },
  { id: 'gokarna', name: 'Gokarna Marine Sanctuary', lat: 14.545, lon: 74.316, type: 'protected', status: 'Eco-sensitive Zone', safe: true, info: 'Rocky reef habitat • Olive Ridley nesting' },
  { id: 'honnavar', name: 'Sharavathi Mangrove Biosphere', lat: 14.283, lon: 74.445, type: 'mangrove', status: 'Mangrove Reserve', safe: true, info: 'Sediment attenuation 92% • Tidal fish nursery' },
  { id: 'kundapura', name: 'Kundapura Estuarine Reserve', lat: 13.630, lon: 74.685, type: 'mangrove', status: 'Protected Estuary', safe: true, info: 'Halophyte wetland barrier' },
  { id: 'netravati', name: 'Netravati-Gurupuru Mangrove Complex', lat: 12.842, lon: 74.856, type: 'mangrove', status: 'Critical Biosphere', safe: true, info: 'Mangaluru natural wave buffer • High biodiversity' },
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
        map.getLayersOrder()[0]
      );
    } catch (e) {
      console.warn('Tile switch:', e);
    }
  }, [activeTile, mapLoaded]);

  // Sync workspace polygons, lines, and custom markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Helper to safely remove layer and source
    const removeOverlay = (sourceId: string, layerIds: string[]) => {
      layerIds.forEach(lId => {
        if (map.getLayer(lId)) map.removeLayer(lId);
      });
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };

    // Filter relevant locations by mode
    let targetLocs = KARNATAKA_LOCATIONS;
    if (mode === 'fisherman') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'harbour' || l.type === 'port' || l.type === 'buoy');
    } else if (mode === 'disaster-management') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'cyclone' || l.type === 'hospital' || l.type === 'shelter' || l.type === 'port');
    } else if (mode === 'coastal-authority') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'port' || l.type === 'harbour' || l.type === 'buoy');
    } else if (mode === 'marine-monitoring') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'buoy' || l.type === 'port' || l.type === 'protected');
    } else if (mode === 'protected-areas') {
      targetLocs = KARNATAKA_LOCATIONS.filter(l => l.type === 'protected' || l.type === 'mangrove');
    }

    // Add interactive markers
    targetLocs.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer';

      let bgBadge = 'bg-blue-600';
      let iconEmoji = '⚓';
      if (loc.type === 'port') {
        bgBadge = 'bg-indigo-600';
        iconEmoji = '🚢';
      } else if (loc.type === 'buoy') {
        bgBadge = 'bg-emerald-600';
        iconEmoji = '📡';
      } else if (loc.type === 'cyclone') {
        bgBadge = 'bg-rose-600';
        iconEmoji = '🌀';
      } else if (loc.type === 'hospital') {
        bgBadge = 'bg-red-700';
        iconEmoji = '🏥';
      } else if (loc.type === 'shelter') {
        bgBadge = 'bg-amber-600';
        iconEmoji = '⛺';
      } else if (loc.type === 'protected' || loc.type === 'mangrove') {
        bgBadge = 'bg-emerald-700';
        iconEmoji = '🌿';
      }

      const isHighlighted = highlightSector && loc.name.toLowerCase().includes(highlightSector.toLowerCase());

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${loc.type === 'buoy' ? '<div class="absolute w-8 h-8 rounded-full bg-emerald-400/40 animate-ping"></div>' : ''}
          ${loc.type === 'cyclone' ? '<div class="absolute w-9 h-9 rounded-full bg-rose-500/30 animate-ping"></div>' : ''}
          <div class="w-7 h-7 rounded-full ${bgBadge} ${isHighlighted ? 'ring-4 ring-amber-400 animate-bounce' : 'ring-2 ring-white'} text-white shadow-md flex items-center justify-center text-xs transition-transform hover:scale-125 z-10">
            ${iconEmoji}
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(loc.name, loc);
        }
      });

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="padding: 6px 10px; font-family: sans-serif; font-size: 11px; color: #0a1628; max-width: 220px;">
          <strong style="display:block; font-size: 12px; margin-bottom: 2px;">${loc.name}</strong>
          <div style="display: flex; gap: 4px; margin-bottom: 4px;">
            <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1;">
              ${loc.status}
            </span>
          </div>
          <p style="margin: 0; color: #334155; font-size: 11px; line-height: 1.3;">
            ${loc.info || ''}
          </p>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 9.5px; font-family: monospace;">
            ${loc.lat.toFixed(3)}°N, ${loc.lon.toFixed(3)}°E
          </p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.lon, loc.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Clean up all overlay sources
    const allSources = [
      'fishing-safe-zone',
      'fishing-caution-zone',
      'tauktae-track',
      'cyclone-surge-zone',
      'coastal-hazard-zone',
      'tss-inbound',
      'tss-outbound',
      'outer-anchorage',
      'sst-band-nearshore',
      'sst-band-offshore',
      'mpa-stmarys',
      'mpa-netravati',
      'mpa-sharavathi',
    ];
    allSources.forEach(s => {
      const layers = [
        `${s}-fill`,
        `${s}-line`,
        `${s}-label`,
      ];
      removeOverlay(s, layers);
    });

    try {
      // 1. FISHERMAN WORKSPACE: Green 0-15NM Safe Corridor & Amber 15-35NM Swell Zone
      if (mode === 'fisherman') {
        // Safe Corridor (0 - 15 NM)
        const safeGeo: any = {
          type: 'Feature',
          properties: { title: 'Safe Nearshore Corridor (0-15 NM)' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.25, 14.85],
              [74.75, 14.85],
              [74.88, 12.80],
              [74.35, 12.80],
              [74.25, 14.85],
            ]],
          },
        };
        map.addSource('fishing-safe-zone', { type: 'geojson', data: safeGeo });
        map.addLayer({
          id: 'fishing-safe-zone-fill',
          type: 'fill',
          source: 'fishing-safe-zone',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.22,
          },
        });
        map.addLayer({
          id: 'fishing-safe-zone-line',
          type: 'line',
          source: 'fishing-safe-zone',
          paint: {
            'line-color': '#059669',
            'line-width': 2.5,
          },
        });

        // Caution Swell Zone (15 - 35 NM)
        const cautionGeo: any = {
          type: 'Feature',
          properties: { title: 'Caution Offshore Swell Zone (15-35 NM)' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [73.85, 14.85],
              [74.25, 14.85],
              [74.35, 12.80],
              [73.95, 12.80],
              [73.85, 14.85],
            ]],
          },
        };
        map.addSource('fishing-caution-zone', { type: 'geojson', data: cautionGeo });
        map.addLayer({
          id: 'fishing-caution-zone-fill',
          type: 'fill',
          source: 'fishing-caution-zone',
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.16,
          },
        });
        map.addLayer({
          id: 'fishing-caution-zone-line',
          type: 'line',
          source: 'fishing-caution-zone',
          paint: {
            'line-color': '#d97706',
            'line-width': 2,
            'line-dasharray': [3, 2],
          },
        });
      }

      // 2. DISASTER MANAGEMENT: Cyclone Tauktae Track & 5.8m Surge Inundation Zone
      if (mode === 'disaster-management') {
        const trackGeo: any = {
          type: 'Feature',
          properties: { name: 'Cyclone Tauktae Track' },
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
        map.addSource('tauktae-track', { type: 'geojson', data: trackGeo });
        map.addLayer({
          id: 'tauktae-track-line',
          type: 'line',
          source: 'tauktae-track',
          paint: {
            'line-color': '#ef4444',
            'line-width': 3.5,
          },
        });

        // Surge Inundation Cone (Mangaluru to Kundapura coastal lowlands)
        const surgeGeo: any = {
          type: 'Feature',
          properties: { name: '3.5m - 5.8m Surge Inundation Belt' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.65, 13.60],
              [74.78, 13.60],
              [74.88, 12.78],
              [74.78, 12.78],
              [74.65, 13.60],
            ]],
          },
        };
        map.addSource('cyclone-surge-zone', { type: 'geojson', data: surgeGeo });
        map.addLayer({
          id: 'cyclone-surge-zone-fill',
          type: 'fill',
          source: 'cyclone-surge-zone',
          paint: {
            'fill-color': '#f43f5e',
            'fill-opacity': 0.28,
          },
        });
        map.addLayer({
          id: 'cyclone-surge-zone-line',
          type: 'line',
          source: 'cyclone-surge-zone',
          paint: {
            'line-color': '#e11d48',
            'line-width': 2.5,
          },
        });
      }

      // 3. COASTAL AUTHORITY: 30km VTS Buffer, Shipping TSS Channels, & Anchorage
      if (mode === 'coastal-authority') {
        // 30km Circle around New Mangalore Port
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
          geometry: { type: 'Polygon', coordinates: [coords] },
        };
        map.addSource('coastal-hazard-zone', { type: 'geojson', data: hazardGeo });
        map.addLayer({
          id: 'coastal-hazard-zone-fill',
          type: 'fill',
          source: 'coastal-hazard-zone',
          paint: {
            'fill-color': '#f97316',
            'fill-opacity': 0.16,
          },
        });
        map.addLayer({
          id: 'coastal-hazard-zone-line',
          type: 'line',
          source: 'coastal-hazard-zone',
          paint: {
            'line-color': '#ea580c',
            'line-width': 2.5,
          },
        });

        // Inbound Shipping TSS Corridor
        const inboundTss: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.60, 12.98],
              [74.78, 12.94],
              [74.77, 12.91],
              [74.59, 12.95],
              [74.60, 12.98],
            ]],
          },
        };
        map.addSource('tss-inbound', { type: 'geojson', data: inboundTss });
        map.addLayer({
          id: 'tss-inbound-fill',
          type: 'fill',
          source: 'tss-inbound',
          paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
        });
        map.addLayer({
          id: 'tss-inbound-line',
          type: 'line',
          source: 'tss-inbound',
          paint: { 'line-color': '#1d4ed8', 'line-width': 2, 'line-dasharray': [4, 2] },
        });

        // Outer Anchorage Basin
        const anchorageGeo: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.68, 13.06],
              [74.75, 13.06],
              [74.75, 12.99],
              [74.68, 12.99],
              [74.68, 13.06],
            ]],
          },
        };
        map.addSource('outer-anchorage', { type: 'geojson', data: anchorageGeo });
        map.addLayer({
          id: 'outer-anchorage-fill',
          type: 'fill',
          source: 'outer-anchorage',
          paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.2 },
        });
        map.addLayer({
          id: 'outer-anchorage-line',
          type: 'line',
          source: 'outer-anchorage',
          paint: { 'line-color': '#0369a1', 'line-width': 2 },
        });
      }

      // 4. MARINE MONITORING: SST Thermal Anomaly Bands
      if (mode === 'marine-monitoring') {
        // Nearshore Band (30.6°C - 30.8°C)
        const sstNear: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.30, 14.85],
              [74.75, 14.85],
              [74.88, 12.80],
              [74.45, 12.80],
              [74.30, 14.85],
            ]],
          },
        };
        map.addSource('sst-band-nearshore', { type: 'geojson', data: sstNear });
        map.addLayer({
          id: 'sst-band-nearshore-fill',
          type: 'fill',
          source: 'sst-band-nearshore',
          paint: { 'fill-color': '#06b6d4', 'fill-opacity': 0.22 },
        });
        map.addLayer({
          id: 'sst-band-nearshore-line',
          type: 'line',
          source: 'sst-band-nearshore',
          paint: { 'line-color': '#0891b2', 'line-width': 2 },
        });

        // Offshore Thermal Front (30.8°C - 31.0°C)
        const sstOffshore: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [73.90, 14.85],
              [74.30, 14.85],
              [74.45, 12.80],
              [74.05, 12.80],
              [73.90, 14.85],
            ]],
          },
        };
        map.addSource('sst-band-offshore', { type: 'geojson', data: sstOffshore });
        map.addLayer({
          id: 'sst-band-offshore-fill',
          type: 'fill',
          source: 'sst-band-offshore',
          paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.18 },
        });
        map.addLayer({
          id: 'sst-band-offshore-line',
          type: 'line',
          source: 'sst-band-offshore',
          paint: { 'line-color': '#d97706', 'line-width': 2, 'line-dasharray': [3, 2] },
        });
      }

      // 5. PROTECTED AREAS: Mangrove Biospheres & St. Mary's Marine Sanctuary
      if (mode === 'protected-areas') {
        // St. Mary's Sanctuary
        const stMarysGeo: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.64, 13.41],
              [74.70, 13.41],
              [74.70, 13.35],
              [74.64, 13.35],
              [74.64, 13.41],
            ]],
          },
        };
        map.addSource('mpa-stmarys', { type: 'geojson', data: stMarysGeo });
        map.addLayer({
          id: 'mpa-stmarys-fill',
          type: 'fill',
          source: 'mpa-stmarys',
          paint: { 'fill-color': '#10b981', 'fill-opacity': 0.28 },
        });
        map.addLayer({
          id: 'mpa-stmarys-line',
          type: 'line',
          source: 'mpa-stmarys',
          paint: { 'line-color': '#059669', 'line-width': 2.5 },
        });

        // Netravati Mangroves
        const netravatiGeo: any = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [74.82, 12.87],
              [74.88, 12.87],
              [74.88, 12.82],
              [74.82, 12.82],
              [74.82, 12.87],
            ]],
          },
        };
        map.addSource('mpa-netravati', { type: 'geojson', data: netravatiGeo });
        map.addLayer({
          id: 'mpa-netravati-fill',
          type: 'fill',
          source: 'mpa-netravati',
          paint: { 'fill-color': '#16a34a', 'fill-opacity': 0.26 },
        });
        map.addLayer({
          id: 'mpa-netravati-line',
          type: 'line',
          source: 'mpa-netravati',
          paint: { 'line-color': '#15803d', 'line-width': 2 },
        });
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

  // Status banner content per mode
  let statusBanner = {
    title: '🟢 LIVE STATUS: SAFE FOR FISHING (0 - 20 NM)',
    sub: 'Waves 0.62m • Sea Temp 30.75°C • Current 0.07 m/s • Douglas State: Class 2 (Smooth)',
    color: 'border-emerald-300 bg-emerald-50/95 text-emerald-950',
  };

  if (mode === 'disaster-management') {
    statusBanner = {
      title: '🟡 SURVEILLANCE ACTIVE: ALL CLEAR / ZERO STORMS',
      sub: 'Tauktae track & 5.8m surge scenario cataloged • No active Arabian Sea vortex',
      color: 'border-amber-300 bg-amber-50/95 text-amber-950',
    };
  } else if (mode === 'coastal-authority') {
    statusBanner = {
      title: '🟢 PORT TRAFFIC: CHANNELS OPEN / NORMAL TRANSIT',
      sub: 'New Mangalore Deep Port operational • Zero draft restrictions • 30km VTS buffer armed',
      color: 'border-blue-300 bg-blue-50/95 text-blue-950',
    };
  } else if (mode === 'marine-monitoring') {
    statusBanner = {
      title: '📊 SCIENTIFIC TELEMETRY: 168H FORECAST STABLE',
      sub: 'Mean SST 30.75°C (+0.8°C thermal anomaly) • Waves 0.69m • 4 Inshore Buoys Online',
      color: 'border-cyan-300 bg-cyan-50/95 text-cyan-950',
    };
  } else if (mode === 'protected-areas') {
    statusBanner = {
      title: '🛡️ ECO-SURVEILLANCE: 36 RESERVES SECURED',
      sub: "St. Mary's reef & Netravati mangrove wave attenuation 92% • Zero unauthorized craft",
      color: 'border-emerald-300 bg-emerald-50/95 text-emerald-950',
    };
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#d8e4f0] bg-slate-100 shadow-2xs" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Operational Status Banner Top-Left */}
      <div className={`absolute top-3 left-3 max-w-sm sm:max-w-md p-2.5 rounded-xl border backdrop-blur-md shadow-sm z-10 space-y-0.5 ${statusBanner.color}`}>
        <div className="flex items-center gap-1.5 font-extrabold text-[11px] tracking-tight">
          <Radio className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />
          <span>{statusBanner.title}</span>
        </div>
        <p className="text-[10px] opacity-90 font-medium leading-tight">
          {statusBanner.sub}
        </p>
      </div>

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center cursor-pointer"
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
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
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#d8e4f0] text-slate-700 hover:text-indigo-600 shadow-xs transition-colors flex items-center justify-center cursor-pointer"
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
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Safe (0-15NM)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Caution (15-35NM)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" /> Buoys</span>
            </>
          )}
          {mode === 'marine-monitoring' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /> Nearshore SST</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Offshore Thermal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> Stations</span>
            </>
          )}
          {mode === 'protected-areas' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> St. Mary's MPA</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Mangrove Reserves</span>
            </>
          )}
          {mode === 'coastal-authority' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500" /> 30km VTS Zone</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Inbound TSS</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Anchorage</span>
            </>
          )}
          {mode === 'disaster-management' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-600" /> Tauktae Track</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> 5.8m Surge Zone</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> Shelters</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
