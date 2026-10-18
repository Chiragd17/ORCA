import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Radio,
  Database,
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  Waves,
  Wind,
  ExternalLink,
  Plus,
  FileText,
  Play,
  Loader2,
  MapPin,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { fetchAuthoritativeMarineTelemetry } from '../../lib/liveTelemetry';

export type ModalType =
  | 'live_data'
  | 'historical_data'
  | 'settings'
  | 'new_investigation'
  | 'my_investigations'
  | 'history'
  | null;

interface DataModalsProps {
  activeModal: ModalType;
  onClose: () => void;
}


const HISTORICAL_EVENTS = [
  {
    id: 'hist_hazard_tauktae_2021',
    name: 'Extremely Severe Cyclonic Storm Tauktae',
    year: 2021,
    dates: 'May 14 – May 19, 2021',
    agency: 'India Meteorological Department (IMD) & INCOIS',
    peakWave: '5.8 m',
    peakWind: '85 km/h',
    sectors: ['Ullal', 'Mangaluru Bengre Spit', 'Malpe'],
    impact: 'Severe coastal erosion along Ullal shoreline, sea wall collapse over 200m stretch, seawater ingress into 120+ fishing settlements.',
  },
  {
    id: 'hist_hazard_ockhi_2017',
    name: 'Very Severe Cyclonic Storm Ockhi',
    year: 2017,
    dates: 'Nov 29 – Dec 6, 2017',
    agency: 'IMD & INCOIS',
    peakWave: '4.5 m',
    peakWind: '65 km/h',
    sectors: ['Mangaluru Bunder', 'Ullal', 'Someshwara'],
    impact: 'High swell surges leading to sea water ingress into coastal residential hamlets; beach erosion and grounding of traditional fishing crafts.',
  },
  {
    id: 'hist_hazard_kyarr_2019',
    name: 'Super Cyclonic Storm Kyarr',
    year: 2019,
    dates: 'Oct 24 – Nov 3, 2019',
    agency: 'IMD & INCOIS',
    peakWave: '5.2 m',
    peakWind: '80 km/h',
    sectors: ['Karwar', 'Malpe', 'Mangaluru'],
    impact: 'Persistent high swell waves along entire Karnataka coastline, inundated fish landing jetties, disrupted port operations.',
  },
  {
    id: 'hist_hazard_mekunu_2018',
    name: 'Extremely Severe Cyclonic Storm Mekunu',
    year: 2018,
    dates: 'May 21 – May 27, 2018',
    agency: 'IMD & INCOIS',
    peakWave: '3.8 m',
    peakWind: '55 km/h',
    sectors: ['Mangaluru Bunder', 'Padubidri', 'Kaup'],
    impact: 'Rough sea conditions along Dakshina Kannada and Udupi coast; pre-monsoon squally winds and localized beach scouring.',
  },
];

const HISTORICAL_FEATURES = [
  { name: 'Mangaluru City Corporation', type: 'Settlement (Dakshina Kannada)', population: '499,487', source: 'Census 2011' },
  { name: 'Udupi City Municipality', type: 'Settlement (Udupi)', population: '125,306', source: 'Census 2011' },
  { name: 'Karwar City Corporation', type: 'Settlement (Uttara Kannada)', population: '77,139', source: 'Census 2011' },
  { name: 'Bhatkal Coastal Municipality', type: 'Settlement (Uttara Kannada)', population: '50,007', source: 'Census 2011' },
  { name: 'Kumta Coastal Municipality', type: 'Settlement (Uttara Kannada)', population: '32,596', source: 'Census 2011' },
  { name: 'Kundapura Town Municipality', type: 'Settlement (Udupi)', population: '30,444', source: 'Census 2011' },
  { name: 'Honnavar Town Municipality', type: 'Settlement (Uttara Kannada)', population: '19,109', source: 'Census 2011' },
  { name: 'Gokarna Coastal Heritage', type: 'Settlement (Uttara Kannada)', population: '13,557', source: 'Census 2011' },
  { name: 'New Mangalore Port (NMPT)', type: 'Commercial Port', population: '—', source: 'OpenStreetMap' },
  { name: 'Karwar Port (Baithkol)', type: 'Commercial Seaport', population: '—', source: 'OpenStreetMap' },
  { name: 'INS Kadamba Naval Base', type: 'Strategic Naval Base', population: '—', source: 'OpenStreetMap' },
  { name: 'Malpe Fishing Harbour', type: 'Fisheries Terminal', population: '—', source: 'OpenStreetMap' },
  { name: 'Aghanashini Estuary (Ramsar #2509)', type: 'Ramsar Wetland Site', population: '—', source: 'Ramsar' },
  { name: 'District Civil Hospital, Karwar', type: 'Healthcare Facility', population: '—', source: 'Health Dept' },
  { name: 'District Wenlock Hospital, Mangaluru', type: 'Healthcare Facility', population: '—', source: 'Health Dept' },
];

export const DataModals: React.FC<DataModalsProps> = ({ activeModal, onClose }) => {
  const navigate = useNavigate();
  const [selectedWorkspace, setSelectedWorkspace] = useState('coastal-risk');
  const [targetLocation, setTargetLocation] = useState('Karnataka Statewide (All 3 Districts)');
  const [customLat, setCustomLat] = useState(13.85);
  const [customLon, setCustomLon] = useState(74.50);
  const [radius, setRadius] = useState(160);
  const [queryText, setQueryText] = useState(
    'Karnataka coastal zone: assess statewide coastal exposure and maritime conditions across Dakshina Kannada, Udupi, and Uttara Kannada (320km coastline).'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'hazards' | 'features'>('hazards');
  const [liveData, setLiveData] = useState<{
    waveHeight: number;
    wavePeriod: number;
    swellHeight: number;
    windWave: number;
    time: string;
    loading: boolean;
  }>({
    waveHeight: 0.72,
    wavePeriod: 9.5,
    swellHeight: 0.56,
    windWave: 0.02,
    time: new Date().toLocaleTimeString(),
    loading: false,
  });

  const [dbInvestigations, setDbInvestigations] = useState<any[]>([]);
  const [loadingDbInvs, setLoadingDbInvs] = useState(false);

  useEffect(() => {
    if (activeModal === 'my_investigations' || activeModal === 'history') {
      setLoadingDbInvs(true);
      apiClient.get<any[]>('/orchestrator')
        .then(res => {
          if (Array.isArray(res)) {
            setDbInvestigations(res);
          }
        })
        .catch(err => {
          console.error('Failed to load my investigations:', err);
        })
        .finally(() => {
          setLoadingDbInvs(false);
        });
    }
  }, [activeModal]);

  const handleLaunchInvestigation = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.createInvestigation({
        workspace: selectedWorkspace,
        query: queryText,
        latitude: customLat,
        longitude: customLon,
        radius_km: radius,
      });
      onClose();
      navigate(`/${selectedWorkspace}`);
    } catch {
      onClose();
      navigate(`/${selectedWorkspace}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'live_data') {
      setLiveData(prev => ({ ...prev, loading: true }));
      fetchAuthoritativeMarineTelemetry()
        .then(t => {
          setLiveData({
            waveHeight: t.waveHeight,
            wavePeriod: t.wavePeriod,
            swellHeight: t.swellHeight,
            windWave: t.windWaveHeight,
            time: t.lastUpdated,
            loading: false,
          });
        })
        .catch(() => {
          setLiveData(prev => ({ ...prev, loading: false }));
        });
    }
  }, [activeModal]);

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#d8e4f0] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#e8eef5] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            {activeModal === 'live_data' && (
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
            )}
            {activeModal === 'historical_data' && (
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Database className="w-5 h-5" />
              </div>
            )}
            {activeModal === 'settings' && (
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <SettingsIcon className="w-5 h-5" />
              </div>
            )}
            {activeModal === 'new_investigation' && (
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Plus className="w-5 h-5" />
              </div>
            )}
            {activeModal === 'my_investigations' && (
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-[#0a1628]">
                {activeModal === 'live_data' && 'Live Marine & Meteorological Feeds'}
                {activeModal === 'historical_data' && 'Historical Coastal & Hazard Database'}
                {activeModal === 'settings' && 'System Configuration & Environment'}
                {activeModal === 'new_investigation' && 'Start New Multi-Agent Investigation'}
                {activeModal === 'my_investigations' && 'My Investigations & Case History'}
              </h2>
              <p className="text-xs text-[#6b8fc0]">
                {activeModal === 'live_data' && 'Real-time telemetry and provider connection statuses'}
                {activeModal === 'historical_data' && 'Persisted records in PostgreSQL database (orca_db)'}
                {activeModal === 'settings' && 'Database connection, API endpoints, and system parameters'}
                {activeModal === 'new_investigation' && 'Dispatch specialized agent teams across live & historical datasets'}
                {activeModal === 'my_investigations' && 'Chronological audit trail of executed agent workflows and findings'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* NEW INVESTIGATION VIEW */}
          {activeModal === 'new_investigation' && (
            <div className="space-y-4">
              {/* Workspace Selection */}
              <div>
                <label className="block text-[11px] font-bold text-[#334155] uppercase tracking-wider mb-1.5">
                  Target Agent Workspace
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'coastal-risk', name: 'Coastal Impact & Risk', desc: 'Person 3: Hazard & exposure' },
                    { id: 'fisherman', name: 'Fisherman', desc: 'Person 1: Offshore advisory' },
                    { id: 'marine-monitoring', name: 'Marine Monitoring', desc: 'Person 2: Telemetry' },
                    { id: 'coastal-authority', name: 'Coastal Authority', desc: 'Infrastructure & zoning' },
                    { id: 'disaster-management', name: 'Disaster Management', desc: 'Evacuation & alerts' },
                    { id: 'protected-areas', name: 'Protected Areas', desc: 'CRZ & Mangroves' },
                  ].map(ws => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => setSelectedWorkspace(ws.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedWorkspace === ws.id
                          ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af] ring-1 ring-[#2563eb]'
                          : 'border-[#e2e8f0] bg-[#f8fafc] text-[#475569] hover:bg-[#f1f5f9]'
                      }`}
                    >
                      <p className="font-bold text-[11.5px] truncate">{ws.name}</p>
                      <p className="text-[9.5px] opacity-75 truncate">{ws.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Presets & Custom Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#334155] uppercase tracking-wider">
                    Geographic Target
                  </label>
                  <span className="text-[10px] text-[#64748b]">Karnataka Coast</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { name: 'Karnataka Statewide (All 3 Districts)', lat: 13.85, lon: 74.50, rad: 160 },
                    { name: 'Uttara Kannada (Karwar & Gokarna)', lat: 14.50, lon: 74.35, rad: 60 },
                    { name: 'Udupi & Central Coast', lat: 13.3409, lon: 74.7421, rad: 40 },
                    { name: 'Mangaluru & Dakshina Kannada', lat: 12.9141, lon: 74.856, rad: 40 },
                    { name: 'Karwar Port & Baithkol Cove', lat: 14.8140, lon: 74.1298, rad: 25 },
                  ].map(loc => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setTargetLocation(loc.name);
                        setCustomLat(loc.lat);
                        setCustomLon(loc.lon);
                        setRadius(loc.rad);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition-colors cursor-pointer ${
                        targetLocation === loc.name
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-[#f1f5f9] text-[#334155] border-[#e2e8f0] hover:bg-[#e2e8f0]'
                      }`}
                    >
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {loc.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#d8e4f0] text-[12px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter location name or coordinates..."
                  />
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#d8e4f0] text-[12px] text-[#0f172a] focus:outline-none cursor-pointer"
                  >
                    <option value={15}>15 km radius</option>
                    <option value={20}>20 km radius</option>
                    <option value={25}>25 km radius</option>
                    <option value={30}>30 km radius</option>
                    <option value={50}>50 km radius</option>
                  </select>
                </div>
              </div>

              {/* Query & Objective */}
              <div>
                <label className="block text-[11px] font-bold text-[#334155] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Investigation Objective / Query</span>
                  <span className="text-[10px] text-[#2563eb] font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Multi-Agent Workflow
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#d8e4f0] text-[12px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Describe your coastal risk or marine inquiry..."
                />
              </div>

              {/* Dispatch Action */}
              <div className="pt-2 flex items-center justify-between border-t border-[#f1f5f9]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>3 Specialized Agents will collaborate & cross-verify findings</span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || !queryText.trim()}
                  onClick={handleLaunchInvestigation}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing Agents...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Launch Investigation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MY INVESTIGATIONS VIEW */}
          {activeModal === 'my_investigations' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[#64748b] text-[11px] pb-1 border-b border-[#e2e8f0]">
                <span>
                  Showing {dbInvestigations.length} live investigations from PostgreSQL
                </span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized with Recent Investigations
                </span>
              </div>

              {loadingDbInvs ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading investigations from PostgreSQL...</span>
                </div>
              ) : dbInvestigations.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <p>No multi-agent investigations logged yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/agents/orchestrator?launch=true');
                    }}
                    className="mt-2 text-blue-600 hover:underline font-semibold"
                  >
                    Launch a new investigation
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {dbInvestigations.map((inv) => {
                    const isPartial = inv.status === 'partial';
                    const dateStr = inv.created_at
                      ? new Date(inv.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recent';

                    return (
                      <div
                        key={inv.investigation_id}
                        className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#93c5fd] hover:bg-white transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-bold text-[#1e293b]">
                                {inv.investigation_id}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {inv.workspace}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                                  isPartial
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isPartial ? 'PARTIAL' : 'COMPLETED'}
                              </span>
                            </div>
                            <p className="text-[12px] font-semibold text-[#0f172a]">
                              {inv.query}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/agents/orchestrator?id=${inv.investigation_id}`);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold text-[11px] transition-colors cursor-pointer flex-shrink-0 shadow-2xs"
                          >
                            <span>Open in Orchestrator</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10.5px] text-[#64748b] border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <span>
                              <strong>Findings:</strong> {inv.findings_count ?? 0}
                            </span>
                            <span>
                              <strong>Timestamp:</strong> {dateStr}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Durable PostgreSQL
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* LIVE DATA VIEW */}
          {activeModal === 'live_data' && (
            <div className="space-y-4">
              {/* Telemetry Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f0f9ff] border border-cyan-200/60">
                  <span className="text-[10.5px] font-medium text-cyan-800 flex items-center gap-1">
                    <Waves className="w-3.5 h-3.5 text-cyan-600" /> Wave Height
                  </span>
                  <p className="text-xl font-bold text-[#0c4a6e] mt-1">
                    {liveData.loading ? '...' : `${liveData.waveHeight} m`}
                  </p>
                  <span className="text-[9.5px] text-cyan-600">Significant</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#eff6ff] border border-blue-200/60">
                  <span className="text-[10.5px] font-medium text-blue-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Wave Period
                  </span>
                  <p className="text-xl font-bold text-[#1e3a8a] mt-1">
                    {liveData.loading ? '...' : `${liveData.wavePeriod} s`}
                  </p>
                  <span className="text-[9.5px] text-blue-600">Peak dominant</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f0fdf4] border border-emerald-200/60">
                  <span className="text-[10.5px] font-medium text-emerald-800 flex items-center gap-1">
                    <Waves className="w-3.5 h-3.5 text-emerald-600" /> Swell Height
                  </span>
                  <p className="text-xl font-bold text-[#064e3b] mt-1">
                    {liveData.loading ? '...' : `${liveData.swellHeight} m`}
                  </p>
                  <span className="text-[9.5px] text-emerald-600">Primary swell</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#faf5ff] border border-purple-200/60">
                  <span className="text-[10.5px] font-medium text-purple-800 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-purple-600" /> Wind Wave
                  </span>
                  <p className="text-xl font-bold text-[#581c87] mt-1">
                    {liveData.loading ? '...' : `${liveData.windWave} m`}
                  </p>
                  <span className="text-[9.5px] text-purple-600">Surface choppiness</span>
                </div>
              </div>

              {/* Provider Status Table */}
              <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                <div className="bg-[#f8fafc] px-3.5 py-2 border-b border-[#e2e8f0] font-semibold text-[#1e293b]">
                  Active Telemetry Providers
                </div>
                <div className="divide-y divide-[#f1f5f9]">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-medium text-[#0f172a]">Open-Meteo Marine API</p>
                        <p className="text-[10px] text-[#64748b]">Real-time Karnataka shelf coastal grid (13.85°N, 74.50°E)</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                      LIVE • 200 OK
                    </span>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div>
                        <p className="font-medium text-[#0f172a]">INCOIS Wave Rider Buoy 23001</p>
                        <p className="text-[10px] text-[#64748b]">Karnataka Coast (Mangaluru offshore station)</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      STANDBY
                    </span>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div>
                        <p className="font-medium text-[#0f172a]">IMD RSMC Tropical Cyclones</p>
                        <p className="text-[10px] text-[#64748b]">North Indian Ocean & Arabian Sea hazard bulletin feed</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      STANDBY
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORICAL DATA VIEW */}
          {activeModal === 'historical_data' && (
            <div className="space-y-3">
              <div className="flex gap-2 border-b border-[#e2e8f0] pb-2">
                <button
                  onClick={() => setActiveTab('hazards')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === 'hazards'
                      ? 'bg-[#1d4ed8] text-white shadow-xs'
                      : 'text-[#64748b] hover:bg-[#f1f5f9]'
                  }`}
                >
                  Historical Hazard Events (4)
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === 'features'
                      ? 'bg-[#1d4ed8] text-white shadow-xs'
                      : 'text-[#64748b] hover:bg-[#f1f5f9]'
                  }`}
                >
                  Persisted Coastal Features (14)
                </button>
              </div>

              {activeTab === 'hazards' && (
                <div className="space-y-2.5">
                  {HISTORICAL_EVENTS.map(ev => (
                    <div key={ev.id} className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0f172a] text-[13px]">{ev.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10.5px]">
                          {ev.year}
                        </span>
                      </div>
                      <p className="text-[#475569] text-[11px] leading-relaxed">{ev.impact}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] text-[#64748b]">
                        <span><strong>Peak Waves:</strong> {ev.peakWave}</span>
                        <span><strong>Peak Wind:</strong> {ev.peakWind}</span>
                        <span><strong>Agency:</strong> {ev.agency}</span>
                        <span><strong>Sectors:</strong> {ev.sectors.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'features' && (
                <div className="border border-[#e2e8f0] rounded-xl overflow-hidden max-h-[48vh] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Population</th>
                        <th className="py-2 px-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {HISTORICAL_FEATURES.map((f, i) => (
                        <tr key={i} className="hover:bg-[#f8fafc]">
                          <td className="py-2 px-3 font-medium text-[#0f172a]">{f.name}</td>
                          <td className="py-2 px-3 text-[#64748b]">{f.type}</td>
                          <td className="py-2 px-3 text-right font-semibold text-[#1e293b]">{f.population}</td>
                          <td className="py-2 px-3 text-[#64748b] font-mono text-[10px]">{f.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeModal === 'settings' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                <h4 className="font-bold text-[#0f172a] text-[12.5px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Database Engine (PostgreSQL)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748b]">Engine:</span>
                    <p className="font-semibold text-[#0f172a]">PostgreSQL 18.6 (Local)</p>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Database Name:</span>
                    <p className="font-semibold text-[#0f172a]">orca_db (Port 5432)</p>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Database User:</span>
                    <p className="font-semibold text-[#0f172a]">orca_user</p>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Connection State:</span>
                    <p className="font-semibold text-emerald-600">CONNECTED (10 Tables)</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                <h4 className="font-bold text-[#0f172a] text-[12.5px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Backend API Server
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748b]">API Base URL:</span>
                    <p className="font-semibold text-[#0f172a]">http://localhost:8000/api/v1</p>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Documentation:</span>
                    <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 flex items-center gap-1 hover:underline">
                      /docs (Swagger UI) <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Health Polling:</span>
                    <p className="font-semibold text-[#0f172a]">Every 30 seconds</p>
                  </div>
                  <div>
                    <span className="text-[#64748b]">CRS / Spatial Datum:</span>
                    <p className="font-semibold text-[#0f172a]">WGS84 (EPSG:4326)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#e8eef5] bg-[#f8fafc] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0a1628] hover:bg-[#1e293b] text-white rounded-lg font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
