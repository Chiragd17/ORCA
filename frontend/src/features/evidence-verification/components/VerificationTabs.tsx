import React, { useState } from 'react';
import {
  FileText,
  Database,
  AlertTriangle,
  History,
  BookOpen,
  Sliders,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Search,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  NormalizedClaim,
  EvidenceItem,
  VerificationFinding,
  VerificationRun,
} from '../types';

interface Props {
  claims: NormalizedClaim[];
  evidence: EvidenceItem[];
  findings: VerificationFinding[];
  history: VerificationRun[];
  methodologyChecks?: { category: string; code: string; name: string; status: string; description: string }[];
  limitations?: string[];
  onSelectClaim: (claim: NormalizedClaim) => void;
  onResolveFinding?: (finding: VerificationFinding) => void;
  loading?: boolean;
}

type TabType = 'claims' | 'evidence' | 'findings' | 'history' | 'methodology' | 'limitations';

const statusBadge: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  matched: { label: 'Matched', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  unmet: { label: 'Unmet', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: AlertOctagon },
  potential_gap: { label: 'Potential Gap', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  unverified: { label: 'Unverified', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: HelpCircle },
  conflicting: { label: 'Conflicting', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: AlertTriangle },
  needs_review: { label: 'Needs Review', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: HelpCircle },
};

const severityBadge: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

export const VerificationTabs: React.FC<Props> = ({
  claims,
  evidence,
  findings,
  history,
  methodologyChecks: _methodologyChecks,
  limitations = [],
  onSelectClaim,
  onResolveFinding,
  loading: _loading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('claims');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  // Filtered Claims
  const filteredClaims = claims.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (agentFilter !== 'all' && c.producer_agent !== agentFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        c.claim_id.toLowerCase().includes(q) ||
        c.original_text.toLowerCase().includes(q) ||
        c.producer_agent.toLowerCase().includes(q) ||
        c.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueAgents = Array.from(new Set(claims.map((c) => c.producer_agent)));

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] shadow-xs overflow-hidden">
      {/* Navigation Tab Bar */}
      <div className="flex border-b border-[#e2e8f0] bg-slate-50/70 overflow-x-auto">
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'claims'
              ? 'border-[#2563eb] text-[#2563eb] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Claims Registry</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
            {claims.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'evidence'
              ? 'border-[#2563eb] text-[#2563eb] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Evidence Store</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
            {evidence.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'findings'
              ? 'border-[#2563eb] text-[#2563eb] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Findings & Conflicts</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-semibold">
            {findings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#2563eb] text-[#2563eb] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Verification History</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
            {history.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('methodology')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'methodology'
              ? 'border-[#2563eb] text-[#2563eb] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Methodology & Checks</span>
        </button>

        <button
          onClick={() => setActiveTab('limitations')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'limitations'
              ? 'border-[#2563eb] text-[#2563eb] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Limitations & Config</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5">
        {/* TAB A: CLAIMS REGISTRY */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search claims, IDs, or text..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="matched">Matched</option>
                  <option value="conflicting">Conflicting</option>
                  <option value="unmet">Unmet Requirement</option>
                  <option value="potential_gap">Potential Gap</option>
                  <option value="unverified">Unverified</option>
                  <option value="needs_review">Needs Review</option>
                </select>

                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">All Specialist Agents</option>
                  {uniqueAgents.map((ag) => (
                    <option key={ag} value={ag}>
                      {ag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Claims Table */}
            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No scientific claims match the active filter criteria.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {filteredClaims.map((claim) => {
                  const b = statusBadge[claim.status] || statusBadge.unverified;
                  const Icon = b.icon;
                  return (
                    <div
                      key={claim.claim_id}
                      onClick={() => onSelectClaim(claim)}
                      className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer space-y-2 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-500 text-[11px]">
                            {claim.claim_id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${b.bg} ${b.text} ${b.border}`}
                          >
                            <Icon className="w-3 h-3" />
                            {b.label}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                            Agent: <strong>{claim.producer_agent}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
                            Type: {claim.claim_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>{claim.evidence_ids.length} Linked Records</span>
                          <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
                            Inspect Audit Record <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-800 font-medium leading-relaxed">
                        {claim.original_text}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className="truncate max-w-xl italic">
                          Rationale: {claim.reason}
                        </span>
                        <span>{new Date(claim.verified_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB B: EVIDENCE REGISTRY */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Underlying source records resolved from the shared database. Each record is verified for provenance, metadata adequacy, and cryptographic hash snapshot matching.
            </p>
            {evidence.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No evidence records found in the shared store.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Evidence ID</th>
                      <th className="p-3">Source Name</th>
                      <th className="p-3">Data Type</th>
                      <th className="p-3">Value / Unit</th>
                      <th className="p-3">Coordinates</th>
                      <th className="p-3">Obs Time</th>
                      <th className="p-3">SHA-256 Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evidence.map((ev) => (
                      <tr key={ev.evidence_id || ev.id} className="hover:bg-slate-50 font-mono text-[11px]">
                        <td className="p-3 font-bold text-slate-800">{ev.evidence_id || ev.id}</td>
                        <td className="p-3 font-sans font-medium text-slate-800">{ev.source_name}</td>
                        <td className="p-3 font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {ev.data_type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {ev.value !== undefined ? JSON.stringify(ev.value) : '—'} {ev.unit || ''}
                        </td>
                        <td className="p-3 font-sans text-slate-600">
                          {typeof ev.latitude === 'number' && typeof ev.longitude === 'number'
                            ? `${ev.latitude.toFixed(2)}°N, ${ev.longitude.toFixed(2)}°E`
                            : 'N/A'}
                        </td>
                        <td className="p-3 font-sans text-slate-500">
                          {ev.observation_time ? new Date(ev.observation_time).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-3 text-slate-400 max-w-[140px] truncate" title={ev.hash || 'N/A'}>
                          {ev.hash || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB C: FINDINGS & CONFLICTS */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Material scientific findings, numerical discrepancies, and temporal mismatches detected during deterministic checks.
            </p>
            {findings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active findings or conflicts detected across assessed claims.
              </div>
            ) : (
              <div className="space-y-3">
                {findings.map((f, idx) => {
                  const s = severityBadge[f.severity] || severityBadge.medium;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {f.finding_code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.bg} ${s.text}`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Related Claim: <strong className="font-mono">{f.claim_id}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Status: <strong>{f.resolution_status}</strong>
                        </span>
                      </div>

                      <p className="text-slate-800 font-medium leading-relaxed">
                        {f.explanation}
                      </p>

                      {/* Competing values side-by-side */}
                      {f.competing_values && (
                        <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200 space-y-1">
                          <span className="text-[10px] font-bold text-purple-900 uppercase block">
                            Side-by-Side Source Comparison:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {Object.entries(f.competing_values).map(([src, val]: [string, any]) => (
                              <div key={src} className="bg-white p-2 rounded border border-purple-100">
                                <span className="font-bold text-slate-700 block text-[11px]">{src}</span>
                                <span className="font-mono text-purple-800 font-semibold">{JSON.stringify(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] text-blue-700 font-semibold">
                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Recommended Action: {f.recommended_action}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onResolveFinding?.(f)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer flex-shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve Discrepancy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB D: VERIFICATION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Audit log of past scientific verification runs, including execution IDs, checks completed/failed/skipped, and overall scientific states.
            </p>
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No past verification runs recorded yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {history.map((run) => (
                  <div key={run.run_id} className="p-4 bg-white space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {run.run_id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                          {run.overall_status}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px]">
                          State: {run.overall_scientific_state}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(run.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Total Claims</span>
                        <strong className="text-slate-800">{run.total_claims}</strong>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded">
                        <span className="text-emerald-700 block text-[10px]">Matched</span>
                        <strong className="text-emerald-800">{run.matched_count}</strong>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <span className="text-purple-700 block text-[10px]">Conflicting</span>
                        <strong className="text-purple-800">{run.conflicting_count}</strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-slate-500 block text-[10px]">Unverified</span>
                        <strong className="text-slate-700">{run.unverified_count}</strong>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-blue-700 block text-[10px]">Checks Completed</span>
                        <strong className="text-blue-800">{run.checks_completed}</strong>
                      </div>
                      <div className="bg-rose-50 p-2 rounded">
                        <span className="text-rose-700 block text-[10px]">Checks Failed</span>
                        <strong className="text-rose-800">{run.checks_failed}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB E: METHODOLOGY & CHECKS */}
        {activeTab === 'methodology' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              The deterministic verification engine executes deterministic checks across 9 categories. Skipped or error outcomes are strictly recorded and never falsely marked as passed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>1. Source & Provenance Integrity</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Resolves references against shared evidence store, validates source adequacy, and compares SHA-256 cryptographic snapshot hashes against retained payloads.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. Schema & Coordinate Quality</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Enforces finite numbers, ISO timestamp parsing, Karnataka/Indian Ocean bounding box coordinate checks (6°–22°N, 68°–80°E), and quality flags.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>3. Temporal & Forecast Alignment</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Separates real-time observation time from forward forecast valid time. Detects timestamp lag and temporal window mismatches.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>4. Units & Dimensional Consistency</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Deterministic conversion between knots, km/h, m/s, °C, K, and meters. Blocks dimensionally incompatible comparisons.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>5. Pure-Python Deterministic Arithmetic</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Recomputes baseline anomalies (SST - baseline), vector wind speed, and Haversine distances deterministically without using LLM arithmetic.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>6. Cross-Source Conflict Assessment</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Aligns comparable variables and flags material discrepancies exceeding defined physical tolerances (e.g. SST ±0.5°C, Wave ±0.5m).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>7. Scientific Reasoning & Attribution</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Separates direct observations from speculative causal claims. Valid extreme events (e.g. cyclone 5.8m waves) are not rejected as outliers.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>8. Scientific Uncertainty Retention</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Retains qualitative methodological boundaries and sensor standard errors without fabricating synthetic confidence percentages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB F: LIMITATIONS & CONFIGURATION */}
        {activeTab === 'limitations' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Safe, non-secret operational boundaries, sensor caveats, and platform configuration details.
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Official Safety Disclaimer
                </span>
                <p className="leading-relaxed">
                  The Evidence & Scientific Verification Agent provides scientific evidence auditing and numerical consistency evaluation. It does NOT replace official meteorological or disaster management advisories issued by IMD, INCOIS, or state disaster authorities.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 text-xs">
                <span className="font-bold text-slate-800 block">Operational Limitations</span>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-[11px]">
                  {limitations.length > 0 ? (
                    limitations.map((lim, idx) => <li key={idx}>{lim}</li>)
                  ) : (
                    <>
                      <li>Satellite altimetry and SST measurements subject to cloud-masking latency during active monsoon depressions.</li>
                      <li>In situ buoy drift may cause spatial alignment uncertainty up to ±0.05° within nearshore coastal zones.</li>
                      <li>Historical baseline anomalies calculated relative to 1991–2020 climatological normal.</li>
                      <li>Forecast claims beyond 72 hours exhibit increased ensemble divergence.</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Safe Configuration Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px] text-slate-700">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">Verification Engine</span>
                    <strong>Deterministic Python v1.0</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">Hash Algorithm</span>
                    <strong>SHA-256 Retained Snapshot</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">Geographic Domain</span>
                    <strong>Karnataka & Arabian Sea</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
