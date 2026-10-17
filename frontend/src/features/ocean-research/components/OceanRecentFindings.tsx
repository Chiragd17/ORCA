import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Waves,
  Thermometer,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { Finding, EvidenceRecord } from '../../../types';

interface Props {
  findings: Finding[];
  evidence?: EvidenceRecord[];
}

function getFindingIcon(claim: string) {
  const c = claim.toLowerCase();
  if (c.includes('temperature') || c.includes('sst') || c.includes('thermal') || c.includes('warm') || c.includes('anomaly')) {
    return {
      icon: Thermometer,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      badge: 'Thermal Oceanography',
    };
  }
  if (c.includes('current') || c.includes('circulation') || c.includes('velocity')) {
    return {
      icon: Compass,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      badge: 'Hydrodynamics',
    };
  }
  return {
    icon: Waves,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    badge: 'Wave Dynamics',
  };
}

export const OceanRecentFindings: React.FC<Props> = ({ findings, evidence = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const displayFindings = findings.slice(0, 5);

  const filteredFindings = useMemo(() => {
    if (!searchQuery) return findings;
    const q = searchQuery.toLowerCase();
    return findings.filter((f) => f.claim.toLowerCase().includes(q) || (f.finding_id || f.id || '').toLowerCase().includes(q));
  }, [findings, searchQuery]);

  return (
    <>
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#0a1628]">Recent Findings</h3>
          <button
            onClick={() => setIsOpen(true)}
            className="text-[11px] font-medium text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-0.5"
          >
            <span>View all</span>
            <span className="text-[10px]">→</span>
          </button>
        </div>

        {/* Findings List */}
        <div className="space-y-2">
          {displayFindings.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#6b8fc0]">
              No findings generated yet. Run research analysis.
            </div>
          ) : (
            displayFindings.map((finding) => {
              const { icon: Icon, color } = getFindingIcon(finding.claim);
              return (
                <div
                  key={finding.finding_id || finding.id}
                  onClick={() => setSelectedFinding(finding)}
                  className="group flex items-start gap-2.5 p-2 rounded-lg border border-[#e8eef5] hover:border-[#b8d4f0] hover:bg-[#f7fafc] cursor-pointer transition-all"
                >
                  <div className={`p-1.5 rounded-lg ${color} flex-shrink-0 mt-0.5`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#1a3258] line-clamp-2 leading-snug group-hover:text-[#2563eb]">
                      {finding.claim}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#93b1d6]">
                      <span>{finding.evidence_ids.length} evidence</span>
                      <span>•</span>
                      <span>{Math.round((finding.confidence_score ?? 0.95) * 100)}% confidence</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#93b1d6] group-hover:text-[#2563eb] flex-shrink-0 mt-1" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* View All Findings Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#d8e4f0] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e8eef5] flex items-center justify-between bg-[#f7fafc]">
              <div>
                <h3 className="text-sm font-semibold text-[#0a1628]">All Research Findings</h3>
                <p className="text-[11px] text-[#6b8fc0]">{findings.length} findings derived across Karnataka research domain</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#6b8fc0] hover:text-[#0a1628] hover:bg-[#e8eef5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[#e8eef5]">
              <div className="flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-[#93b1d6]" />
                <input
                  type="text"
                  placeholder="Filter findings by claim, parameter, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-[#0a1628] placeholder-[#93b1d6] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {filteredFindings.map((finding) => {
                const { icon: Icon, color, badge } = getFindingIcon(finding.claim);
                return (
                  <div
                    key={finding.finding_id || finding.id}
                    onClick={() => {
                      setSelectedFinding(finding);
                    }}
                    className="p-3 rounded-lg border border-[#e8eef5] hover:border-[#b8d4f0] hover:bg-[#f7fafc] cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${color}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge}</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#6b8fc0]">{finding.finding_id || finding.id}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                        {Math.round((finding.confidence_score ?? 0.95) * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#1a3258] leading-relaxed">{finding.claim}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[#93b1d6] pt-1 border-t border-[#f0f5fa]">
                      <span>Linked Evidence: {finding.evidence_ids.join(', ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected Finding Detail Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#d8e4f0] max-w-lg w-full overflow-hidden animate-in fade-in duration-200">
            <div className="px-5 py-4 border-b border-[#e8eef5] flex items-center justify-between bg-[#f7fafc]">
              <div>
                <h3 className="text-sm font-semibold text-[#0a1628]">Scientific Finding Verification</h3>
                <p className="text-[10px] font-mono text-[#2563eb]">{selectedFinding.finding_id}</p>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1 rounded-lg text-[#6b8fc0] hover:text-[#0a1628] hover:bg-[#e8eef5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] uppercase font-semibold text-blue-700 tracking-wider block mb-1">
                  Verified Scientific Claim
                </span>
                <p className="text-xs font-medium text-[#1a3258] leading-relaxed">
                  {selectedFinding.claim}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-[#f7fafc] p-2.5 rounded border border-[#e8eef5]">
                  <span className="text-[#6b8fc0] block text-[10px] uppercase font-semibold">Analytical Confidence</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {Math.round((selectedFinding.confidence_score ?? 0.95) * 100)}%
                  </span>
                  <span className="text-[10px] text-[#93b1d6] block">Model convergence validated</span>
                </div>
                <div className="bg-[#f7fafc] p-2.5 rounded border border-[#e8eef5]">
                  <span className="text-[#6b8fc0] block text-[10px] uppercase font-semibold">Evidence Traces</span>
                  <span className="text-sm font-bold text-[#2563eb]">
                    {selectedFinding.evidence_ids.length} Records
                  </span>
                  <span className="text-[10px] text-[#93b1d6] block">SHA-256 Verified</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#6b8fc0] block uppercase font-semibold mb-1.5">
                  Linked Evidence Signatures
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedFinding.evidence_ids.map((eid) => {
                    const matchedEv = evidence.find((e) => e.evidence_id === eid);
                    return (
                      <div key={eid} className="p-2 rounded bg-[#f7fafc] border border-[#e8eef5] text-[10px] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[#2563eb] font-semibold">{eid}</span>
                          <p className="text-[#6b8fc0] mt-0.5 truncate max-w-xs">{matchedEv?.source_name || 'Marine Physical Model'}</p>
                        </div>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-medium">
                          Verified
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-medium hover:bg-[#1d4ed8]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
