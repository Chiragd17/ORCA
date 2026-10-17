import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FishermanWorkspace } from '../features/fisherman';
import { MarineMonitoringWorkspace } from '../features/marine-monitoring';
import { ProtectedAreasWorkspace } from '../features/protected-areas';
import { CoastalAuthorityWorkspace } from '../features/coastal-authority';
import { DisasterManagementWorkspace } from '../features/disaster-management';
import { CoastalRiskWorkspace } from '../features/coastal-risk';
import { AgentsHub } from '../features/agents-hub';

import { OceanResearchWorkspace } from '../features/ocean-research';
import { MarineHazardWorkspace } from '../features/marine-hazard';
import { EvidenceVerificationWorkspace } from '../features/evidence-verification';
import { OrchestratorWorkspace } from '../features/orchestrator';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/agents" replace />,
      },
      {
        path: 'agents',
        element: <AgentsHub />,
      },
      {
        path: 'agents/ocean-research',
        element: <OceanResearchWorkspace />,
      },
      {
        path: 'agents/marine-hazard',
        element: <MarineHazardWorkspace />,
      },
      {
        path: 'agents/coastal-risk',
        element: <CoastalRiskWorkspace />,
      },
      {
        path: 'agents/evidence-verification',
        element: <EvidenceVerificationWorkspace />,
      },
      {
        path: 'agents/orchestrator',
        element: <OrchestratorWorkspace />,
      },
      {
        path: 'orchestrator',
        element: <Navigate to="/agents/orchestrator" replace />,
      },
      {
        path: 'ocean-research',
        element: <Navigate to="/agents/ocean-research" replace />,
      },
      {
        path: 'marine-hazard',
        element: <Navigate to="/agents/marine-hazard" replace />,
      },
      {
        path: 'coastal-risk',
        element: <Navigate to="/agents/coastal-risk" replace />,
      },
      {
        path: 'evidence-verification',
        element: <Navigate to="/agents/evidence-verification" replace />,
      },

      {
        path: 'fisherman',
        element: <FishermanWorkspace />,
      },
      {
        path: 'marine-monitoring',
        element: <MarineMonitoringWorkspace />,
      },
      {
        path: 'protected-areas',
        element: <ProtectedAreasWorkspace />,
      },
      {
        path: 'coastal-authority',
        element: <CoastalAuthorityWorkspace />,
      },
      {
        path: 'disaster-management',
        element: <DisasterManagementWorkspace />,
      },
    ],
  },
]);
