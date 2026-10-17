import React, { useMemo, useState } from 'react';
import { Compass, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from 'lucide-react';
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

const formatCoord = (lat: number | null | undefined, lon: number | null | undefined): string => {
  if (lat === null || lat === undefined || lon === null || lon === undefined || isNaN(lat) || isNaN(lon)) {
    return 'N/A';
  }
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
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
  const [hoveredPoint, setHoveredPoint] = useState<{ point: HazardTrackPoint; index: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);


  // Filter valid points only (never plot null or 0,0)
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
        !(p.latitude === 0 && p.longitude === 0)
    );
  }, [trackPoints]);

  const isSingleFix = validPoints.length === 1;

  // Compute bounding box
  const bounds = useMemo(() => {
    if (validPoints.length === 0) {
      // Default to North Indian Ocean (Arabian Sea + Bay of Bengal)
      return { minLat: 4.0, maxLat: 26.0, minLon: 60.0, maxLon: 94.0 };
    }
    const lats = validPoints.map((p) => p.latitude);
    const lons = validPoints.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    if (validPoints.length === 1) {
      return {
        minLat: Math.max(-90, minLat - 6.0),
        maxLat: Math.min(90, maxLat + 6.0),
        minLon: minLon - 8.0,
        maxLon: maxLon + 8.0,
      };
    }

    const latPadding = Math.max((maxLat - minLat) * 0.18, 2.5);
    const lonPadding = Math.max((maxLon - minLon) * 0.18, 2.5);

    return {
      minLat: Math.max(-90, minLat - latPadding),
      maxLat: Math.min(90, maxLat + latPadding),
      minLon: minLon - lonPadding,
      maxLon: maxLon + lonPadding,
    };
  }, [validPoints]);

  // Project geographic coordinates to SVG coordinates [0..100]
  const project = (lat: number, lon: number) => {
    const lonSpan = bounds.maxLon - bounds.minLon || 1;
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    const x = ((lon - bounds.minLon) / lonSpan) * 100;
    const y = ((bounds.maxLat - lat) / latSpan) * 100;
    return { x, y };
  };

  // Generate SVG path string for multi-point trajectories
  const pathD = useMemo(() => {
    if (validPoints.length < 2) return '';
    return validPoints
      .map((pt, idx) => {
        const { x, y } = project(pt.latitude, pt.longitude);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [validPoints, bounds]);

  // Cartographic Graticules (Latitude & Longitude grid lines with degree labels)
  const graticules = useMemo(() => {
    const latSpan = bounds.maxLat - bounds.minLat;
    const lonSpan = bounds.maxLon - bounds.minLon;
    const latStep = latSpan > 25 ? 5 : latSpan > 10 ? 3 : 2;
    const lonStep = lonSpan > 25 ? 5 : lonSpan > 10 ? 3 : 2;

    const latLines: number[] = [];
    const startLat = Math.ceil(bounds.minLat / latStep) * latStep;
    for (let lat = startLat; lat < bounds.maxLat; lat += latStep) {
      latLines.push(lat);
    }

    const lonLines: number[] = [];
    const startLon = Math.ceil(bounds.minLon / lonStep) * lonStep;
    for (let lon = startLon; lon < bounds.maxLon; lon += lonStep) {
      lonLines.push(lon);
    }

    return { latLines, lonLines };
  }, [bounds]);

  const getCategoryColor = (cat: string | null | undefined, wind: number | null | undefined) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('red') || c.includes('super')) return '#dc2626'; // Super Cyclone / Red
    if (c.includes('orange') || c.includes('extremely') || (wind && wind >= 90)) return '#ea580c'; // ESCS / Orange
    if (c.includes('very severe') || (wind && wind >= 64)) return '#f97316'; // VSCS
    if (c.includes('severe') || (wind && wind >= 48)) return '#f59e0b'; // SCS
    if (c.includes('storm') || (wind && wind >= 34)) return '#0284c7'; // Cyclonic Storm
    if (c.includes('depression') || (wind && wind >= 17)) return '#2563eb'; // Deep Depression
    return '#10b981'; // Normal / Low pressure
  };

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;
  const isGdacs = source === 'GDACS' || stormId.startsWith('hz-gdacs-');

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#d8e4f0] bg-[#0c1929] flex flex-col shadow-xs ${className}`}>
      {/* Top Map Header */}
      <div className="bg-[#0f1f33]/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-700/60 flex items-center justify-between text-xs z-10">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100">
            {stormName
              ? `${stormName} (${stormId}) ${isSingleFix ? 'Centroid Advisory' : 'Trajectory Track'}`
              : 'Marine Hazard & Trajectory Chart'}
          </span>
          {basin && (
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
              {basin.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span className="hidden sm:inline font-mono text-[11px]">
            Center: {formatCoord(centerLat, centerLon)}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono text-[10px]">
            {isGdacs ? 'WGS84 • GDACS Feed' : 'WGS84 • NOAA IBTrACS'}
          </span>
        </div>
      </div>

      {/* Main Cartographic View */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        {/* Gridded Nautical Bathymetry Pattern */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #1e3a5f 1px, transparent 1px), linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)`,
            backgroundSize: '32px 32px, 64px 64px, 64px 64px',
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-[#0c1929]/80 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-cyan-200 mt-2 font-medium">Resolving geospatial hazard points...</span>
          </div>
        )}

        {/* Zero Fixes Warning */}
        {validPoints.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center z-20">
            <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Geographic Waypoints Available</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              The selected hazard does not contain valid coordinate fixes or coordinates are outside WGS84 bounds.
            </p>
          </div>
        )}

        {/* SVG Projection Canvas */}
        {validPoints.length > 0 && (
          <svg
            className="w-full h-full p-6 select-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
          >
            {/* Graticule Latitude Lines */}
            {graticules.latLines.map((lat) => {
              const { y } = project(lat, bounds.minLon);
              return (
                <g key={`lat-${lat}`}>
                  <line
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="#1e3a5f"
                    strokeWidth="0.3"
                    strokeDasharray="1.5,1.5"
                  />
                  <text
                    x="1.5"
                    y={Math.max(3, Math.min(97, y - 1))}
                    fill="#64748b"
                    fontSize="2.2"
                    fontFamily="monospace"
                  >
                    {lat}°N
                  </text>
                </g>
              );
            })}

            {/* Graticule Longitude Lines */}
            {graticules.lonLines.map((lon) => {
              const { x } = project(bounds.minLat, lon);
              return (
                <g key={`lon-${lon}`}>
                  <line
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="100"
                    stroke="#1e3a5f"
                    strokeWidth="0.3"
                    strokeDasharray="1.5,1.5"
                  />
                  <text
                    x={Math.max(3, Math.min(93, x + 1))}
                    y="98"
                    fill="#64748b"
                    fontSize="2.2"
                    fontFamily="monospace"
                  >
                    {lon}°E
                  </text>
                </g>
              );
            })}

            {/* Indian West Coastline Reference Geometry */}
            <path
              d="M 68 0 Q 72 25 74 50 T 78 85 L 82 100"
              fill="none"
              stroke="#334155"
              strokeWidth="0.8"
              strokeDasharray="2,2"
              opacity="0.6"
            />

            {/* Storm Trajectory Line */}
            {pathD && (
              <>
                {/* Outer Glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.35"
                />
                {/* Solid Core Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Waypoint Fixes */}
            {validPoints.map((pt, idx) => {
              const { x, y } = project(pt.latitude, pt.longitude);
              const color = getCategoryColor(pt.category, pt.wind_speed_knots);
              const isSelected = selectedPointIndex === idx;
              const isFirst = idx === 0;
              const isLast = idx === validPoints.length - 1;

              return (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onClick={() => onSelectPoint?.(idx)}
                  onMouseEnter={() => setHoveredPoint({ point: pt, index: idx })}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Selection / Hover Aura */}
                  {(isSelected || hoveredPoint?.index === idx) && (
                    <circle
                      cx={x}
                      cy={y}
                      r="3.2"
                      fill={color}
                      fillOpacity="0.3"
                      className="animate-pulse"
                    />
                  )}

                  {/* Waypoint Marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 1.9 : isFirst || isLast ? 1.6 : 1.2}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? '0.6' : '0.3'}
                  />

                  {/* Start / Landfall Badges */}
                  {(isFirst || isLast) && (
                    <text
                      x={x + 2}
                      y={y + 1}
                      fill="#e2e8f0"
                      fontSize="2.4"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {isFirst ? 'GENESIS' : 'LATEST'}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute z-40 bg-[#0f1f33]/95 border border-cyan-500/40 rounded-xl p-3 shadow-xl backdrop-blur-md text-xs text-slate-200 pointer-events-none transition-all"
            style={{
              bottom: '16px',
              left: '16px',
              maxWidth: '300px',
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5 mb-1.5">
              <span className="font-semibold text-cyan-300">
                Fix #{hoveredPoint.index + 1}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                {hoveredPoint.point.time ? new Date(hoveredPoint.point.time).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Position:</span>
                <span className="font-mono font-medium text-slate-200">
                  {formatCoord(hoveredPoint.point.latitude, hoveredPoint.point.longitude)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Wind Speed:</span>
                <span className="font-mono font-medium text-cyan-200">
                  {hoveredPoint.point.wind_speed_knots !== null
                    ? `${hoveredPoint.point.wind_speed_knots} kts (${Math.round(hoveredPoint.point.wind_speed_knots * 1.852)} km/h)`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pressure:</span>
                <span className="font-mono text-slate-300">
                  {hoveredPoint.point.pressure_hpa !== null ? `${hoveredPoint.point.pressure_hpa} hPa` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Intensity Category:</span>
                <span className="font-semibold text-orange-400">
                  {hoveredPoint.point.category || 'Depression / CS'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Map Control Buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col space-y-1 bg-[#0f1f33]/90 border border-slate-700/60 rounded-xl p-1 shadow-lg backdrop-blur-xs">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 3))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Reset Map Bounds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* IMD Intensity Scale Legend */}
        <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-2 bg-[#0f1f33]/90 border border-slate-700/60 rounded-xl px-3 py-1.5 backdrop-blur-xs text-[10px] text-slate-300">
          <span className="text-slate-400 font-semibold mr-1">Intensity:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>Depression</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
            <span>CS (34+ kts)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span>SCS (48+ kts)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
            <span>VSCS (64+ kts)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
            <span>Super Cyclone</span>
          </span>
        </div>
      </div>
    </div>
  );
};
