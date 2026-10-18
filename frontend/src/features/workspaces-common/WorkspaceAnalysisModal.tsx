import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  RotateCcw,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { ExecutiveSynthesisView } from '../orchestrator/components/ExecutiveSynthesisView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspace: string;
  workspaceTitle: string;
  defaultQuery: string;
  plannedAgents: string[];
  onCompleted?: (investigationId: string, finalAnswer: string) => void;
}

interface ScenarioPreset {
  title: string;
  desc: string;
  query: string;
  icon: string;
}

const WORKSPACE_PRESETS: Record<string, ScenarioPreset[]> = {
  fisherman: [
    {
      title: 'Fishing Safety & 24h Coastal Window',
      desc: 'Assess wave height, wind gust, sea surface temperature, and harbour clearances for all vessel craft.',
      query: 'Is it safe to fish offshore Karnataka today? Assess 24h wave, wind, and harbour conditions.',
      icon: '🎣',
    },
    {
      title: 'Swell & Vessel Limits (Mangaluru & Malpe)',
      desc: 'Analyze swell height, period trends, and Douglas sea state limits for small and medium craft.',
      query: 'Analyze swell height and period trends for small and medium craft off Mangaluru and Malpe.',
      icon: '🌊',
    },
    {
      title: 'Arabian Sea Cyclone Surveillance',
      desc: 'Audit IMD & INCOIS satellite early-warning radar for active depressions, squall winds, or cyclonic vortex.',
      query: 'Are there any active cyclone warnings or depressions in the Arabian Sea?',
      icon: '🌀',
    },
  ],
  'marine-monitoring': [
    {
      title: '168h Sea Temperature & Wave Spectra',
      desc: 'Synthesize near-surface SST, wave spectra, and ocean current velocity across 168 forecast hours.',
      query: 'Analyze near-surface sea temperatures, wave spectra, and ocean current velocity off Karnataka coast across 168 forecast hours.',
      icon: '🌡️',
    },
    {
      title: 'SST Thermal Anomaly Baseline Drift',
      desc: 'Evaluate SST thermal deviations against the Arabian Sea baseline across 168 forecast hours.',
      query: 'Evaluate SST thermal anomalies against Arabian Sea baseline across 168 forecast hours.',
      icon: '📊',
    },
    {
      title: 'Deterministic Scientific Provenance Audit',
      desc: 'Verify live Open-Meteo telemetry stream against cryptographic SHA-256 evidence records.',
      query: 'Verify live Open-Meteo marine wave and current telemetry against scientific audit.',
      icon: '🔬',
    },
  ],
  'protected-areas': [
    {
      title: "St. Mary's Reef & Mangrove Thermal Stress",
      desc: "Audit thermal stress on St. Mary's columnar reef and Netravati-Gurupuru mangrove conservation zones.",
      query: "Assess thermal stress on St. Mary's coral reef and Netravati-Gurupuru mangrove conservation zones.",
      icon: '🌿',
    },
    {
      title: 'Sediment Attenuation & Wave Barrier',
      desc: 'Simulate buffer zone wave attenuation and coastal sediment intrusion along Karnataka MPAs.',
      query: 'Simulate buffer zone wave attenuation and coastal sediment intrusion along Karnataka MPAs.',
      icon: '🛡️',
    },
    {
      title: '36 Coastal Features Ecological Audit',
      desc: 'Evaluate ecological risk and water quality indicators across 36 coastal protected features.',
      query: 'Evaluate ecological risk and water quality indicators across 36 coastal protected features.',
      icon: '🌊',
    },
  ],
  coastal_authority: [
    {
      title: 'Port Navigability & 30km Hazard Buffer',
      desc: 'Assess coastal infrastructure vulnerability, port navigability, and 30km hazard buffer around New Mangalore Port.',
      query: 'Assess coastal infrastructure vulnerability, port navigability, and 30km hazard buffer around New Mangalore Port.',
      icon: '⚓',
    },
    {
      title: 'Commercial Vessel Draft & Approaches',
      desc: 'Check commercial vessel draft restrictions, channel currents, and harbour approach safety.',
      query: 'Check commercial vessel draft restrictions and harbour approach safety.',
      icon: '🚢',
    },
    {
      title: 'Critical Coastal Facility Clearance Audit',
      desc: 'Audit population exposure and critical facility clearance across Dakshina Kannada, Udupi, and Karwar.',
      query: 'Audit population exposure and critical facility clearance across Dakshina Kannada, Udupi, and Karwar.',
      icon: '🏢',
    },
  ],
  disaster_management: [
    {
      title: 'Cyclone Tauktae 5.8m Surge Simulation',
      desc: 'Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone across entire 320km Karnataka coastline.',
      query: 'Historical cyclone surge: simulate Extreme Cyclone Tauktae (5.8m waves) regional disaster inundation cone across entire 320km Karnataka coastline.',
      icon: '🚨',
    },
    {
      title: 'Arabian Sea Real-Time Surveillance',
      desc: 'Check current Arabian Sea low-pressure surveillance, early warnings, and baseline sea state.',
      query: 'Check current Arabian Sea low-pressure surveillance and early warning status.',
      icon: '📡',
    },
    {
      title: 'Population Exposure & Hospital Clearance',
      desc: 'Simulate coastal population exposure and hospital clearance in Dakshina Kannada and Udupi.',
      query: 'Simulate coastal population exposure and hospital clearance in Dakshina Kannada and Udupi.',
      icon: '🏥',
    },
  ],
};

export const WorkspaceAnalysisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  workspace,
  workspaceTitle,
  defaultQuery,
  plannedAgents,
  onCompleted,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  const presets = WORKSPACE_PRESETS[workspace] || [
    {
      title: 'Standard Operational Inquiry',
      desc: 'Multi-agent analysis for ' + workspaceTitle,
      query: defaultQuery,
      icon: '⚡',
    },
  ];

  // When modal opens, initialize with the default query without auto-executing
  useEffect(() => {
    if (isOpen) {
      setQuery(defaultQuery || presets[0]?.query || '');
      setFinalAnswer(null);
      setInvestigationId(null);
      setError(null);
      setSelectedPresetIndex(0);
    }
  }, [isOpen, defaultQuery]);

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    setQuery(presets[idx].query);
  };

  const runAnalysis = async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.createInvestigation({
        workspace: workspace as any,
        query: q,
      });

      const invId = res.investigation_id;
      setInvestigationId(invId);

      // Fetch enriched details from PostgreSQL
      const fullDetail = await apiClient.getInvestigation(invId);
      const answer = fullDetail.final_answer || res.final_answer || '';
      setFinalAnswer(answer);

      if (onCompleted) {
        onCompleted(invId, answer);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to execute multi-agent analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGraph = () => {
    if (investigationId) {
      navigate(`/agents/orchestrator?id=${investigationId}`);
    }
  };

  const handleResetToScope = () => {
    setFinalAnswer(null);
    setInvestigationId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#d8e4f0] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#0a1628]">
                  {workspaceTitle} Intelligence Analysis
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ORCA AI GROQ
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  DURABLE POSTGRES
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted Specialists: {plannedAgents.join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {finalAnswer && (
              <button
                type="button"
                onClick={handleResetToScope}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white text-xs font-semibold text-slate-700 hover:text-indigo-600 shadow-2xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Inquiry</span>
              </button>
            )}

            {investigationId && (
              <button
                type="button"
                onClick={handleOpenGraph}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open Full Execution Graph</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STATE 1: Scope & Query Selection (If not loading and no finalAnswer yet) */}
          {!loading && !finalAnswer && (
            <div className="space-y-5">
              {/* Step 1: Scenario Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    <span>Step 1: Select Operational Inquiry & Scenario Scope</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Karnataka 320km Coast</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {presets.map((preset, idx) => {
                    const isSelected = selectedPresetIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectPreset(idx)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-400 shadow-xs ring-1 ring-indigo-400'
                            : 'bg-white border-[#d8e4f0] hover:border-indigo-200 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{preset.icon}</span>
                          <h5 className="text-xs font-bold text-[#0a1628] leading-tight line-clamp-1">
                            {preset.title}
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {preset.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Custom Query Editor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0a1628] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Target Inquiry Prompt (Editable):</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Enter or refine your inquiry..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all leading-relaxed"
                  />
                </div>
              </div>

              {/* Step 3: Participating Ensemble */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0a1628] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Autonomous Specialists Dispatched:</span>
                  </span>
                  <span className="text-[10.5px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    4 Agents Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-[10.5px]">
                    <strong className="text-slate-800 block">Marine Hazard</strong>
                    <span className="text-slate-400">Open-Meteo & IMD</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-[10.5px]">
                    <strong className="text-slate-800 block">Port Navigability</strong>
                    <span className="text-slate-400">Channels & Berths</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-[10.5px]">
                    <strong className="text-slate-800 block">Coastal Risk</strong>
                    <span className="text-slate-400">Haversine & Exposure</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-[10.5px]">
                    <strong className="text-slate-800 block">Scientific Audit</strong>
                    <span className="text-slate-400">SHA-256 Provenance</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={runAnalysis}
                disabled={!query.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Multi-Agent Intelligence Analysis</span>
              </button>
            </div>
          )}

          {/* STATE 2: Loading State */}
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 mx-auto flex items-center justify-center animate-spin">
                <Clock className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  Coordinating Multi-Agent Specialists for {workspaceTitle}
                </h4>
                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Querying Open-Meteo physical ocean telemetry, computing geodesic hazard exposures, conducting deterministic SHA-256 audit, and synthesizing operational directives...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                {plannedAgents.map((ag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10.5px] font-mono border border-indigo-200 flex items-center gap-1.5 animate-pulse"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    {ag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ERROR DISPLAY */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STATE 3: Final Answer & Synthesis View */}
          {!loading && finalAnswer && (
            <div className="space-y-4">
              <ExecutiveSynthesisView
                finalAnswer={finalAnswer}
                query={query}
                workspace={workspace}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {investigationId && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                ID: {investigationId}
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Synchronized with PostgreSQL
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenGraph}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Orchestrator DAG & Telemetry</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
