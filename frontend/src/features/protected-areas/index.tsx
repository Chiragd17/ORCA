import React from 'react';
import { InvestigationPanel } from '../investigations/InvestigationPanel';
import { ShieldCheck, Trees, MapPin, Compass } from 'lucide-react';

export const ProtectedAreasWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Protected Areas & Conservation Workspace</h1>
          <p className="text-xs text-slate-400">
            Marine sanctuaries, coastal mangrove habitats, boundary overlaps, and environmental indicator monitoring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            <Trees className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Focus Region</span>
            <p className="text-sm font-semibold text-white">Netrani Island & Coastal Sanctuaries</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/50">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Spatial Geometry</span>
            <p className="text-sm font-semibold text-white">WDPA / OpenStreetMap Boundaries</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Assigned Agents</span>
            <p className="text-sm font-semibold text-white">Ocean Research + Coastal Risk</p>
          </div>
        </div>
      </div>

      <InvestigationPanel
        workspace="protected-areas"
        defaultPrompt="Compare available temperature and chlorophyll observations inside and outside Netrani protected waters and identify supported differences."
        suggestedQuestions={[
          "Are any cyclone tracks or active storms overlapping marine protected boundaries?",
          "Compare SST variance inside protected coastal zones vs open offshore waters.",
          "Check for missing boundary data or monitoring gaps in the study zone.",
        ]}
      />
    </div>
  );
};
