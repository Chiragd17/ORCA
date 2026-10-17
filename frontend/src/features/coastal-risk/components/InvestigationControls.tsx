import React, { useState } from 'react';
import { MapPin, Clock, Compass, Play, Loader2 } from 'lucide-react';

interface Props {
  onRunAnalysis: (query: string, lat: number, lon: number, radiusKm: number, timeRange: string) => void;
  loading: boolean;
}

const TIME_RANGES = [
  { value: 'last24h', label: 'Last 24 hours' },
  { value: 'last7d', label: 'Last 7 days' },
  { value: 'last30d', label: 'Last 30 days' },
  { value: 'historical', label: 'Historical' },
];

const RANGE_OPTIONS = [
  { value: 25, label: '25 km (Local Port / Nearshore)' },
  { value: 50, label: '50 km (District Coastal Corridor)' },
  { value: 100, label: '100 km (Regional Multi-District)' },
  { value: 160, label: '160 km (Statewide 320km Coastline)' },
];

const REGION_PRESETS = [
  { label: 'Statewide (All 3 Districts)', name: 'Karnataka Statewide', lat: 13.85, lon: 74.50, rad: 160 },
  { label: 'Uttara Kannada (North)', name: 'Uttara Kannada (Karwar)', lat: 14.50, lon: 74.35, rad: 60 },
  { label: 'Udupi (Central)', name: 'Udupi Central Coast', lat: 13.3409, lon: 74.7421, rad: 40 },
  { label: 'Dakshina Kannada (South)', name: 'Mangaluru & Dakshina Kannada', lat: 12.9141, lon: 74.8560, rad: 40 },
];

export const InvestigationControls: React.FC<Props> = ({ onRunAnalysis, loading }) => {
  const [location, setLocation] = useState('Karnataka Statewide');
  const [timeRange, setTimeRange] = useState('historical');
  const [radiusKm, setRadiusKm] = useState<number>(160);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCoordinates = (locStr: string) => {
    const lowerLoc = locStr.trim().toLowerCase();
    const isKarnataka = !lowerLoc || lowerLoc.includes('karnataka') || lowerLoc.includes('state') || lowerLoc.includes('all');
    if (isKarnataka) return { lat: 13.85, lon: 74.50, isKarnataka: true };

    let lat = 13.85, lon = 74.50;
    if (lowerLoc.includes('karwar') || lowerLoc.includes('baithkol')) { lat = 14.8140; lon = 74.1298; }
    else if (lowerLoc.includes('gokarna')) { lat = 14.5426; lon = 74.3168; }
    else if (lowerLoc.includes('kumta')) { lat = 14.4258; lon = 74.4173; }
    else if (lowerLoc.includes('honnavar')) { lat = 14.2835; lon = 74.4520; }
    else if (lowerLoc.includes('bhatkal')) { lat = 13.9850; lon = 74.5519; }
    else if (lowerLoc.includes('murudeshwar')) { lat = 14.0942; lon = 74.4849; }
    else if (lowerLoc.includes('uttara kannada')) { lat = 14.5000; lon = 74.3500; }
    else if (lowerLoc.includes('byndoor') || lowerLoc.includes('baindur')) { lat = 13.8732; lon = 74.6288; }
    else if (lowerLoc.includes('kundapura')) { lat = 13.6264; lon = 74.6934; }
    else if (lowerLoc.includes('udupi')) { lat = 13.3409; lon = 74.7421; }
    else if (lowerLoc.includes('malpe')) { lat = 13.3512; lon = 74.7003; }
    else if (lowerLoc.includes('kaup')) { lat = 13.2241; lon = 74.7432; }
    else if (lowerLoc.includes('padubidri')) { lat = 13.1360; lon = 74.7788; }
    else if (lowerLoc.includes('surathkal')) { lat = 13.0068; lon = 74.7938; }
    else if (lowerLoc.includes('mangaluru') || lowerLoc.includes('mangalore') || lowerLoc.includes('dakshina kannada')) { lat = 12.9141; lon = 74.8560; }
    else if (lowerLoc.includes('ullal')) { lat = 12.8055; lon = 74.8564; }
    return { lat, lon, isKarnataka: false };
  };

  const buildQuery = (locStr: string, rad: number, tr: string, isKar: boolean) => {
    if (isKar) {
      if (tr === 'last24h') {
        return `Live 24h marine observation: assess nearshore wave impact and baseline exposure across 320km Karnataka coast within ${rad}km buffer under calm sea conditions.`;
      } else if (tr === 'last7d') {
        return `7-day ocean conditions: evaluate weekly tidal swell impact and coastal erosion exposure across Karnataka coastline within ${rad}km buffer.`;
      } else if (tr === 'last30d') {
        return `30-day ocean state: evaluate monthly spring-tide high-water line and coastal buffer saturation across Karnataka coastline within ${rad}km buffer.`;
      } else {
        return `Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone across entire 320km Karnataka coastline within ${rad}km.`;
      }
    } else {
      if (tr === 'last24h') {
        return `Live 24h marine observation: assess nearshore wave impact and shoreline exposure within ${rad}km of ${locStr} under live calm conditions.`;
      } else if (tr === 'last7d') {
        return `7-day ocean conditions: evaluate weekly tidal swell impact and coastal erosion exposure within ${rad}km of ${locStr}.`;
      } else if (tr === 'last30d') {
        return `30-day ocean state: evaluate monthly spring-tide high-water line and coastal buffer saturation within ${rad}km of ${locStr}.`;
      } else {
        return `Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone within ${rad}km of ${locStr}.`;
      }
    }
  };

  const executeAnalysis = (newLoc: string, newRad: number, newTr: string) => {
    if (loading || isSubmitting) return;
    setIsSubmitting(true);
    const { lat, lon, isKarnataka } = getCoordinates(newLoc);
    const query = buildQuery(newLoc, newRad, newTr, isKarnataka);
    onRunAnalysis(query, lat, lon, newRad, newTr);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleTimeRangeChange = (newTr: string) => {
    setTimeRange(newTr);
    let newRad = radiusKm;
    if (newTr === 'last24h') newRad = 25;
    else if (newTr === 'last7d') newRad = 50;
    else if (newTr === 'last30d') newRad = 100;
    else if (newTr === 'historical') newRad = 160;

    setRadiusKm(newRad);
    executeAnalysis(location, newRad, newTr);
  };

  const handleRadiusChange = (newRad: number) => {
    setRadiusKm(newRad);
    executeAnalysis(location, newRad, timeRange);
  };

  const handlePresetClick = (preset: typeof REGION_PRESETS[0]) => {
    setLocation(preset.name);
    setRadiusKm(preset.rad);
    if (loading || isSubmitting) return;
    setIsSubmitting(true);
    const isKar = preset.name.includes('Karnataka') || preset.name.includes('Statewide');
    const query = buildQuery(preset.name, preset.rad, timeRange, isKar);
    onRunAnalysis(query, preset.lat, preset.lon, preset.rad, timeRange);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleSubmit = () => {
    executeAnalysis(location, radiusKm, timeRange);
  };

  return (
    <div className="p-3 rounded-xl bg-white border border-[#d8e4f0] shadow-sm space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {/* Location */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-[#4a6fa5] flex-shrink-0" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            className="flex-1 bg-transparent text-sm text-[#0a1628] placeholder-[#93b1d6] focus:outline-none"
            placeholder="Karnataka Statewide"
            aria-label="Geographic area"
          />
        </div>

        {/* Time range */}
        <div className="flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-2">
          <Clock className="w-4 h-4 text-[#4a6fa5] flex-shrink-0" />
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="bg-transparent text-sm text-[#0a1628] focus:outline-none cursor-pointer"
            aria-label="Time range"
          >
            {TIME_RANGES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Buffer Range Radius */}
        <div className="flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-2">
          <Compass className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
          <select
            value={radiusKm}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="bg-transparent text-sm text-[#0a1628] focus:outline-none cursor-pointer font-medium"
            aria-label="Buffer radius"
          >
            {RANGE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Run Analysis Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !location.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4fd8] text-white text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading || isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{loading || isSubmitting ? 'Analyzing...' : 'Run Analysis'}</span>
        </button>
      </div>

      {/* Coastal District Quick-Select Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#f1f5f9]">
        <span className="text-[11px] text-[#6b8fc0] font-medium mr-1">Coastal Sectors:</span>
        {REGION_PRESETS.map((preset) => {
          const isActive = location === preset.name;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                  : 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[#4a6fa5]">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Analyzing coastal risk buffer ({radiusKm} km) across Karnataka verified datasets</span>
        </div>
      )}
    </div>
  );
};
