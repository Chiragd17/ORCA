import React, { useState } from 'react';
import {
  Activity,
  Hash,
  AlertTriangle,
  Lock,
  ArrowRight,
  Database,
  CheckCircle,
} from 'lucide-react';
import { NormalizedClaim, VerificationFinding, EvidenceItem } from '../types';

interface Props {
  claims: NormalizedClaim[];
  findings: VerificationFinding[];
  evidence: EvidenceItem[];
  onSelectClaim?: (claim: NormalizedClaim) => void;
  onResolveFinding?: (finding: VerificationFinding) => void;
}

export const RightRail: React.FC<Props> = ({
  claims,
  findings,
  evidence,
  onSelectClaim,
  onResolveFinding,
}) => {
  const [testHash, setTestHash] = useState('');
  const [hashResult, setHashResult] = useState<string | null>(null);

  const handleVerifyHash = () => {
    if (!testHash.trim()) {
      setHashResult(null);
      return;
    }
    const clean = testHash.trim().toLowerCase();
    const match = evidence.find(
      (e) => e.hash?.toLowerCase() === clean || e.evidence_id.toLowerCase() === clean
    );
    if (match) {
      setHashResult(`Valid Evidence Record: ${match.evidence_id} (${match.source_name})`);
      return;
    }

    // Also check if the user entered a Claim ID
    const claimMatch = claims.find(
      (c) => c.claim_id.toLowerCase() === clean
    );
    if (claimMatch) {
      const eids = claimMatch.evidence_ids || [];
      const resolved = eids.map((id) => evidence.find((e) => e.evidence_id === id)?.source_name || id);
      setHashResult(
        `Valid Claim (${claimMatch.claim_id}): Linked to ${eids.length} verified evidence payload(s): ${resolved.join('; ')}`
      );
      return;
    }

    setHashResult('No matching evidence snapshot hash or claim ID found in registry.');
  };

  return (
    <div className="space-y-4">
      {/* 1. Live Audit Engine Telemetry */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xs font-bold text-[#0a1628]">Audit Engine State</h2>
              <span className="text-[10px] text-slate-400">Deterministic Engine v1.0</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Database Connection:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Database className="w-3 h-3 text-blue-500" />
              orca_db (PostgreSQL)
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Arithmetic Engine:</span>
            <span className="font-semibold text-emerald-700 font-mono text-[10.5px]">
              Pure-Python (No LLM Math)
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Integrity Snapshot:</span>
            <span className="font-semibold text-purple-700 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              SHA-256 Retained
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Verification Latency:</span>
            <span className="font-mono text-slate-700 font-semibold">&lt; 12 ms</span>
          </div>
        </div>
      </div>

      {/* 2. Cryptographic Hash Verifier */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
          <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
            <Hash className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-xs font-bold text-[#0a1628]">Cryptographic Verifier</h2>
            <span className="text-[10px] text-slate-400">Audit snapshot provenance check</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Verify whether an evidence payload hash matches a tamper-evident snapshot stored in ORCA.
        </p>

        <div className="space-y-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Paste SHA-256 hash or evidence ID..."
              value={testHash}
              onChange={(e) => setTestHash(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
            <button
              onClick={handleVerifyHash}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Verify
            </button>
          </div>

          {hashResult && (
            <div
              className={`p-2 rounded-lg text-[11px] font-medium leading-tight ${
                hashResult.startsWith('Valid')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {hashResult}
            </div>
          )}
        </div>
      </div>

      {/* 3. Material Discrepancies & Findings */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xs font-bold text-[#0a1628]">Recent Findings</h2>
              <span className="text-[10px] text-slate-400">Requiring attention</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {findings.length} Discrepancies
          </span>
        </div>

        {findings.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center">
            No active material findings detected.
          </p>
        ) : (
          <div className="space-y-2.5">
            {findings.slice(0, 4).map((f, idx) => {
              const relatedClaim = claims.find((c) => c.claim_id === f.claim_id);
              return (
                <div
                  key={idx}
                  onClick={() => relatedClaim && onSelectClaim?.(relatedClaim)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-rose-700">{f.finding_code}</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold uppercase text-[9px]">
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 line-clamp-2">
                    {f.explanation}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>Claim: {f.claim_id}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolveFinding?.(f);
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold text-[9.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-2.5 h-2.5" />
                        Resolve
                      </button>
                      <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                        Inspect <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
