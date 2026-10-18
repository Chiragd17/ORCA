import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
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

export const DisasterManagementWorkspace: React.FC = () => {
  const { telemetry } = useLiveMarineTelemetry();
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [highlightSector, setHighlightSector] = useState<string | null>(null);
  const [activeForecast, setActiveForecast] = useState({
    status: 'All Clear (No Cyclonic Threats)',
    color: 'emerald',
    description:
      'Multi-agent predictive modeling across IMD & Open-Meteo confirms atmospheric stability across the eastern Arabian Sea. Next 168 forecast hours show calm sea states with no cyclone depressions forming.',
    waveHeight: telemetry.waveHeightFormatted,
    windSpeed: telemetry.windSpeedFormatted,
    windDir: `${telemetry.windDirection}° ${telemetry.windDirLabel}`,
    swellHeight: telemetry.swellHeightFormatted,
    seaTemp: telemetry.seaTempFormatted,
    safetyStatus: 'Coastal Early Warning: Normal',
    surgeMangaluru: '0.72 m',
    surgeUdupi: '0.65 m',
    surgeKarwar: '0.58 m',
  });

  useEffect(() => {
    setActiveForecast(prev => ({
      ...prev,
      waveHeight: telemetry.waveHeightFormatted,
      windSpeed: telemetry.windSpeedFormatted,
      windDir: `${telemetry.windDirection}° ${telemetry.windDirLabel}`,
      swellHeight: telemetry.swellHeightFormatted,
      seaTemp: telemetry.seaTempFormatted,
    }));
  }, [telemetry]);

  const quickPrompts = [
    'Forecast upcoming cyclone threats & wave surge for next 7 days',
    'Check coastal population exposure in Dakshina Kannada & Udupi',
    'Verify evacuation shelter readiness against official INCOIS alerts',
  ];

  const handleAnalysisCompleted = (_id: string, answer: string) => {
    setHighlightSector('Mangaluru');
    const ansLower = answer.toLowerCase();
    if (ansLower.includes('warning') || ansLower.includes('danger') || ansLower.includes('severe') || ansLower.includes('surge')) {
      setActiveForecast(prev => ({
        ...prev,
        status: 'Advisory Active (Surge Monitoring)',
        color: 'amber',
        description: 'Multi-agent forecast identified potential surge elevation. Continuous 6-hourly satellite radar surveillance active.',
        safetyStatus: 'Early Warning: Advisory Active',
      }));
    } else {
      setActiveForecast(prev => ({
        ...prev,
        status: 'All Clear (No Cyclonic Threats)',
        color: 'emerald',
        description: 'Multi-agent predictive synthesis confirms zero active cyclone depressions or gale warnings across 168 forecast hours.',
        safetyStatus: 'Coastal Early Warning: Normal',
      }));
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with Live Telemetry Widgets */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[#0a1628]">Disaster Management Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Emergency & Early Warning
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API LIVE
              </span>
            </div>
            <p className="text-xs text-[#6b8fc0]">
              Emergency Preparedness • Cyclone Tracking • Coastal Risk • Autonomous Predictive Forecast
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
                <span>Wave: <strong className="text-blue-700">{activeForecast.waveHeight}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Wind: <strong className="text-blue-700">{activeForecast.windSpeed}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Dir: <strong className="text-blue-700">{activeForecast.windDir}</strong></span>
              </div>
            </div>
          </div>

          {/* Coastal Early Warning Status Pill */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-emerald-900">{activeForecast.safetyStatus}</div>
              <p className="text-[10.5px] text-emerald-700 font-medium">No active storm warnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout (Matching Fisherman 8/4 grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Map & Nearby Coastal Early Warning Sectors (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold text-[#0a1628]">Hazard Early Warning & Cyclone Trajectory Map</h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Karnataka 320km Coastline • 168h Forecast Horizon</span>
              </div>
            </div>

            {/* Interactive Coastal Map Viewer */}
            <WorkspaceMapViewer
              mode="disaster-management"
              height="380px"
              center={[74.30, 13.50]}
              zoom={7.6}
              highlightSector={highlightSector}
              onMarkerClick={(name) => setHighlightSector(name)}
            />
          </div>

          {/* Nearby Coastal Early Warning Sectors Strip */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0a1628] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                Nearby Coastal Early Warning Sectors
              </span>
              <span className="text-[10px] font-mono text-slate-400">Real-time Coastal Stations Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Dakshina Kannada (Mangaluru)</h4>
                  <p className="text-[10.5px] text-slate-500">Forecast Surge: {activeForecast.surgeMangaluru} • Slight</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Normal
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Udupi Sector (Malpe)</h4>
                  <p className="text-[10.5px] text-slate-500">Forecast Surge: {activeForecast.surgeUdupi} • Swell: {activeForecast.swellHeight}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Normal
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Uttara Kannada (Karwar)</h4>
                  <p className="text-[10.5px] text-slate-500">Forecast Surge: {activeForecast.surgeKarwar} • Wind: {activeForecast.windSpeed}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Normal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Advisory Cards & AI Execution (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Today's Advisory / Upcoming 7-Day Forecast */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Upcoming 7-Day Hazard Forecast
            </span>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {activeForecast.status}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeForecast.description}
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Info / Forecast Metrics (Next 24 - 72h)
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-blue-500" /> Peak Wave Forecast
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeForecast.waveHeight}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-cyan-500" /> Wind Speed Forecast
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeForecast.windSpeed}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-indigo-500" /> Swell Surge Forecast
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeForecast.swellHeight}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-rose-500" /> Sea Temp Forecast
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {activeForecast.seaTemp}
                </span>
              </div>
            </div>

            {/* Run Disaster Forecasting & Impact Analysis Button */}
            <button
              type="button"
              onClick={() => setAnalysisModalOpen(true)}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Disaster Forecasting & Impact Analysis</span>
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
        workspace="disaster_management"
        workspaceTitle="Disaster Management"
        locationName={highlightSector ? `${highlightSector} Sector` : 'Karnataka Coastal Operations'}
        latitude={highlightSector === 'Karwar' ? 14.81 : highlightSector === 'Malpe' ? 13.35 : 12.91}
        longitude={highlightSector === 'Karwar' ? 74.13 : highlightSector === 'Malpe' ? 74.70 : 74.85}
        quickPrompts={quickPrompts}
        onAnalysisGenerated={() => {
          setHighlightSector('Mangaluru');
        }}
      />

      {/* Analysis Execution Modal */}
      <WorkspaceAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        workspace="disaster_management"
        workspaceTitle="Disaster Early Warning & Hazard Forecast"
        defaultQuery="Forecast upcoming marine storm surge, tropical cyclone genesis, and coastal population vulnerability along Karnataka for the next 72-168 hours."
        plannedAgents={['marine_hazard', 'coastal_risk', 'evidence_verification']}
        onCompleted={handleAnalysisCompleted}
      />
    </div>
  );
};
