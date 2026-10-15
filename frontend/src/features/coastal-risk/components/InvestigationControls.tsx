import React, { useState } from 'react';
import { MapPin, Clock, Play, Loader2 } from 'lucide-react';

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

export const InvestigationControls: React.FC<Props> = ({ onRunAnalysis, loading }) => {
  const [location, setLocation] = useState('Karnataka State');
  const [timeRange, setTimeRange] = useState('last24h');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (loading || isSubmitting) return;
    setIsSubmitting(true);

    const lowerLoc = location.trim().toLowerCase();
    const isKarnataka = !lowerLoc || lowerLoc.includes('karnataka') || lowerLoc.includes('state') || lowerLoc.includes('all');

    let lat = 13.20, lon = 74.75;
    let radius = 90;
    let query = '';

    if (isKarnataka) {
      lat = 13.20;
      lon = 74.75;
      radius = 90;
      if (timeRange === 'last24h') {
        query = 'Karnataka coastal zone: assess statewide live marine conditions and coastal exposure across Dakshina Kannada and Udupi districts (90km coastal corridor).';
      } else if (timeRange === 'last7d') {
        query = 'Karnataka coastal zone: 7-day ocean conditions and weekly tidal swell impact across all coastal settlements in Karnataka.';
      } else if (timeRange === 'last30d') {
        query = 'Karnataka coastal zone: 30-day spring-tide high-water line and coastal buffer saturation statewide.';
      } else {
        query = 'Karnataka coastal zone: simulate historical Cyclone Tauktae (5.8m waves) regional disaster inundation cone across all Karnataka coastal districts.';
      }
    } else {
      if (lowerLoc.includes('udupi')) { lat = 13.3409; lon = 74.7421; }
      else if (lowerLoc.includes('ullal')) { lat = 12.8055; lon = 74.8564; }
      else if (lowerLoc.includes('surathkal')) { lat = 13.0068; lon = 74.7938; }
      else if (lowerLoc.includes('mangaluru') || lowerLoc.includes('mangalore')) { lat = 12.9141; lon = 74.856; }

      if (timeRange === 'last24h') {
        radius = 10;
        query = `Live 24h marine observation: assess nearshore wave impact and shoreline exposure within ${radius}km of ${location} under live calm conditions.`;
      } else if (timeRange === 'last7d') {
        radius = 15;
        query = `7-day ocean conditions: evaluate weekly tidal swell impact and coastal erosion exposure within ${radius}km of ${location}.`;
      } else if (timeRange === 'last30d') {
        radius = 28;
        query = `30-day ocean state: evaluate monthly spring-tide high-water line and coastal buffer saturation within ${radius}km of ${location}.`;
      } else {
        radius = 40;
        query = `Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone within ${radius}km of ${location}.`;
      }
    }

    onRunAnalysis(query, lat, lon, radius, timeRange);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <div className="p-3 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <div className="flex items-center gap-3">
        {/* Location */}
        <div className="flex-1 flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-[#4a6fa5] flex-shrink-0" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
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
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-transparent text-sm text-[#0a1628] focus:outline-none cursor-pointer"
            aria-label="Time range"
          >
            {TIME_RANGES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
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
          <span>Analyzing coastal risk using live + historical data sources</span>
        </div>
      )}
    </div>
  );
};
