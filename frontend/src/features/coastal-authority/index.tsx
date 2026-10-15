import React from 'react';
import { InvestigationPanel } from '../investigations/InvestigationPanel';
import { Compass, Building2, Users, Map } from 'lucide-react';

export const CoastalAuthorityWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Coastal Authority & Planning Workspace</h1>
          <p className="text-xs text-slate-400">
            Coastal settlement vulnerability, infrastructure proximity, population exposure models, and zoning
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/50">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Infrastructure</span>
            <p className="text-sm font-semibold text-white">Ports, Harbors, Coastal Settlements</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Exposure Calculation</span>
            <p className="text-sm font-semibold text-white">WorldPop Grids & Spatial Intersections</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Deterministic Model</span>
            <p className="text-sm font-semibold text-white">WGS84 Geospatial Geometry</p>
          </div>
        </div>
      </div>

      <InvestigationPanel
        workspace="coastal-authority"
        defaultPrompt="Identify coastal settlements within 15km of the Karnataka shoreline and estimate potential population exposure using available datasets."
        suggestedQuestions={[
          "Identify critical infrastructure and ports intersecting high wave-energy zones.",
          "Calculate estimated population exposure for coastal taluks near Mangaluru and Udupi.",
          "List data gaps in high-resolution coastal elevation and population coverage.",
        ]}
      />
    </div>
  );
};
