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

  useEffect(() => {
    if (isOpen) {
      setQuery(defaultQuery);
      setFinalAnswer(null);
      setInvestigationId(null);
      setError(null);
      runAnalysis(defaultQuery);
    }
  }, [isOpen]);

  const runAnalysis = async (targetQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.createInvestigation({
        workspace: workspace as any,
        query: targetQuery,
      });

      const invId = res.investigation_id;
      setInvestigationId(invId);

      // Fetch enriched details
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#d8e4f0] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
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
                Executing multi-agent dependencies: {plannedAgents.join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 mx-auto flex items-center justify-center animate-spin">
                <Clock className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Running Autonomous {workspaceTitle} Investigation
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Dispatching concurrent tasks across specialists, performing deterministic SI unit checks, and auditing source evidence...
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {plannedAgents.map((ag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10.5px] font-mono border border-slate-200"
                  >
                    {ag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
