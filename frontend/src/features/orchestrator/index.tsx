import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import {
  OrchestratorStats,
  EnrichedInvestigationDetail,
  InvestigationListItem,
} from './types';

import { WorkspaceHeader } from './components/WorkspaceHeader';
import { SummaryCards } from './components/SummaryCards';
import { ExecutionPlanGraph } from './components/ExecutionPlanGraph';
import { SpecialistAgentsGrid } from './components/SpecialistAgentsGrid';
import { InvestigationDetailView } from './components/InvestigationDetailView';
import { InvestigationHistoryList } from './components/InvestigationHistoryList';
import { InvestigationLauncher } from './components/InvestigationLauncher';
import { AlertCircle } from 'lucide-react';

export const OrchestratorWorkspace: React.FC = () => {
  const [stats, setStats] = useState<OrchestratorStats | null>(null);
  const [investigations, setInvestigations] = useState<InvestigationListItem[]>([]);
  const [currentInvestigation, setCurrentInvestigation] = useState<EnrichedInvestigationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [launcherOpen, setLauncherOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async (selectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.get<OrchestratorStats>('/orchestrator/stats').catch(() => null),
        apiClient.get<InvestigationListItem[]>('/orchestrator').catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      if (listRes) setInvestigations(listRes);


      // Determine which investigation to display
      const targetId = selectId || (listRes && listRes.length > 0 ? listRes[0].investigation_id : null);
      if (targetId) {
        const detail = await apiClient.get<EnrichedInvestigationDetail>(`/orchestrator/${targetId}`).catch(() => null);
        if (detail) {
          setCurrentInvestigation(detail);
        }
      }

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to load orchestrator data:', err);
      setError('Unable to fetch orchestrator telemetry from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectInvestigation = async (id: string) => {
    setLoading(true);
    try {
      const detail = await apiClient.get<EnrichedInvestigationDetail>(`/orchestrator/${id}`);
      if (detail) {
        setCurrentInvestigation(detail);
      }
    } catch (err) {
      console.error('Failed to load investigation detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchInvestigation = async (params: {
    workspace: string;
    query: string;
    latitude: number;
    longitude: number;
    radius_km: number;
  }) => {
    setRunning(true);
    setError(null);
    try {
      const res = await apiClient.post<{ investigation_id: string }>('/orchestrator', params);
      if (res?.investigation_id) {
        await loadData(res.investigation_id);
      }
    } catch (err: any) {
      console.error('Failed to execute investigation:', err);
      setError(err?.message || 'Investigation execution failed.');
      throw err;
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Workspace Header */}
      <WorkspaceHeader
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={() => loadData(currentInvestigation?.investigation_id)}
        onOpenLauncher={() => setLauncherOpen(true)}
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Telemetry Summary Cards */}
      <SummaryCards stats={stats} loading={loading} />

      {/* Specialist Agents Coordination Grid */}
      <SpecialistAgentsGrid
        selectedAgents={currentInvestigation?.plan?.selected_agents || ['ocean_research', 'marine_hazard', 'coastal_risk', 'evidence_verification']}
        findings={currentInvestigation?.findings || []}
      />


      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column (3/4 width on desktop): Dynamic Execution Graph + Detailed Tabbed Results */}
        <div className="lg:col-span-3 space-y-4 min-w-0">
          <ExecutionPlanGraph
            plan={currentInvestigation?.plan || null}
            status={currentInvestigation?.status || 'completed'}
          />

          {currentInvestigation && (
            <InvestigationDetailView investigation={currentInvestigation} />
          )}
        </div>

        {/* Right Column (1/4 width on desktop): History of Multi-Agent Runs */}
        <div className="lg:col-span-1 space-y-4">
          <InvestigationHistoryList
            investigations={investigations}
            selectedId={currentInvestigation?.investigation_id}
            onSelect={handleSelectInvestigation}
            loading={loading}
          />
        </div>
      </div>

      {/* Launch Investigation Modal */}
      <InvestigationLauncher
        isOpen={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onSubmit={handleLaunchInvestigation}
        loading={running}
      />
    </div>
  );
};
