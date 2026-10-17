import React, { useState } from 'react';
import {
  Play,
  X,
  Compass,
  MapPin,
  Sparkles,
  Bot,
  AlertCircle,
} from 'lucide-react';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    workspace: string;
    query: string;
    latitude: number;
    longitude: number;
    radius_km: number;
  }) => Promise<void>;
  loading: boolean;
}

const SAMPLE_QUERIES = [
  {
    label: 'Cyclone Tauktae Waves & Karnataka Coastal Exposure',
    workspace: 'disaster_management',
    query: 'Cyclone Tauktae wave surge and coastal population exposure across Dakshina Kannada and Udupi',
    lat: 13.15,
    lon: 74.80,
    radius: 120,
    agents: ['Marine Hazard', 'Coastal Risk', 'Evidence Verification'],
  },
  {
    label: 'Arabian Sea SST Anomaly & Thermal Trend Analysis',
    workspace: 'marine_monitoring',
    query: 'Assess sea surface temperature anomalies and chlorophyll-a biological productivity off Mangaluru',
    lat: 12.91,
    lon: 74.85,
    radius: 60,
    agents: ['Ocean Research', 'Evidence Verification'],
  },
  {
    label: 'Port Swell Surge Alert & Douglas Sea State Check',
    workspace: 'fisherman',
    query: 'High wave swell alert and Douglas sea state classification for Karwar fishing harbor',
    lat: 14.81,
    lon: 74.13,
    radius: 50,
    agents: ['Marine Hazard', 'Ocean Research', 'Evidence Verification'],
  },
  {
    label: 'Coastal Settlement Exposure & Critical Ports',
    workspace: 'coastal_authority',
    query: 'Analyze coastal settlement exposure and critical infrastructure risk in Dakshina Kannada',
    lat: 12.91,
    lon: 74.85,
    radius: 80,
    agents: ['Coastal Risk', 'Evidence Verification'],
  },
];

export const InvestigationLauncher: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [workspace, setWorkspace] = useState('disaster_management');
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query);
  const [lat, setLat] = useState(SAMPLE_QUERIES[0].lat);
  const [lon, setLon] = useState(SAMPLE_QUERIES[0].lon);
  const [radius, setRadius] = useState(SAMPLE_QUERIES[0].radius);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = (sample: typeof SAMPLE_QUERIES[0]) => {
    setWorkspace(sample.workspace);
    setQuery(sample.query);
    setLat(sample.lat);
    setLon(sample.lon);
    setRadius(sample.radius);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please provide an analytical question or objective for the agents.');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        workspace,
        query: query.trim(),
        latitude: Number(lat),
        longitude: Number(lon),
        radius_km: Number(radius),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Investigation execution encountered an error.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#d8e4f0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0a1628]">
                Launch Autonomous Multi-Agent Investigation
              </h2>
              <p className="text-xs text-[#64748b]">
                Orchestrates specialist agents with dependency graphs and mandatory scientific verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sample Prompts */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Curated Multi-Domain Scenarios</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_QUERIES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="p-2.5 text-left rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/60 hover:border-indigo-300 transition-all text-xs group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate">
                    {sample.label}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                    <span>Agents: {sample.agents.join(' → ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Workspace Context */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">
              Requesting Workspace
            </label>
            <select
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="disaster_management">Disaster Management (Multi-Domain Hazard & Exposure)</option>
              <option value="coastal_authority">Coastal Authority (Infrastructure & Risk)</option>
              <option value="fisherman">Fisherman Advisory (Waves & Swells)</option>
              <option value="marine_monitoring">Marine Monitoring (Ocean Research & SST)</option>
              <option value="protected_areas">Protected Areas (Ecological Impact)</option>
            </select>
          </div>

          {/* Analytical Prompt / Query */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">
              Investigation Prompt / Natural Language Objective
            </label>
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Assess Cyclone Tauktae surge and wave impact on coastal Karnataka population..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Geographic Coordinates & Radius */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-500" />
                <span>Latitude (°N)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-500" />
                <span>Longitude (°E)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                Radius (km)
              </label>
              <input
                type="number"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Execution Architecture Notice */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900 leading-relaxed">
            <Bot className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>
              The Orchestrator will dynamically construct an execution plan, run concurrent independent specialists, resolve sequential dependencies, invoke the Evidence & Scientific Verification Agent, and persist the results in PostgreSQL.
            </span>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{loading ? 'Dispatching Multi-Agent Pipeline...' : 'Execute Investigation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
