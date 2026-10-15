import React from 'react';
import { InvestigationPanel } from '../investigations/InvestigationPanel';
import { Anchor, Wind, Waves, Compass, AlertCircle } from 'lucide-react';

export const FishermanWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-950/60 border border-cyan-800/60 rounded-xl text-cyan-400">
            <Anchor className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Fisherman Workspace</h1>
            <p className="text-xs text-slate-400">
              Offshore marine conditions, wave forecasts, wind speeds, and hazard alerts for operators
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Decision support prototype: Not an official emergency warning authority.</span>
        </div>
      </div>

      {/* Conditions Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/50">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Target Area</span>
            <p className="text-sm font-semibold text-white">Mangaluru Offshore (12.87°N, 74.88°E)</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Marine Data Source</span>
            <p className="text-sm font-semibold text-white">Open-Meteo Marine API</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Primary Agents</span>
            <p className="text-sm font-semibold text-white">Ocean Research + Marine Hazard</p>
          </div>
        </div>
      </div>

      {/* Shared Multi-Agent Investigation Interface */}
      <InvestigationPanel
        workspace="fisherman"
        defaultPrompt="I am planning to fish offshore near Mangaluru tomorrow morning. Investigate wave and wind forecasts and any active cyclone warnings."
        suggestedQuestions={[
          "Investigate offshore wave height and period near Mangaluru tomorrow morning.",
          "Check wind speed forecast and gust limits for coastal Karnataka over next 24 hours.",
          "Are there any active cyclone warnings or depressions in the Arabian Sea?",
        ]}
      />
    </div>
  );
};
