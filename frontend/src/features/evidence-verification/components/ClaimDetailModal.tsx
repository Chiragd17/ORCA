import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  AlertOctagon,
  Calculator,
  Database,
  Hash,
  ArrowRight,
  Info,
} from 'lucide-react';
import { NormalizedClaim, EvidenceItem } from '../types';

interface Props {
  claim: NormalizedClaim | null;
  evidenceMap?: Record<string, EvidenceItem>;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  matched: { label: 'Matched', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  unmet: { label: 'Unmet Requirement', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: AlertOctagon },
  potential_gap: { label: 'Potential Gap', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  unverified: { label: 'Unverified', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: HelpCircle },
  conflicting: { label: 'Conflicting Sources', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: AlertTriangle },
  needs_review: { label: 'Needs Human Review', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: Info },
};

const outcomeBadge: Record<string, { label: string; bg: string; text: string }> = {
  passed: { label: 'PASSED', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  failed: { label: 'FAILED', bg: 'bg-rose-100', text: 'text-rose-800' },
  skipped: { label: 'SKIPPED', bg: 'bg-slate-100', text: 'text-slate-700' },
  error: { label: 'ERROR', bg: 'bg-amber-100', text: 'text-amber-800' },
};

export const ClaimDetailModal: React.FC<Props> = ({ claim, evidenceMap = {}, onClose }) => {
  if (!claim) return null;

  const cfg = statusConfig[claim.status] || statusConfig.unverified;
  const StatusIcon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#d8e4f0] shadow-2xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                  {claim.claim_id}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {cfg.label}
                </span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                  {claim.claim_type}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-[#0a1628] mt-1 line-clamp-1">
                Scientific Verification Audit Record
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Original Claim & Producing Agent */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Originating Claim:</span>
              <span>
                Producer: <strong className="text-slate-800">{claim.producer_agent}</strong> | Execution:{' '}
                <span className="font-mono">{claim.execution_id || 'manual_run'}</span>
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200">
              "{claim.original_text}"
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
              {claim.numerical_value !== undefined && claim.numerical_value !== null && (
                <span>
                  Extracted Value: <strong>{claim.numerical_value} {claim.unit || ''}</strong>
                </span>
              )}
              {typeof claim.latitude === 'number' && typeof claim.longitude === 'number' && (
                <span>
                  Coordinates: <strong>{claim.latitude.toFixed(3)}°N, {claim.longitude.toFixed(3)}°E</strong>
                </span>
              )}
              {claim.temporal_scope && (
                <span>
                  Temporal Scope: <strong>{claim.temporal_scope}</strong>
                </span>
              )}
              <span>
                Verified At: <strong>{new Date(claim.verified_at).toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Rationale & Decision */}
          <div className="p-4 rounded-xl border border-[#d8e4f0] bg-blue-50/50 space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Verification Rationale & Decision
            </h3>
            <p className="text-slate-700 leading-relaxed font-normal">
              {claim.reason}
            </p>
          </div>

          {/* Deterministic Recomputation Panel (If Available) */}
          {claim.reproduced_calculation && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
              <h3 className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Deterministic Recomputed Calculation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Formula</span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {claim.reproduced_calculation.formula || 'Linear Difference'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Input Values</span>
                  <span className="font-mono text-xs text-slate-700">
                    {JSON.stringify(claim.reproduced_calculation.inputs || {})}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Original Claim Value</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {claim.numerical_value} {claim.unit}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Recomputed Output</span>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {claim.reproduced_calculation.recomputed_value ?? 'N/A'}{' '}
                    {claim.reproduced_calculation.unit || claim.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Individual Deterministic Checks */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Deterministic Verification Checks Executed ({claim.check_results.length})
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {claim.check_results.map((chk, idx) => {
                const b = outcomeBadge[chk.outcome] || outcomeBadge.skipped;
                return (
                  <div key={idx} className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] text-slate-800">
                          {chk.check_code}
                        </span>
                        <span className="font-semibold text-slate-700 text-xs">
                          {chk.check_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase font-medium">
                          {chk.category}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {chk.explanation}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${b.bg}`}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Findings & Identified Conflicts */}
          {claim.findings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Identified Findings & Material Discrepancies ({claim.findings.length})
              </h3>
              <div className="space-y-2">
                {claim.findings.map((f, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-800 text-[11px]">
                          {f.finding_code}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 text-[10px] font-bold uppercase">
                          {f.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Status: {f.resolution_status}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{f.explanation}</p>
                    {f.competing_values && (
                      <div className="p-2 bg-white/80 rounded border border-rose-200 font-mono text-[11px] text-slate-700">
                        <strong>Competing Source Values:</strong> {JSON.stringify(f.competing_values)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold pt-1">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Recommended Action: {f.recommended_action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Evidence Records & Hash Verification */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              Underlying Evidence Records ({claim.evidence_ids.length})
            </h3>
            <div className="space-y-2">
              {claim.evidence_ids.map((eid) => {
                const item = evidenceMap[eid];
                return (
                  <div key={eid} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{eid}</span>
                      {item ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans font-semibold text-[10px]">
                          RESOLVED IN EVIDENCE STORE
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-sans font-semibold text-[10px]">
                          EVIDENCE UNRESOLVED
                        </span>
                      )}
                    </div>
                    {item && (
                      <div className="font-sans text-xs text-slate-600 space-y-1">
                        <div className="flex flex-wrap gap-4">
                          <span>Source: <strong>{item.source_name}</strong></span>
                          <span>Type: <strong>{item.data_type}</strong></span>
                          {item.value !== undefined && (
                            <span>Value: <strong>{JSON.stringify(item.value)} {item.unit || ''}</strong></span>
                          )}
                          {item.observation_time && (
                            <span>Obs Time: <strong>{new Date(item.observation_time).toLocaleString()}</strong></span>
                          )}
                        </div>
                        {item.hash && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                            <Hash className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>SHA-256: {item.hash}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uncertainty & Limitations */}
          {claim.uncertainty && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-amber-900 text-xs">
              <strong className="block text-[11px] font-bold text-amber-800 uppercase mb-0.5">
                Scientific Uncertainty & Boundary Limits
              </strong>
              {claim.uncertainty}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e2e8f0] bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Cryptographic Content Verification Engine | ORCA Standard Audit Layer
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
          >
            Close Audit Record
          </button>
        </div>
      </div>
    </div>
  );
};
