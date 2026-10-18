import React, { useState } from 'react';
import {
  Landmark,
  Compass,
  Sparkles,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { WorkspaceMapViewer } from '../workspaces-common/WorkspaceMapViewer';
import { WorkspaceChatbot } from '../workspaces-common/WorkspaceChatbot';
import { WorkspaceAnalysisModal } from '../workspaces-common/WorkspaceAnalysisModal';

const INFRASTRUCTURE_DATA = [
  { name: 'New Mangalore Port', type: 'Port', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Karwar Port', type: 'Port', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Malpe Fishing Harbour', type: 'Harbour', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'District Wenlock Hospital', type: 'Hospital', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Udupi District Hospital', type: 'Hospital', district: 'Udupi', status: 'Operational', safe: true },
];

export const CoastalAuthorityWorkspace: React.FC = () => {
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [highlightSector, setHighlightSector] = useState<string | null>(null);

  const quickPrompts = [
    'Run infrastructure vulnerability audit for New Mangalore Port',
    'Evaluate population exposure within 30km hazard radius',
    'Check operational clearance for Karwar & Malpe harbours',
  ];

  const filteredInfra = selectedDistrict === 'All Districts'
    ? INFRASTRUCTURE_DATA
    : INFRASTRUCTURE_DATA.filter(item => item.district === selectedDistrict);

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
            <Landmark className="w-6 h-6 text-indigo-600" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[#0a1628]">Coastal Authority Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Maritime Administration
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API LIVE
              </span>
            </div>
            <p className="text-xs text-[#6b8fc0]">
              Infrastructure • Regulation • Planning • 36 Verified Coastal Assets Ingested
            </p>
          </div>
        </div>

        {/* Action Button Top-Right */}
        <button
          type="button"
          onClick={() => setAnalysisModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Run Coastal Risk Analysis</span>
        </button>
      </div>

      {/* 2. Main Two-Column Layout (Matching Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Infrastructure & Risk Map (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-[#0a1628]">Coastal Infrastructure & Risk Overview</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>30km Coastal Hazard Cone Active</span>
            </div>
          </div>

          <WorkspaceMapViewer
            mode="coastal-authority"
            height="400px"
            center={[74.78, 13.05]}
            zoom={8.0}
            highlightSector={highlightSector}
            onMarkerClick={name => setHighlightSector(name)}
          />

          {/* Map Legend */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Ports</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Harbours</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Hospitals</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Coastline</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Hazard Zone</span>
          </div>
        </div>

        {/* Right: Filters, Stat Cards & Infrastructure Table (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls & Stat Cards */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
            {/* Filter Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={e => setSelectedDistrict(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="All Districts">All Districts</option>
                  <option value="Dakshina Kannada">Dakshina Kannada</option>
                  <option value="Udupi">Udupi</option>
                  <option value="Uttara Kannada">Uttara Kannada</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Karnataka Coast Assets
              </span>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Ports</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">5</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Harbours</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">12</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Settlements</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">48</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Key Infra</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">23</strong>
              </div>
            </div>
          </div>

          {/* Infrastructure List Table */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Infrastructure List
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">District</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredInfra.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setHighlightSector(item.name)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2 font-bold text-slate-800">{item.name}</td>
                      <td className="py-2 text-slate-500">{item.type}</td>
                      <td className="py-2 text-slate-500">{item.district}</td>
                      <td className="py-2 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setAnalysisModalOpen(true)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-end gap-1 ml-auto cursor-pointer"
              >
                <span>View Full Infrastructure Analysis</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Risk & Exposure Metrics + Run Coastal Risk Analysis Button */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Risk & Exposure Stats */}
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Risk & Exposure (Selected Area)
            </span>
            <div className="flex items-center gap-6 mt-1">
              <div>
                <span className="text-[11px] text-slate-500 block">Population Exposure</span>
                <strong className="text-base font-extrabold text-[#0a1628]">606,177</strong>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[11px] text-slate-500 block">Critical Facilities</span>
                <strong className="text-base font-extrabold text-[#0a1628]">3 Ports / Hosps</strong>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[11px] text-slate-500 block">Hazard Radius</span>
                <strong className="text-base font-extrabold text-indigo-700">30 km</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button Matching Screenshot Bottom Right */}
        <button
          type="button"
          onClick={() => setAnalysisModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Run Coastal Risk Analysis</span>
        </button>
      </div>

      {/* Floating AI Chatbot Copilot */}
      <WorkspaceChatbot
        workspace="coastal_authority"
        workspaceTitle="Coastal Authority"
        quickPrompts={quickPrompts}
        onAnalysisGenerated={() => {
          setHighlightSector('Mangalore');
        }}
      />

      {/* Analysis Execution Modal */}
      <WorkspaceAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        workspace="coastal_authority"
        workspaceTitle="Coastal Authority Risk Analysis"
        defaultQuery="Assess coastal infrastructure vulnerability, population exposure, and critical facility buffer clearance within 30km of New Mangalore Port."
        plannedAgents={['coastal_risk', 'marine_hazard']}
        onCompleted={(_id, _ans) => setHighlightSector('Mangalore')}
      />
    </div>
  );
};
