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

interface DistrictStats {
  ports: number;
  harbours: number;
  settlements: number;
  keyInfra: number;
  populationExposure: string;
  criticalFacilities: string;
  hazardRadius: string;
  center: [number, number];
  zoom: number;
}

const DISTRICT_STATS: Record<string, DistrictStats> = {
  'All Districts': {
    ports: 5,
    harbours: 12,
    settlements: 48,
    keyInfra: 23,
    populationExposure: '1,280,000',
    criticalFacilities: '23 Critical Assets',
    hazardRadius: 'Statewide (320 km)',
    center: [74.78, 13.65],
    zoom: 7.8,
  },
  'Dakshina Kannada': {
    ports: 2,
    harbours: 3,
    settlements: 16,
    keyInfra: 9,
    populationExposure: '606,177',
    criticalFacilities: '9 Ports / Hosps',
    hazardRadius: '30 km (NMPT Zone)',
    center: [74.84, 12.91],
    zoom: 10.2,
  },
  'Udupi': {
    ports: 1,
    harbours: 4,
    settlements: 18,
    keyInfra: 7,
    populationExposure: '384,500',
    criticalFacilities: '7 Harbours / Hosps',
    hazardRadius: '25 km (Malpe Zone)',
    center: [74.75, 13.35],
    zoom: 10.0,
  },
  'Uttara Kannada': {
    ports: 2,
    harbours: 5,
    settlements: 14,
    keyInfra: 7,
    populationExposure: '289,320',
    criticalFacilities: '7 Ports / Naval',
    hazardRadius: '35 km (Karwar Zone)',
    center: [74.35, 14.45],
    zoom: 9.4,
  },
};

const INFRASTRUCTURE_DATA = [
  // Dakshina Kannada
  { name: 'New Mangalore Port (NMPT)', type: 'Port', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Old Mangalore Port (Bunder)', type: 'Port', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Mangaluru Bunder Fishing Jetty', type: 'Harbour', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Kulai Fishery Harbour', type: 'Harbour', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'District Wenlock Hospital', type: 'Hospital', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Lady Goschen Hospital', type: 'Hospital', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'NMPT Marine Oil Terminal', type: 'Key Infra', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'MRPL Coastal Facility', type: 'Key Infra', district: 'Dakshina Kannada', status: 'Operational', safe: true },
  { name: 'Surathkal Light House', type: 'Key Infra', district: 'Dakshina Kannada', status: 'Operational', safe: true },

  // Udupi
  { name: 'Malpe Fishing Harbour & Port', type: 'Harbour', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Gangolli Fishery Terminal', type: 'Harbour', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Hangarkatta Estuary Port', type: 'Harbour', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Hejamadi Kodi Fishing Jetty', type: 'Harbour', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Udupi District Hospital', type: 'Hospital', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Kaup Maritime Light House', type: 'Key Infra', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'UPCL Coastal Power Intake', type: 'Key Infra', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Padubidri Strategic Energy Terminal', type: 'Key Infra', district: 'Udupi', status: 'Operational', safe: true },
  { name: 'Kundapura Sub-Divisional Hospital', type: 'Hospital', district: 'Udupi', status: 'Operational', safe: true },

  // Uttara Kannada
  { name: 'Karwar Commercial Port (Baithkol)', type: 'Port', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Tadadi Estuary Port', type: 'Port', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Karwar Baithkol Fishing Harbour', type: 'Harbour', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Honnavar Sharavathi Harbour', type: 'Harbour', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Bhatkal Coastal Fishing Bunder', type: 'Harbour', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'INS Kadamba Naval Base Facility', type: 'Key Infra', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'District Civil Hospital Karwar', type: 'Hospital', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Kaiga Coastal Monitoring Post', type: 'Key Infra', district: 'Uttara Kannada', status: 'Operational', safe: true },
  { name: 'Bhatkal Coastal Surveillance Radar', type: 'Key Infra', district: 'Uttara Kannada', status: 'Operational', safe: true },
];

export const CoastalAuthorityWorkspace: React.FC = () => {
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [highlightSector, setHighlightSector] = useState<string | null>(null);

  const currentStats = DISTRICT_STATS[selectedDistrict] || DISTRICT_STATS['All Districts'];

  const quickPrompts = [
    `Run infrastructure vulnerability audit for ${selectedDistrict}`,
    `Evaluate population exposure in ${selectedDistrict} within hazard radius`,
    'Check operational clearance for Karwar, Malpe & Mangalore harbours',
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
              Infrastructure • Regulation • Planning • {INFRASTRUCTURE_DATA.length} Verified Coastal Assets Ingested
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
              <span>{currentStats.hazardRadius}</span>
            </div>
          </div>

          <WorkspaceMapViewer
            mode="coastal-authority"
            height="400px"
            center={currentStats.center}
            zoom={currentStats.zoom}
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
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-2xs"
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

            {/* 4 Stat Cards - Dynamically updated based on selectedDistrict */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 transition-colors">
                <span className="text-[10px] text-slate-500 block">Ports</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">
                  {currentStats.ports}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 transition-colors">
                <span className="text-[10px] text-slate-500 block">Harbours</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">
                  {currentStats.harbours}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 transition-colors">
                <span className="text-[10px] text-slate-500 block">Settlements</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">
                  {currentStats.settlements}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 transition-colors">
                <span className="text-[10px] text-slate-500 block">Key Infra</span>
                <strong className="text-sm font-extrabold text-[#0a1628]">
                  {currentStats.keyInfra}
                </strong>
              </div>
            </div>
          </div>

          {/* Infrastructure List Table */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Infrastructure List ({filteredInfra.length})
              </span>
              <span className="text-[10.5px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {selectedDistrict}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white z-10">
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
              Risk & Exposure ({selectedDistrict})
            </span>
            <div className="flex items-center gap-6 mt-1">
              <div>
                <span className="text-[11px] text-slate-500 block">Population Exposure</span>
                <strong className="text-base font-extrabold text-[#0a1628]">
                  {currentStats.populationExposure}
                </strong>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[11px] text-slate-500 block">Critical Facilities</span>
                <strong className="text-base font-extrabold text-[#0a1628]">
                  {currentStats.criticalFacilities}
                </strong>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[11px] text-slate-500 block">Hazard Radius</span>
                <strong className="text-base font-extrabold text-indigo-700">
                  {currentStats.hazardRadius}
                </strong>
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
          <span>Run Coastal Risk Analysis ({selectedDistrict})</span>
        </button>
      </div>

      {/* Floating AI Chatbot Copilot */}
      <WorkspaceChatbot
        workspace="coastal_authority"
        workspaceTitle={`Coastal Authority - ${selectedDistrict}`}
        locationName={selectedDistrict}
        latitude={DISTRICT_STATS[selectedDistrict]?.center[1] ?? 12.91}
        longitude={DISTRICT_STATS[selectedDistrict]?.center[0] ?? 74.84}
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
        workspaceTitle={`Coastal Authority Analysis - ${selectedDistrict}`}
        defaultQuery={`Assess coastal infrastructure vulnerability, population exposure, and critical facility buffer clearance for ${selectedDistrict}.`}
        plannedAgents={['coastal_risk', 'marine_hazard']}
        onCompleted={(_id, _ans) => setHighlightSector('Mangalore')}
      />
    </div>
  );
};
