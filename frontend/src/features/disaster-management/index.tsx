import React from 'react';
import { InvestigationPanel } from '../investigations/InvestigationPanel';
import { ShieldAlert, AlertOctagon, History, Radio } from 'lucide-react';

export const DisasterManagementWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Disaster Management & Emergency Response</h1>
          <p className="text-xs text-slate-400">
            Cyclone tracking, historical storm playback, GDACS disaster alerts, and population impact assessment
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-red-950/80 text-red-400 border border-red-800/50">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Hazard Feeds</span>
            <p className="text-sm font-semibold text-white">GDACS Feeds + NOAA IBTrACS</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-orange-950/80 text-orange-400 border border-orange-800/50">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Track Capabilities</span>
            <p className="text-sm font-semibold text-white">Historical Track Replay & Forecast Cones</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Verification</span>
            <p className="text-sm font-semibold text-white">Distinguishes Observations vs Forecasts</p>
          </div>
        </div>
      </div>

      <InvestigationPanel
        workspace="disaster-management"
        defaultPrompt="Investigate the latest available cyclone information relevant to the Arabian Sea, identify potentially exposed coastal areas, and disclose unresolved uncertainties."
        suggestedQuestions={[
          "Replay historical storm tracks in the Arabian Sea from the IBTrACS record.",
          "Check GDACS for active flood or cyclone alerts across the Western Indian Ocean.",
          "Assess coastal exposure and estimate population in proximity to projected tracks.",
        ]}
      />
    </div>
  );
};
