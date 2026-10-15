import React from 'react';
import { InvestigationPanel } from '../investigations/InvestigationPanel';
import { Waves, Thermometer, Sparkles, BarChart3 } from 'lucide-react';

export const MarineMonitoringWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl text-blue-400">
          <Waves className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Marine Monitoring & Research Workspace</h1>
          <p className="text-xs text-slate-400">
            Sea surface temperature (SST) analysis, chlorophyll-a trends, time series, and anomaly detection
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Primary Indicator</span>
            <p className="text-sm font-semibold text-white">Sea Surface Temperature (SST)</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-teal-950/80 text-teal-400 border border-teal-800/50">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Biochemical Indicator</span>
            <p className="text-sm font-semibold text-white">Chlorophyll-a / Ocean Color</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-800/50">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Analytical Engine</span>
            <p className="text-sm font-semibold text-white">Time Series & Historical Baseline</p>
          </div>
        </div>
      </div>

      <InvestigationPanel
        workspace="marine-monitoring"
        defaultPrompt="Compare available sea-surface temperature observations off Karnataka across the past seasons and identify any supported anomalies."
        suggestedQuestions={[
          "Compare SST observations between off Karnataka and Lakshadweep Sea.",
          "Analyze SST trends for the Arabian Sea study zone over the last recorded months.",
          "Are there recorded temperature anomalies exceeding 1.5°C above seasonal baseline?",
        ]}
      />
    </div>
  );
};
