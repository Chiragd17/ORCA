import { Finding, EvidenceRecord } from '../../../types';

interface Props {
  findings: Finding[];
  evidence?: EvidenceRecord[];
}

const FINDING_ICONS: Record<string, { emoji: string; color: string }> = {
  settlement: { emoji: '🏘️', color: 'bg-red-50 text-red-500' },
  port: { emoji: '⚓', color: 'bg-blue-50 text-blue-500' },
  hospital: { emoji: '🏥', color: 'bg-purple-50 text-purple-500' },
  protected: { emoji: '🛡️', color: 'bg-emerald-50 text-emerald-500' },
  marine: { emoji: '🌊', color: 'bg-cyan-50 text-cyan-500' },
  cyclone: { emoji: '🌀', color: 'bg-orange-50 text-orange-500' },
};

function categorizeFinding(claim: string): keyof typeof FINDING_ICONS {
  const lower = claim.toLowerCase();
  if (lower.includes('settlement') || lower.includes('resident')) return 'settlement';
  if (lower.includes('port') || lower.includes('harbour')) return 'port';
  if (lower.includes('hospital') || lower.includes('healthcare')) return 'hospital';
  if (lower.includes('ecological') || lower.includes('mangrove') || lower.includes('habitat')) return 'protected';
  if (lower.includes('cyclone') || lower.includes('storm')) return 'cyclone';
  return 'marine';
}

function getTimeSince(findingId: string): string {
  // Approximate timestamps from finding sequence
  const seq = parseInt(findingId.split('_').pop() || '0');
  return `${seq + 2} min ago`;
}

export const RecentFindings: React.FC<Props> = ({ findings, evidence: _evidence }) => {
  const displayFindings = findings.slice(0, 5);

  return (
    <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <div className="px-4 py-3 border-b border-[#e8eef5] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0a1628]">Recent Findings</h3>
        {findings.length > 0 && (
          <span className="text-[11px] text-[#2563eb] font-medium cursor-pointer hover:underline">
            View all →
          </span>
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
              <div key={f.finding_id} className="px-4 py-2.5 hover:bg-[#f7fafc] transition-colors cursor-pointer">
                <div className="flex items-start gap-2.5">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${style.color}`}>
                    {style.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#1a3258] leading-snug line-clamp-2">
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
  );
};
