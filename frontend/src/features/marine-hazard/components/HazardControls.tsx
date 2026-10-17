import React, { useState } from 'react';
import { MapPin, Clock, Compass, Play, Loader2, Zap, AlertTriangle, Waves } from 'lucide-react';

export interface SectorPreset {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
  rad: number;
  basin: 'arabian_sea' | 'bay_of_bengal' | 'north_indian';
  defaultHorizon: string;
}

interface Props {
  onRunAnalysis: (
    query: string,
    lat: number,
    lon: number,
    radiusKm: number,
    timeHorizon: string,
    hazardType: string,
    preset?: SectorPreset
  ) => void;
  loading: boolean;
  forecastVisible?: boolean;
  onToggleForecast?: () => void;
}

export const TIME_HORIZONS = [
  { value: 'forecast_7d', label: '7-Day Marine Forecast & 24h Advisory (Open-Meteo / ECMWF)' },
  { value: 'live', label: 'Live Active Disaster Alerts (GDACS Near-Realtime Feed)' },
  { value: 'historical', label: 'Historical Cyclones Registry (NOAA IBTrACS 1848-2026)' },
  { value: 'cyclone_runs', label: 'NOAA NHC 5-Day Tropical Cyclone Trajectory Runs' },
];

export const HAZARD_FOCUSES = [
  { value: 'all', label: 'Multi-Hazard Composite (Cyclones, Swell, Waves & Gale)' },
  { value: 'cyclone', label: 'Tropical Cyclones & Track Waypoints' },
  { value: 'waves', label: 'Significant Wave Surge & Douglas Sea State' },
  { value: 'gdacs', label: 'Active GDACS Red/Orange Disaster Alerts' },
];

export const SECTOR_PRESETS: SectorPreset[] = [
  { id: 'statewide', label: 'Statewide (All 3 Sectors)', name: 'Karnataka Coastal Shelf', lat: 13.85, lon: 74.50, rad: 160, basin: 'arabian_sea', defaultHorizon: 'forecast_7d' },
  { id: 'uttara', label: 'Uttara Kannada (North / Karwar)', name: 'Karwar & Northern Shelf', lat: 14.80, lon: 74.12, rad: 50, basin: 'arabian_sea', defaultHorizon: 'forecast_7d' },
  { id: 'udupi', label: 'Udupi (Central / Malpe)', name: 'Malpe & Central Coastal Shelf', lat: 13.35, lon: 74.55, rad: 40, basin: 'arabian_sea', defaultHorizon: 'forecast_7d' },
  { id: 'dakshina', label: 'Dakshina Kannada (South / Mangaluru)', name: 'Mangaluru & Southern Shelf', lat: 12.87, lon: 74.88, rad: 40, basin: 'arabian_sea', defaultHorizon: 'forecast_7d' },
  { id: 'arabian_deep', label: 'Offshore Arabian Sea (Deep Basin)', name: 'Arabian Sea Basin', lat: 14.00, lon: 68.00, rad: 350, basin: 'arabian_sea', defaultHorizon: 'forecast_7d' },
  { id: 'bay_of_bengal', label: 'Bay of Bengal Basin', name: 'Bay of Bengal Basin', lat: 14.00, lon: 86.00, rad: 350, basin: 'bay_of_bengal', defaultHorizon: 'forecast_7d' },
];

export const HazardControls: React.FC<Props> = ({
  onRunAnalysis,
  loading,
  forecastVisible = true,
  onToggleForecast,
}) => {
  const [activeSectorId, setActiveSectorId] = useState<string>('statewide');
  const [timeHorizon, setTimeHorizon] = useState<string>('forecast_7d');
  const [hazardFocus, setHazardFocus] = useState<string>('all');
  const [selectedPreset, setSelectedPreset] = useState<SectorPreset>(SECTOR_PRESETS[0]);
  const [autoRun, setAutoRun] = useState<boolean>(true);

  const executeAnalysis = (preset: SectorPreset, horizon: string, focus: string) => {
    const query = `Analyze ${focus === 'all' ? 'marine wave conditions, cyclone hazards, and Douglas sea state' : focus} off ${preset.name} across ${horizon} horizon against verified PostgreSQL records.`;
    onRunAnalysis(query, preset.lat, preset.lon, preset.rad, horizon, focus, preset);
  };

  const handleSectorSelect = (preset: SectorPreset) => {
    setActiveSectorId(preset.id);
    setSelectedPreset(preset);
    if (autoRun) {
      executeAnalysis(preset, timeHorizon, hazardFocus);
    }
  };

  const handleHorizonChange = (newHorizon: string) => {
    setTimeHorizon(newHorizon);
    if (autoRun) {
      executeAnalysis(selectedPreset, newHorizon, hazardFocus);
    }
  };

  const handleFocusChange = (newFocus: string) => {
    setHazardFocus(newFocus);
    if (autoRun) {
      executeAnalysis(selectedPreset, timeHorizon, newFocus);
    }
  };

  const handleRun = () => {
    executeAnalysis(selectedPreset, timeHorizon, hazardFocus);
  };

  const toggleAutoRun = () => {
    const nextState = !autoRun;
    setAutoRun(nextState);
    if (nextState) {
      executeAnalysis(selectedPreset, timeHorizon, hazardFocus);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#d8e4f0] shadow-xs space-y-3">
      {/* Primary Top Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Study Region Selector */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-[#0a1628]">
            <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <select
              value={activeSectorId}
              onChange={(e) => {
                const found = SECTOR_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSectorSelect(found);
              }}
              className="bg-transparent font-medium text-[#0a1628] focus:outline-none w-full cursor-pointer"
              aria-label="Select Target Geographic Sector"
            >
              {SECTOR_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hazard Scope Focus */}
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-[#0a1628]">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <select
              value={hazardFocus}
              onChange={(e) => handleFocusChange(e.target.value)}
              className="bg-transparent font-medium text-[#0a1628] focus:outline-none w-full cursor-pointer"
              aria-label="Select Hazard Type Focus"
            >
              {HAZARD_FOCUSES.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Horizon Selector */}
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-[#0a1628]">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <select
              value={timeHorizon}
              onChange={(e) => handleHorizonChange(e.target.value)}
              className="bg-transparent font-medium text-[#0a1628] focus:outline-none w-full cursor-pointer"
              aria-label="Select Investigation Time Horizon"
            >
              {TIME_HORIZONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-Run Toggle Pill */}
        <button
          onClick={toggleAutoRun}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            autoRun
              ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title={autoRun ? 'Auto-run enabled: updates immediately on parameter changes' : 'Auto-run paused'}
        >
          <Zap className={`w-3.5 h-3.5 ${autoRun ? 'text-orange-600' : 'text-slate-400'}`} />
          <span>Auto-run</span>
        </button>

        {/* Marine Forecast Advisory Visibility Toggle */}
        {onToggleForecast && (
          <button
            type="button"
            onClick={onToggleForecast}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              forecastVisible
                ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title={forecastVisible ? 'Collapse / Hide Marine Forecast Advisory' : 'Open Forward Marine Forecast Advisory'}
          >
            <Waves className={`w-3.5 h-3.5 ${forecastVisible ? 'text-orange-600' : 'text-slate-400'}`} />
            <span>Forecast {forecastVisible ? 'Active' : 'Closed'}</span>
          </button>
        )}

        {/* Primary Run Button */}
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Hazard Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Secondary Preset Quick Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Compass className="w-3 h-3 text-slate-400" />
          Sector Presets:
        </span>
        {SECTOR_PRESETS.map((preset) => {
          const isActive = activeSectorId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSectorSelect(preset)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-orange-100 text-orange-800 border border-orange-200 font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60'
              }`}
            >
              {preset.label.split('(')[0].trim()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
