import React, { useState } from 'react';
import {
  AlertTriangle,
  Flame,
  Compass,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { WorkspaceMapViewer } from '../workspaces-common/WorkspaceMapViewer';
import { WorkspaceChatbot } from '../workspaces-common/WorkspaceChatbot';
import { WorkspaceAnalysisModal } from '../workspaces-common/WorkspaceAnalysisModal';

const RECENT_HAZARDS = [
  { name: 'Cyclone Tauktae (2021)', impact: 'High waves • Coastal flooding', peakWave: '5.8 m', year: 2021, severe: true },
  { name: 'Cyclone Ockhi (2017)', impact: 'High waves • Coastal impact', peakWave: '4.6 m', year: 2017, severe: true },
  { name: 'Cyclone Nisarga (2020)', impact: 'High winds • Heavy rainfall', peakWave: '4.2 m', year: 2020, severe: false },
  { name: 'Kallakkadal Swell (2024)', impact: 'Swell surge • Saltwater ingress', peakWave: '3.4 m', year: 2024, severe: false },
];

export const DisasterManagementWorkspace: React.FC = () => {
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [highlightSector, setHighlightSector] = useState<string | null>(null);
  const [selectedStormQuery, setSelectedStormQuery] = useState(
    'Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone across entire 320km Karnataka coastline.'
  );

  const quickPrompts = [
    'Simulate Cyclone Tauktae 5.8m surge inundation cone',
    'Check coastal population exposure in Dakshina Kannada & Udupi',
    'Verify evacuation shelter readiness against official INCOIS alerts',
  ];

  const handleSimulateEvent = (stormName: string) => {
    const q = `Simulate coastal inundation cone, storm surge velocity, and population exposure for ${stormName} across Karnataka coastline.`;
    setSelectedStormQuery(q);
    setAnalysisModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              Alerts • Cyclones • Preparedness • Response • IBTrACS & GDACS Disaster Ingestion
            </p>
          </div>
        </div>

        {/* Action Button Top-Right */}
        <button
          type="button"
          onClick={() => {
            setSelectedStormQuery(
              'Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone across entire 320km Karnataka coastline.'
            );
            setAnalysisModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Run Disaster Management Simulation</span>
        </button>
      </div>

      {/* 2. Active Hazards & Alerts Banner (Matching Screenshot) */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-amber-700" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase">
                Cyclone Alert
              </span>
              <span className="text-xs font-bold text-amber-900">
                Low pressure area in Arabian Sea — Monitor for intensification
              </span>
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5">
              INCOIS bulletin bulletin warns of moderate south-westerly squall winds (40-50 km/h) off Mangaluru and Karwar.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSimulateEvent('Current Arabian Sea Low Pressure')}
          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          Simulate Surge Impact
        </button>
      </div>

      {/* 3. Main Three-Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Hazard Events (3.5 Cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-[#0a1628]">Recent Events & Historical Hazards</h3>
            <span className="text-[10px] text-slate-400 font-mono">IBTrACS Replay</span>
          </div>

          <div className="space-y-2.5">
            {RECENT_HAZARDS.map((hazard, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">{hazard.name}</h4>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-white border border-slate-200 text-rose-700">
                    {hazard.peakWave}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{hazard.impact}</p>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] text-slate-400 font-mono">Year {hazard.year}</span>
                  <button
                    type="button"
                    onClick={() => handleSimulateEvent(hazard.name)}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Simulate Replay</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Cyclone Tracks & Hazard Zones Map (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-[#0a1628]">Cyclone Tracks & Hazard Inundation</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Multi-Year GIS Overlay</span>
            </div>
          </div>

          <WorkspaceMapViewer
            mode="disaster-management"
            height="380px"
            center={[74.30, 13.50]}
            zoom={7.6}
            highlightSector={highlightSector}
            onMarkerClick={name => setHighlightSector(name)}
          />

          {/* Legend */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rose-600 inline-block" /> Tauktae (2021)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> Ockhi (2017)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Nisarga (2020)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Inundation Cones</span>
          </div>
        </div>

        {/* Right: Live Alerts & Preparedness Checklist (3.5 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Live Alerts */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0a1628]">Live Alerts</h3>
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monitoring Active</span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Continuous surveillance for new cyclone depressions across 1,865 historical tracks.
              </p>
            </div>
          </div>

          {/* Preparedness Checklist (Matching Screenshot) */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0a1628]">Preparedness Checklist</h3>
              <span className="text-[10px] text-slate-400">Standard SOP</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Emergency Contacts</span>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Complete
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Evacuation Routes</span>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Complete
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Shelter Locations</span>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Complete
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Communication Plan</span>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Pending
                </span>
              </div>
            </div>
          </div>

          {/* Latest Update Status */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-500 space-y-0.5">
            <div className="font-bold text-slate-700">Latest Synchronization</div>
            <p>Checked: Live Feed • Open-Meteo • IMD • INCOIS</p>
          </div>
        </div>
      </div>

      {/* Floating AI Chatbot Copilot */}
      <WorkspaceChatbot
        workspace="disaster_management"
        workspaceTitle="Disaster Management"
        quickPrompts={quickPrompts}
        onAnalysisGenerated={() => {
          setHighlightSector('Tauktae');
        }}
      />

      {/* Analysis Execution Modal */}
      <WorkspaceAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        workspace="disaster_management"
        workspaceTitle="Disaster Management Simulation"
        defaultQuery={selectedStormQuery}
        plannedAgents={['marine_hazard', 'coastal_risk', 'evidence_verification']}
        onCompleted={(_id, _ans) => setHighlightSector('Tauktae')}
      />
    </div>
  );
};
