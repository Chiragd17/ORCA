import React, { useState } from 'react';
import { MapPin, Clock, Compass, Play, Loader2, Zap } from 'lucide-react';

interface Props {
  onRunAnalysis: (query: string, lat: number, lon: number, radiusKm: number, timeHorizon: string) => void;
  loading: boolean;
}

export const TIME_HORIZONS = [
  { value: 'forecast_7d', label: '7-Day Marine Forecast (Open-Meteo ECMWF/GFS)' },
  { value: 'live', label: 'Live Near-Realtime Telemetry (Moored Buoy 23001)' },
  { value: 'historical', label: 'Historical 2025-2026 Climatology (ERA5 Benchmark)' },
  { value: 'monsoon', label: 'Southwest Monsoon Upwelling (Jul-Aug Benchmark)' },
];

export const VARIABLE_FOCUSES = [
  { value: 'all', label: 'Multi-Variable Composite (SST, Waves, Current)' },
  { value: 'sst', label: 'Sea Surface Temperature & Anomaly' },
  { value: 'waves', label: 'Significant Wave Spectra & Swell Dynamics' },
  { value: 'currents', label: 'Ocean Current Velocity & Drift Vectors' },
];

export interface SectorPreset {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
  rad: number;
  defaultHorizon: string;
}

export const SECTOR_PRESETS: SectorPreset[] = [
  { id: 'statewide', label: 'Statewide (All 3 Sectors)', name: 'Karnataka Coastal Shelf', lat: 13.85, lon: 74.50, rad: 160, defaultHorizon: 'forecast_7d' },
  { id: 'uttara', label: 'Uttara Kannada (North / Karwar)', name: 'Karwar & Northern Shelf', lat: 14.80, lon: 74.12, rad: 50, defaultHorizon: 'forecast_7d' },
  { id: 'udupi', label: 'Udupi (Central / Malpe)', name: 'Malpe & Central Coastal Shelf', lat: 13.35, lon: 74.55, rad: 40, defaultHorizon: 'forecast_7d' },
  { id: 'dakshina', label: 'Dakshina Kannada (South / Mangaluru)', name: 'Mangaluru & Southern Shelf', lat: 12.87, lon: 74.88, rad: 40, defaultHorizon: 'forecast_7d' },
  { id: 'offshore', label: 'Offshore Arabian Sea (Deep Basin)', name: 'Offshore Arabian Sea Basin', lat: 12.00, lon: 73.50, rad: 120, defaultHorizon: 'forecast_7d' },
];

export const ResearchControls: React.FC<Props> = ({ onRunAnalysis, loading }) => {
  const [activeSectorId, setActiveSectorId] = useState<string>('statewide');
  const [timeHorizon, setTimeHorizon] = useState<string>('forecast_7d');
  const [variableFocus, setVariableFocus] = useState<string>('all');
  const [selectedPreset, setSelectedPreset] = useState<SectorPreset>(SECTOR_PRESETS[0]);
  const [autoRun, setAutoRun] = useState<boolean>(true);

  const executeAnalysis = (preset: SectorPreset, horizon: string, variable: string) => {
    const query = `Analyze ${variable === 'all' ? 'sea surface temperature, wave dynamics, and ocean currents' : variable} off ${preset.name} across ${horizon} horizon against ERA5 climatological baseline.`;
    onRunAnalysis(query, preset.lat, preset.lon, preset.rad, horizon);
  };

  const handleSectorSelect = (preset: SectorPreset) => {
    setActiveSectorId(preset.id);
    setSelectedPreset(preset);
    if (autoRun) {
      executeAnalysis(preset, timeHorizon, variableFocus);
    }
  };

  const handleHorizonChange = (newHorizon: string) => {
    setTimeHorizon(newHorizon);
    if (autoRun) {
      executeAnalysis(selectedPreset, newHorizon, variableFocus);
    }
  };

  const handleVariableChange = (newVariable: string) => {
    setVariableFocus(newVariable);
    if (autoRun) {
      executeAnalysis(selectedPreset, timeHorizon, newVariable);
    }
  };

  const handleRun = () => {
    executeAnalysis(selectedPreset, timeHorizon, variableFocus);
  };

  const toggleAutoRun = () => {
    const nextState = !autoRun;
    setAutoRun(nextState);
    if (nextState) {
      executeAnalysis(selectedPreset, timeHorizon, variableFocus);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#d8e4f0] shadow-xs space-y-3">
      {/* Primary Top Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Study Region Selector */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-[#0a1628]">
            <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <select
              value={activeSectorId}
              onChange={(e) => {
                const found = SECTOR_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSectorSelect(found);
              }}
              className="w-full bg-transparent border-none text-xs font-semibold focus:outline-hidden text-[#0a1628] cursor-pointer"
            >
              {SECTOR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Temporal Horizon Selector */}
        <div className="flex-1 min-w-[220px]">
          <div
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs text-[#0a1628] transition-all ${
              timeHorizon === 'forecast_7d'
                ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-500/20 shadow-2xs'
                : 'bg-[#f8fafc] border-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 flex-shrink-0 ${timeHorizon === 'forecast_7d' ? 'text-blue-600' : 'text-slate-500'}`} />
            <select
              value={timeHorizon}
              onChange={(e) => handleHorizonChange(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold focus:outline-hidden text-[#0a1628] cursor-pointer"
            >
              {TIME_HORIZONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Variable Focus Selector */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-[#0a1628]">
            <Compass className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <select
              value={variableFocus}
              onChange={(e) => handleVariableChange(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold focus:outline-hidden text-[#0a1628] cursor-pointer"
            >
              {VARIABLE_FOCUSES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-run toggle pill matching Person 3 */}
        <button
          type="button"
          onClick={toggleAutoRun}
          title={autoRun ? "Auto-Run is ON (instant analysis upon option change)" : "Auto-Run is OFF (configure options then click Run Research Analysis)"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
            autoRun
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-2xs'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${autoRun ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
          <span>{autoRun ? 'Auto: ON' : 'Auto: OFF'}</span>
        </button>

        {/* Run Research Button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Research Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Sector Quick Pills matching Person 3 */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 mr-1">Study Sectors:</span>
        {SECTOR_PRESETS.map((p) => {
          const isActive = activeSectorId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSectorSelect(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
