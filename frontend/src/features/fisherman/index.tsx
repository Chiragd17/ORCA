import React, { useState, useEffect } from 'react';
import {
  Ship,
  Waves,
  Wind,
  Compass,
  Thermometer,
  ShieldCheck,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceMapViewer } from '../workspaces-common/WorkspaceMapViewer';
import { WorkspaceChatbot } from '../workspaces-common/WorkspaceChatbot';
import { WorkspaceAnalysisModal } from '../workspaces-common/WorkspaceAnalysisModal';
import { useLiveMarineTelemetry } from '../../lib/liveTelemetry';

export const FishermanWorkspace: React.FC = () => {
  const { telemetry } = useLiveMarineTelemetry();
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [highlightSector, setHighlightSector] = useState<string | null>(null);
  const [activeAdvisory, setActiveAdvisory] = useState({
    status: telemetry.safetyStatus,
    color: telemetry.isSafeForFishing ? 'emerald' : 'amber',
    description: 'Calm swell. Excellent conditions for traditional, motorized, and trawler craft.',
    waveHeight: telemetry.waveHeightFormatted,
    windSpeed: telemetry.windSpeedFormatted,
    windDir: `${telemetry.windDirection}° ${telemetry.windDirLabel}`,
    swellHeight: telemetry.swellHeightFormatted,
    seaTemp: telemetry.seaTempFormatted,
  });

  useEffect(() => {
    setActiveAdvisory(prev => ({
      ...prev,
      waveHeight: telemetry.waveHeightFormatted,
      windSpeed: telemetry.windSpeedFormatted,
      windDir: `${telemetry.windDirection}° ${telemetry.windDirLabel}`,
      swellHeight: telemetry.swellHeightFormatted,
      seaTemp: telemetry.seaTempFormatted,
      status: telemetry.safetyStatus,
      color: telemetry.isSafeForFishing ? 'emerald' : 'amber',
    }));
  }, [telemetry]);

  const quickPrompts = [
    'Is it safe to fish offshore Malpe tomorrow morning?',
    'Check wave height & wind gust forecast near Mangaluru',
    'Are there any active cyclone warnings or depressions in the Arabian Sea?',
  ];

  const handleAnalysisCompleted = (_id: string, answer: string) => {
    setHighlightSector('Mangaluru');
    if (answer.toLowerCase().includes('caution') || answer.toLowerCase().includes('warning')) {
      setActiveAdvisory(prev => ({
        ...prev,
        status: 'Advisory Active',
        color: 'amber',
        description: 'Multi-agent audit identified squall potential. Exercise caution beyond 12nm.',
      }));
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with Live Telemetry Widgets */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Ship className="w-6 h-6 text-blue-600" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[#0a1628]">Fisherman Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Coastal Authority Approved
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API LIVE
              </span>
            </div>
            <p className="text-xs text-[#6b8fc0]">
              Safe seas • Better decisions • Autonomous Open-Meteo & IMD Telemetry
            </p>
          </div>
        </div>

        {/* Header Stat Widgets */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Nearshore Conditions */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <Waves className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Current Conditions (Nearshore)
              </span>
              <div className="flex items-center gap-3 text-xs font-bold text-[#0a1628] mt-0.5">
                <span>Wave: <strong className="text-blue-700">{activeAdvisory.waveHeight}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Wind: <strong className="text-blue-700">{activeAdvisory.windSpeed}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Dir: <strong className="text-blue-700">{activeAdvisory.windDir}</strong></span>
              </div>
            </div>
          </div>

          {/* Coastal Safety Pill */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-emerald-900">Coastal Safety: Normal</div>
              <p className="text-[10.5px] text-emerald-700 font-medium">No active storm warnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Map & Nearby Harbours (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-[#0a1628]">Fishing Zones & Coastal Advisory</h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Dakshina Kannada & Udupi Baseline</span>
              </div>
            </div>

            {/* Interactive Coastal Map Viewer */}
            <WorkspaceMapViewer
              mode="fisherman"
              height="380px"
              center={[74.75, 13.05]}
              zoom={8.1}
              highlightSector={highlightSector}
              onMarkerClick={(name) => setHighlightSector(name)}
            />
          </div>

          {/* Nearby Fishing Harbours Strip */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0a1628] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Nearby Fishing Harbours
              </span>
              <span className="text-[10px] font-mono text-slate-400">Real-time Harbours Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Mangaluru Harbour</h4>
                  <p className="text-[10.5px] text-slate-500">2.4 km distance</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Safe
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Ullal Harbour</h4>
                  <p className="text-[10.5px] text-slate-500">8.7 km distance</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Safe
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Surathkal Harbour</h4>
                  <p className="text-[10.5px] text-slate-500">14.2 km distance</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Safe
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Advisory Cards & AI Execution (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Today's Advisory */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Today's Advisory
            </span>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {activeAdvisory.status}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeAdvisory.description}
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Info
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-blue-500" /> Wave Height
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeAdvisory.waveHeight}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-cyan-500" /> Wind Speed
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeAdvisory.windSpeed}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-indigo-500" /> Swell Height
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeAdvisory.swellHeight}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-rose-500" /> Sea Temp
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeAdvisory.seaTemp}
                </span>
              </div>
            </div>

            {/* Run Fisherman Advisory Analysis Button */}
            <button
              type="button"
              onClick={() => setAnalysisModalOpen(true)}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Fisherman Advisory Analysis</span>
            </button>
          </div>

          {/* Alert Status Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>No active cyclone alerts</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Conditions are stable in Karnataka coastal waters across 168 forecast hours.
            </p>
          </div>
        </div>
      </div>

      {/* Floating AI Chatbot Copilot */}
      <WorkspaceChatbot
        workspace="fisherman"
        workspaceTitle="Fisherman"
        quickPrompts={quickPrompts}
        locationName={highlightSector ? `${highlightSector} Coastal Sector` : 'Karnataka Coastal Shelf'}
        latitude={highlightSector === 'Karwar' ? 14.81 : highlightSector === 'Malpe' ? 13.35 : 12.91}
        longitude={highlightSector === 'Karwar' ? 74.13 : highlightSector === 'Malpe' ? 74.70 : 74.85}
        onAnalysisGenerated={() => {
          setHighlightSector('Mangaluru');
        }}
      />

      {/* Analysis Execution Modal */}
      <WorkspaceAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        workspace="fisherman"
        workspaceTitle="Fisherman Advisory"
        defaultQuery="Investigate offshore wave height, wind speeds, and Douglas Sea State thresholds near Mangaluru and Malpe over next 24-48 hours."
        plannedAgents={['ocean_research', 'marine_hazard']}
        onCompleted={handleAnalysisCompleted}
      />
    </div>
  );
};
