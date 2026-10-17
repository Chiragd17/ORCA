import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FishermanWorkspace } from '../features/fisherman';
import { ProtectedAreasWorkspace } from '../features/protected-areas';
import { CoastalAuthorityWorkspace } from '../features/coastal-authority';
import { DisasterManagementWorkspace } from '../features/disaster-management';
import { CoastalRiskWorkspace } from '../features/coastal-risk';
import { AgentsHub } from '../features/agents-hub';

import { OceanResearchWorkspace } from '../features/ocean-research';

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
        path: 'agents/coastal-risk',
        element: <CoastalRiskWorkspace />,
      },
      {
        path: 'agents/ocean-research',
        element: <OceanResearchWorkspace />,
      },
      {
        path: 'coastal-risk',
        element: <Navigate to="/agents/coastal-risk" replace />,
      },
      {
        path: 'fisherman',
        element: <FishermanWorkspace />,
      },
      {
        path: 'marine-monitoring',
        element: <OceanResearchWorkspace />,
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
