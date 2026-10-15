import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FishermanWorkspace } from '../features/fisherman';
import { MarineMonitoringWorkspace } from '../features/marine-monitoring';
import { ProtectedAreasWorkspace } from '../features/protected-areas';
import { CoastalAuthorityWorkspace } from '../features/coastal-authority';
import { DisasterManagementWorkspace } from '../features/disaster-management';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/fisherman" replace />,
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
