import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { EvidenceRecord, Finding } from '../../../types';
import { Map as MapIcon, Layers } from 'lucide-react';

interface Props {
  evidence: EvidenceRecord[];
  findings?: Finding[];
  loading: boolean;
}

// Karnataka coastal study area
const DEFAULT_CENTER: [number, number] = [74.75, 13.20];
const DEFAULT_ZOOM = 8.5;

// Feature type colors
const FEATURE_COLORS: Record<string, string> = {
  settlement: '#ef4444',
  port: '#3b82f6',
  hospital: '#8b5cf6',
  mangrove: '#10b981',
  protected_area: '#10b981',
};

const FEATURE_ICONS: Record<string, string> = {
  settlement: '🏘️',
  port: '⚓',
  hospital: '🏥',
  mangrove: '🌿',
  protected_area: '🛡️',
};

export const CoastalMap: React.FC<Props> = ({ evidence, findings: _findings, loading }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [layers, setLayers] = useState({
    hazardArea: true,
    settlements: true,
    coastalFeatures: true,
    protectedAreas: true,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'ORCA Coastal',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 150 }), 'bottom-left');

    map.on('load', () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
    };
  }, []);

  // Add markers from evidence
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const coastalFeatures = evidence.filter(e => e.data_type === 'coastal_feature' && e.raw_data);
    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    for (const ev of coastalFeatures) {
      const rd = ev.raw_data!;
      const lat = rd.latitude || ev.latitude;
      const lon = rd.longitude || ev.longitude;
      if (!lat || !lon) continue;

      const featureType = rd.feature_type || 'unknown';

      // Check layer visibility
      if (featureType === 'settlement' && !layers.settlements) continue;
      if ((featureType === 'mangrove' || featureType === 'protected_area') && !layers.protectedAreas) continue;
      if ((featureType === 'port' || featureType === 'hospital') && !layers.coastalFeatures) continue;

      const color = FEATURE_COLORS[featureType] || '#6b7280';
      const icon = FEATURE_ICONS[featureType] || '📍';

      // Create marker element
      const el = document.createElement('div');
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '12px';
      el.textContent = icon;

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; font-size: 12px; max-width: 220px;">
          <strong style="color: #0a1628; font-size: 13px;">${rd.name || 'Unknown'}</strong>
          <div style="color: #4a6fa5; margin-top: 4px; text-transform: capitalize;">${featureType.replace('_', ' ')}</div>
          ${rd.estimated_population ? `<div style="color: #1a3258; margin-top: 4px;"><strong>Population:</strong> ${rd.estimated_population.toLocaleString()}</div>` : ''}
          ${rd.description ? `<div style="color: #6b8fc0; margin-top: 4px; font-size: 11px;">${rd.description}</div>` : ''}
          <div style="color: #93b1d6; margin-top: 4px; font-size: 10px;">Evidence: ${ev.evidence_id}</div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 18, maxWidth: '250px' })
        .setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
      bounds.extend([lon, lat]);
      hasPoints = true;
    }

    // Add live marine observation marker
    const liveObs = evidence.filter(e => e.data_type === 'live_marine_observation');
    for (const ev of liveObs) {
      if (!ev.latitude || !ev.longitude) continue;

      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#0891b2';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 8px rgba(8,145,178,0.4)';
      el.style.cursor = 'pointer';

      const waveHeight = ev.raw_data?.wave_height;
      const popupHtml = `
        <div style="font-family: Inter, sans-serif; font-size: 12px;">
          <strong>Live Marine Observation</strong>
          ${waveHeight ? `<div>Wave Height: ${waveHeight} m</div>` : ''}
          <div style="color: #6b8fc0; font-size: 10px;">${ev.source_name}</div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([ev.longitude, ev.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
      bounds.extend([ev.longitude, ev.latitude]);
      hasPoints = true;
    }

    if (hasPoints) {
      mapRef.current!.fitBounds(bounds, {
        padding: { top: 75, bottom: 40, left: 40, right: 40 },
        maxZoom: 12,
      });
    }
  }, [evidence, mapReady, layers]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm overflow-hidden">
      {/* Map header */}
      <div className="px-3 py-2 border-b border-[#e8eef5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-[#2563eb]" />
          <h3 className="text-sm font-semibold text-[#0a1628]">Coastal Risk Analysis Map</h3>
        </div>
        <div className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#6b8fc0]" />
        </div>
      </div>

      {/* Legend */}
      <div className="absolute z-10 top-14 left-3 bg-white/95 border border-[#d8e4f0] rounded-lg p-2 text-[10px] space-y-1 shadow-sm"
           style={{ position: 'relative', margin: '8px', marginBottom: 0 }}>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <button onClick={() => toggleLayer('hazardArea')} className="flex items-center gap-1 cursor-pointer hover:opacity-70">
            <span className="w-3 h-3 rounded bg-red-400/30 border border-red-400" />
            <span className={layers.hazardArea ? 'text-[#1a3258]' : 'text-[#93b1d6] line-through'}>Hazard Area</span>
          </button>
          <button onClick={() => toggleLayer('settlements')} className="flex items-center gap-1 cursor-pointer hover:opacity-70">
            <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span className={layers.settlements ? 'text-[#1a3258]' : 'text-[#93b1d6] line-through'}>Affected Settlements</span>
          </button>
          <button onClick={() => toggleLayer('coastalFeatures')} className="flex items-center gap-1 cursor-pointer hover:opacity-70">
            <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            <span className={layers.coastalFeatures ? 'text-[#1a3258]' : 'text-[#93b1d6] line-through'}>Coastal Features</span>
          </button>
          <button onClick={() => toggleLayer('protectedAreas')} className="flex items-center gap-1 cursor-pointer hover:opacity-70">
            <span className="w-3 h-3 rounded bg-emerald-400/40 border border-emerald-400" />
            <span className={layers.protectedAreas ? 'text-[#1a3258]' : 'text-[#93b1d6] line-through'}>Protected Areas</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#0891b2]" />
            <span className="text-[#1a3258]">Karnataka Coastal Buffer (90 km)</span>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div ref={mapContainerRef} className="h-[340px] w-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-sm text-[#4a6fa5]">
              <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
              <span>Loading map data...</span>
            </div>
          </div>
        )}
        {!loading && evidence.length === 0 && mapReady && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 border border-[#d8e4f0] rounded-lg px-3 py-2 text-xs text-[#4a6fa5] z-10 shadow-sm">
            Run an analysis to see coastal features on the map
          </div>
        )}
      </div>
    </div>
  );
};
