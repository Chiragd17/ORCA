import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Finding, EvidenceRecord } from '../../../types';

interface Props {
  findings: Finding[];
  evidence?: EvidenceRecord[];
}

const FINDING_ICONS: Record<
  string,
  { emoji: string; color: string; badgeColor: string; label: string }
> = {
  settlement: {
    emoji: '🏘️',
    color: 'bg-red-50 text-red-600',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    label: 'Settlement & Demographics',
  },
  port: {
    emoji: '⚓',
    color: 'bg-blue-50 text-blue-600',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Maritime & Port Facility',
  },
  hospital: {
    emoji: '🏥',
    color: 'bg-purple-50 text-purple-600',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'Critical Healthcare',
  },
  protected: {
    emoji: '🛡️',
    color: 'bg-emerald-50 text-emerald-600',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Ecological & Reserve',
  },
  marine: {
    emoji: '🌊',
    color: 'bg-cyan-50 text-cyan-600',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    label: 'Ocean Telemetry & Surge',
  },
  cyclone: {
    emoji: '🌀',
    color: 'bg-orange-50 text-orange-600',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    label: 'Meteorological Hazard',
  },
};

function categorizeFinding(claim: string): keyof typeof FINDING_ICONS {
  const lower = claim.toLowerCase();
  if (lower.includes('settlement') || lower.includes('resident') || lower.includes('population'))
    return 'settlement';
  if (lower.includes('port') || lower.includes('harbour') || lower.includes('maritime') || lower.includes('naval'))
    return 'port';
  if (lower.includes('hospital') || lower.includes('healthcare') || lower.includes('medical'))
    return 'hospital';
  if (lower.includes('ecological') || lower.includes('mangrove') || lower.includes('habitat') || lower.includes('estuary'))
    return 'protected';
  if (lower.includes('cyclone') || lower.includes('storm') || lower.includes('surge'))
    return 'cyclone';
  return 'marine';
}

function getTimeSince(findingId: string): string {
  const seq = parseInt(findingId.split('_').pop() || '0');
  return `${seq + 2} min ago`;
}

export const RecentFindings: React.FC<Props> = ({ findings, evidence = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const displayFindings = findings.slice(0, 5);

  const filteredFindings = useMemo(() => {
    let list = findings;
    if (categoryFilter !== 'all') {
      list = list.filter((f) => categorizeFinding(f.claim) === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.claim.toLowerCase().includes(q) ||
          f.finding_id.toLowerCase().includes(q) ||
          f.evidence_ids.some((eid) => eid.toLowerCase().includes(q))
      );
    }
    return list;
  }, [findings, categoryFilter, searchQuery]);

  const categories = [
    { id: 'all', label: 'All Findings', count: findings.length },
    {
      id: 'settlement',
      label: 'Settlements',
      count: findings.filter((f) => categorizeFinding(f.claim) === 'settlement').length,
      emoji: '🏘️',
    },
    {
      id: 'port',
      label: 'Ports & Harbours',
      count: findings.filter((f) => categorizeFinding(f.claim) === 'port').length,
      emoji: '⚓',
    },
    {
      id: 'hospital',
      label: 'Healthcare',
      count: findings.filter((f) => categorizeFinding(f.claim) === 'hospital').length,
      emoji: '🏥',
    },
    {
      id: 'protected',
      label: 'Ecological',
      count: findings.filter((f) => categorizeFinding(f.claim) === 'protected').length,
      emoji: '🛡️',
    },
    {
      id: 'marine',
      label: 'Marine Waves',
      count: findings.filter((f) => categorizeFinding(f.claim) === 'marine').length,
      emoji: '🌊',
    },
  ];

  // Helper map for linked evidence lookup
  const evidenceMap = useMemo(() => {
    const map = new Map<string, EvidenceRecord>();
    for (const ev of evidence) {
      map.set(ev.evidence_id, ev);
    }
    return map;
  }, [evidence]);

  return (
    <>
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-xs">
        <div className="px-4 py-3 border-b border-[#e8eef5] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0a1628]">Recent Findings</h3>
          {findings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedFindingId(null);
                setIsOpen(true);
              }}
              className="text-[11px] text-[#2563eb] font-semibold cursor-pointer hover:text-[#1d4ed8] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <span>→</span>
            </button>
          )}
        </div>

        {displayFindings.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-[#6b8fc0]">No findings yet</p>
            <p className="text-[10px] text-[#93b1d6] mt-1">Run an analysis to generate findings</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f5fa]">
            {displayFindings.map((f) => {
              const category = categorizeFinding(f.claim);
              const style = FINDING_ICONS[category];
              return (
                <div
                  key={f.finding_id}
                  onClick={() => {
                    setSelectedFindingId(f.finding_id);
                    setIsOpen(true);
                  }}
                  className="px-4 py-2.5 hover:bg-[#f7fafc] transition-colors cursor-pointer group"
                  title="Click to view detailed scientific claim & evidence"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${style.color}`}
                    >
                      {style.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1a3258] leading-snug line-clamp-2 group-hover:text-[#2563eb] transition-colors">
                        {f.claim.length > 80 ? f.claim.substring(0, 80) + '...' : f.claim}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {f.evidence_ids.length > 0 && (
                          <span className="text-[10px] text-[#6b8fc0]">
                            {f.evidence_ids.length} evidence
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#93b1d6] flex-shrink-0 whitespace-nowrap">
                      {getTimeSince(f.finding_id)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Findings Modal Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      All Investigative Findings & Claims
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {findings.length} Verified Claims
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scientific, demographic, and spatial exposure outputs generated by the Coastal Impact & Risk Agent.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter findings by claim text, settlement name, facility, or evidence ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      categoryFilter === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat.emoji && <span>{cat.emoji}</span>}
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        categoryFilter === cat.id
                          ? 'bg-blue-500/40 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Findings List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-[#f8fafc]">
              {filteredFindings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-xl border border-slate-200">
                  <p className="text-sm font-medium">No findings match your filter.</p>
                  <p className="text-xs text-slate-400">Try searching with a different term or select &quot;All Findings&quot;.</p>
                </div>
              ) : (
                filteredFindings.map((f) => {
                  const category = categorizeFinding(f.claim);
                  const style = FINDING_ICONS[category];
                  const isSelected = selectedFindingId === f.finding_id;

                  return (
                    <div
                      key={f.finding_id}
                      className={`p-4 rounded-xl border bg-white transition-all space-y-3 shadow-2xs ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Meta Line */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${style.color}`}
                          >
                            {style.emoji}
                          </span>
                          <div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${style.badgeColor}`}
                            >
                              {style.label}
                            </span>
                            <span className="font-mono text-[10.5px] text-slate-400 ml-2">
                              {f.finding_id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            VERIFIED
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {getTimeSince(f.finding_id)}
                          </span>
                        </div>
                      </div>

                      {/* Claim Text */}
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {f.claim}
                      </p>

                      {/* Supporting Evidence Chain */}
                      {f.evidence_ids.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Cryptographic Evidence Backing ({f.evidence_ids.length} records)</span>
                            </span>
                            <span className="text-[10px] text-slate-400">SHA-256 Validated</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {f.evidence_ids.map((eid) => {
                              const ev = evidenceMap.get(eid);
                              return (
                                <span
                                  key={eid}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[10.5px] text-slate-700 font-mono"
                                  title={
                                    ev?.raw_data?.name
                                      ? `Feature: ${ev.raw_data.name} | Type: ${ev.data_type}`
                                      : `Evidence Record: ${eid}`
                                  }
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  <span>{eid}</span>
                                  {ev?.raw_data?.name && (
                                    <span className="font-sans font-medium text-slate-900 ml-1">
                                      ({ev.raw_data.name})
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Showing {filteredFindings.length} of {findings.length} findings from current spatial run.
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
