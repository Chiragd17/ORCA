import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../lib/api-client';
import {
  VerificationSummaryData,
  NormalizedClaim,
  EvidenceItem,
  VerificationFinding,
  VerificationRun,
} from './types';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { SummaryCards } from './components/SummaryCards';
import { VerificationOverview } from './components/VerificationOverview';
import { VerificationTabs } from './components/VerificationTabs';
import { RightRail } from './components/RightRail';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { ResolveFindingModal } from './components/ResolveFindingModal';
import { AlertTriangle } from 'lucide-react';

export const EvidenceVerificationWorkspace: React.FC = () => {
  const [summary, setSummary] = useState<VerificationSummaryData | null>(null);
  const [claims, setClaims] = useState<NormalizedClaim[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [findings, setFindings] = useState<VerificationFinding[]>([]);
  const [history, setHistory] = useState<VerificationRun[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<NormalizedClaim | null>(null);
  const [resolvingFinding, setResolvingFinding] = useState<VerificationFinding | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningAudit, setRunningAudit] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const evidenceMap = useMemo(() => {
    const map: Record<string, EvidenceItem> = {};
    for (const item of evidence) {
      const id = item.evidence_id || item.id;
      if (id) {
        map[id] = item;
      }
    }
    return map;
  }, [evidence]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, claimsRes, evRes, findRes, histRes, methRes] = await Promise.all([
        apiClient.get<VerificationSummaryData>('/evidence-verification/summary').catch(() => null),
        apiClient.get<{ claims: NormalizedClaim[] }>('/evidence-verification/claims').catch(() => null),
        apiClient.get<{ evidence: EvidenceItem[] }>('/evidence-verification/evidence').catch(() => null),
        apiClient.get<{ findings: VerificationFinding[] }>('/evidence-verification/findings').catch(() => null),
        apiClient.get<{ history: VerificationRun[] }>('/evidence-verification/history').catch(() => null),
        apiClient.get<{ limitations: string[] }>('/evidence-verification/methodology').catch(() => null),
      ]);

      if (sumRes) setSummary(sumRes);
      if (claimsRes?.claims) setClaims(claimsRes.claims);
      if (evRes?.evidence) setEvidence(evRes.evidence);
      if (findRes?.findings) setFindings(findRes.findings);
      if (histRes?.history) setHistory(histRes.history);
      if (methRes?.limitations) setLimitations(methRes.limitations);

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to load evidence verification data:', err);
      setError('Unable to load scientific verification audit records from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunVerification = async () => {
    setRunningAudit(true);
    setError(null);
    try {
      const result = await apiClient.post<VerificationRun>('/evidence-verification/runs', {
        investigation_id: null,
        force_recheck: true,
      });
      if (result) {
        await loadData();
      }
    } catch (err: any) {
      console.error('Error running verification audit:', err);
      setError('Verification audit execution encountered an operational error.');
    } finally {
      setRunningAudit(false);
    }
  };

  return (
    <div className="flex gap-4 min-h-full">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-4">
        <WorkspaceHeader
          lastUpdated={lastUpdated}
          loading={loading || runningAudit}
          onRefresh={loadData}
          onRunVerification={handleRunVerification}
          overallState={summary?.most_recent_execution?.overall_scientific_state || 'matched'}
        />

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Summary Metrics */}
        <SummaryCards summary={summary} loading={loading} />

        {/* Verification Overview Analytics (Charts & Integrity) */}
        <VerificationOverview summary={summary} loading={loading} />

        {/* Comprehensive Verification Tabs */}
        <VerificationTabs
          claims={claims}
          evidence={evidence}
          findings={findings}
          history={history}
          limitations={limitations}
          onSelectClaim={(c) => setSelectedClaim(c)}
          onResolveFinding={(f) => setResolvingFinding(f)}
          loading={loading}
        />
      </div>

      {/* Right Intelligence Rail */}
      <div className="hidden xl:block w-[340px] flex-shrink-0 space-y-4">
        <RightRail
          claims={claims}
          findings={findings}
          evidence={evidence}
          onSelectClaim={(c) => setSelectedClaim(c)}
          onResolveFinding={(f) => setResolvingFinding(f)}
        />
      </div>

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          evidenceMap={evidenceMap}
          onClose={() => setSelectedClaim(null)}
        />
      )}

      {/* Resolve Finding Modal */}
      {resolvingFinding && (
        <ResolveFindingModal
          finding={resolvingFinding}
          onClose={() => setResolvingFinding(null)}
          onResolved={() => loadData()}
        />
      )}
    </div>
  );
};

export default EvidenceVerificationWorkspace;
