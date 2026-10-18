import React, { useState } from 'react';
import {
  Leaf,
  Shield,
  Sparkles,
} from 'lucide-react';
import { WorkspaceMapViewer } from '../workspaces-common/WorkspaceMapViewer';
import { WorkspaceChatbot } from '../workspaces-common/WorkspaceChatbot';
import { WorkspaceAnalysisModal } from '../workspaces-common/WorkspaceAnalysisModal';

export const ProtectedAreasWorkspace: React.FC = () => {
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [highlightSector, setHighlightSector] = useState<string | null>(null);

  const quickPrompts = [
    "Assess Netravati-Gurupuru mangrove conservation status",
    "Check sea surface temperature risk on St. Mary's reef ecosystems",
    "Simulate buffer zone intrusion risk for Karnataka MPAs",
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[#0a1628]">Protected Areas Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Biodiversity & MPAs
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API LIVE
              </span>
            </div>
            <p className="text-xs text-[#6b8fc0]">
              Marine Ecosystems • Biodiversity • Conservation • Ecological Risk Monitoring
            </p>
          </div>
        </div>

        {/* Action Button Top-Right */}
        <button
          type="button"
          onClick={() => setAnalysisModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Run Protected Areas Ecological Analysis</span>
        </button>
      </div>

      {/* 2. Main Two-Column Layout (Matching Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Protected Areas Interactive Map (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-[#0a1628]">Karnataka Coastal Protected Areas</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>36 Ingested Reserves</span>
            </div>
          </div>

          <WorkspaceMapViewer
            mode="protected-areas"
            height="390px"
            center={[74.40, 13.70]}
            zoom={7.7}
            highlightSector={highlightSector}
            onMarkerClick={name => setHighlightSector(name)}
          />

          {/* Map Legend */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Mangroves</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Marine Protected Area</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Eco-sensitive Zone</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Wildlife Sanctuary</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Ramsar Site</span>
          </div>
        </div>

        {/* Right: Summary Cards & Key Areas (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Protected Areas Summary Grid (4 Cards) */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Protected Areas Summary
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-extrabold text-sm">
                  12
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Marine Protected</h4>
                  <p className="text-[10px] text-slate-400">Areas</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-extrabold text-sm">
                  7
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Mangrove</h4>
                  <p className="text-[10px] text-slate-400">Areas</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-extrabold text-sm">
                  3
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Wildlife</h4>
                  <p className="text-[10px] text-slate-400">Sanctuaries</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center font-extrabold text-sm">
                  2
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Ramsar</h4>
                  <p className="text-[10px] text-slate-400">Sites</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Areas List */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Key Coastal Reserves
            </span>

            <div className="space-y-2 text-xs">
              <div
                onClick={() => setHighlightSector('Netravati')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-slate-800">Netravati-Gurupuru Mangroves</h4>
                  <p className="text-[10.5px] text-slate-500">Dakshina Kannada Estuary</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-white border border-slate-200 text-slate-700 text-[10.5px]">
                  10.4 ha
                </span>
              </div>

              <div
                onClick={() => setHighlightSector('Mary')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-slate-800">St. Mary's Islands Geo-heritage Site</h4>
                  <p className="text-[10.5px] text-slate-500">Columnar Rhyolitic Lava</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-white border border-slate-200 text-slate-700 text-[10.5px]">
                  1.8 ha
                </span>
              </div>

              <div
                onClick={() => setHighlightSector('Gokarna')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-slate-800">Sharavathi Estuary Mangrove Belt</h4>
                  <p className="text-[10.5px] text-slate-500">Honnavar Buffer Corridor</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-white border border-slate-200 text-slate-700 text-[10.5px]">
                  14.2 ha
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ecosystem Health Bar (Matching Screenshot Bottom Row) */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            Ecosystem Health Matrix
          </span>
          <span className="text-[10px] font-mono text-slate-400">Deterministic Thresholds</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] text-slate-500 block">Mangroves</span>
              <strong className="text-xs font-bold text-slate-800">Good</strong>
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] text-slate-500 block">Coral Reefs</span>
              <strong className="text-xs font-bold text-amber-700">Moderate</strong>
            </div>
            <span className="w-3 h-3 rounded-full bg-amber-500" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] text-slate-500 block">Seagrass</span>
              <strong className="text-xs font-bold text-slate-800">Good</strong>
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] text-slate-500 block">Water Quality</span>
              <strong className="text-xs font-bold text-slate-800">Good</strong>
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Floating AI Chatbot Copilot */}
      <WorkspaceChatbot
        workspace="protected-areas"
        workspaceTitle="Protected Areas"
        quickPrompts={quickPrompts}
        onAnalysisGenerated={() => {
          setHighlightSector('Netravati');
        }}
      />

      {/* Analysis Execution Modal */}
      <WorkspaceAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        workspace="protected-areas"
        workspaceTitle="Protected Areas Ecological Analysis"
        defaultQuery="Assess sea surface temperature anomalies and wave surge intrusion impacts across Karnataka coastal mangrove reserves and coral reef habitats."
        plannedAgents={['ocean_research', 'coastal_risk']}
        onCompleted={(_id, _ans) => setHighlightSector('Netravati')}
      />
    </div>
  );
};
