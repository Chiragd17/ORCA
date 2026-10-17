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
  { value: 15, label: '15 km (Shoreline Baseline)' },
  { value: 25, label: '25 km (Nearshore Estuary)' },
  { value: 40, label: '40 km (District Corridor)' },
  { value: 90, label: '90 km (Statewide Karnataka)' },
];

export const InvestigationControls: React.FC<Props> = ({ onRunAnalysis, loading }) => {
  const [location, setLocation] = useState('Karnataka State');
  const [timeRange, setTimeRange] = useState('historical');
  const [radiusKm, setRadiusKm] = useState<number>(90);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCoordinates = (locStr: string) => {
    const lowerLoc = locStr.trim().toLowerCase();
    const isKarnataka = !lowerLoc || lowerLoc.includes('karnataka') || lowerLoc.includes('state') || lowerLoc.includes('all');
    if (isKarnataka) return { lat: 13.20, lon: 74.75, isKarnataka: true };

    let lat = 12.9141, lon = 74.856;
    if (lowerLoc.includes('udupi')) { lat = 13.3409; lon = 74.7421; }
    else if (lowerLoc.includes('ullal')) { lat = 12.8055; lon = 74.8564; }
    else if (lowerLoc.includes('surathkal')) { lat = 13.0068; lon = 74.7938; }
    else if (lowerLoc.includes('kundapura')) { lat = 13.6264; lon = 74.6934; }
    else if (lowerLoc.includes('mangaluru') || lowerLoc.includes('mangalore')) { lat = 12.9141; lon = 74.856; }
    return { lat, lon, isKarnataka: false };
  };

  const buildQuery = (locStr: string, rad: number, tr: string, isKar: boolean) => {
    if (isKar) {
      if (tr === 'last24h') {
        return `Live 24h marine observation: assess nearshore wave impact and baseline exposure within ${rad}km of Karnataka coast under calm sea conditions.`;
      } else if (tr === 'last7d') {
        return `7-day ocean conditions: evaluate weekly tidal swell impact and coastal erosion exposure within ${rad}km of Karnataka coast.`;
      } else if (tr === 'last30d') {
        return `30-day ocean state: evaluate monthly spring-tide high-water line and coastal buffer saturation within ${rad}km of Karnataka coast.`;
      } else {
        return `Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone within ${rad}km of Karnataka coast.`;
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
    if (newTr === 'last24h') newRad = 15;
    else if (newTr === 'last7d') newRad = 25;
    else if (newTr === 'last30d') newRad = 40;
    else if (newTr === 'historical') newRad = 90;

    setRadiusKm(newRad);
    executeAnalysis(location, newRad, newTr);
  };

  const handleRadiusChange = (newRad: number) => {
    setRadiusKm(newRad);
    executeAnalysis(location, newRad, timeRange);
  };

  const handleSubmit = () => {
    executeAnalysis(location, radiusKm, timeRange);
  };

  return (
    <div className="p-3 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
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
            placeholder="Karnataka State"
            aria-label="Geographic area"
          />
        </div>

        {/* Time Range */}
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
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4fd8] text-white text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Run Analysis</span>
        </button>
      </div>

      {loading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[#4a6fa5]">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Analyzing coastal risk buffer ({radiusKm} km) across verified datasets</span>
        </div>
      )}
    </div>
  );
};
