import React, { useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { WorkspaceType, Investigation, ExecutionEvent } from '../../types';
import { Send, CheckCircle2, AlertTriangle, ShieldX, Clock, Cpu } from 'lucide-react';

interface Props {
  workspace: WorkspaceType;
  defaultPrompt?: string;
  suggestedQuestions?: string[];
  defaultLatitude?: number;
  defaultLongitude?: number;
  defaultRadiusKm?: number;
}

export const InvestigationPanel: React.FC<Props> = ({
  workspace,
  defaultPrompt = '',
  suggestedQuestions = [],
  defaultLatitude,
  defaultLongitude,
  defaultRadiusKm,
}) => {
  const [query, setQuery] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleStartInvestigation = async (queryString?: string) => {
    const q = queryString || query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setInvestigation(null);
    setEvents([]);

    try {
      const resp = await apiClient.createInvestigation({
        workspace,
        query: q,
        latitude: defaultLatitude,
        longitude: defaultLongitude,
        radius_km: defaultRadiusKm,
      });

      // Poll or fetch investigation details
      const invDetails = await apiClient.getInvestigation(resp.investigation_id);
      const invEvents = await apiClient.getInvestigationEvents(resp.investigation_id);

      setInvestigation(invDetails);
      setEvents(invEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to execute investigation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Ask ORCA Multi-Agent Investigation
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            placeholder="Type your inquiry or select a suggested research question below..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartInvestigation()}
          />
          <button
            onClick={() => handleStartInvestigation()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Investigate</span>
          </button>
        </div>

        {/* Suggested Queries */}
        {suggestedQuestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 py-1">Quick prompts:</span>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                  handleStartInvestigation(q);
                }}
                className="text-xs bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/20 px-3 py-1 rounded-lg transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Real-time Agent Execution Trace */}
      {events.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Traceable Orchestrator Execution Events</span>
          </div>
          <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto pr-2">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/50">
                <span className="text-cyan-500 font-bold">[{ev.event_type}]</span>
                {ev.agent_id && <span className="text-amber-400">@{ev.agent_id}</span>}
                <span className="flex-1 text-slate-300">{JSON.stringify(ev.details)}</span>
                <span className="text-slate-600 text-[10px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results and Verified Findings */}
      {investigation && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Investigation Findings & Verification</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {investigation.investigation_id}</p>
            </div>
            {investigation.verification_summary && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                investigation.verification_summary.overall_status === 'verified'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {investigation.verification_summary.overall_status === 'verified' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <ShieldX className="w-3.5 h-3.5" />
                )}
                {investigation.verification_summary.overall_status}
              </span>
            )}
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {investigation.findings.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No structured findings produced yet for this inquiry.</p>
            ) : (
              investigation.findings.map((f, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{f.claim}</span>
                    {f.value !== undefined && (
                      <span className="text-sm font-bold text-cyan-400">
                        {f.value} {f.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>Evidence:</span>
                    {f.evidence_ids.length > 0 ? (
                      f.evidence_ids.map((id, idx) => (
                        <span key={idx} className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300">
                          {id}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-600">None attached</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Limitations */}
          {investigation.limitations.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Documented Scientific Limitations & Gaps
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {investigation.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
