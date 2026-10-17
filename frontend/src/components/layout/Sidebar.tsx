import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Ship,
  Waves,
  Leaf,
  Landmark,
  AlertTriangle,
  Bot,
  Plus,
  FileText,
  Radio,
  Database as DbIcon,
  Settings,
} from 'lucide-react';
import { ModalType } from './DataModals';

interface WorkspaceItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface AgentItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  isLive?: boolean;
}

const AGENTS: AgentItem[] = [
  {
    id: 'agents-overview',
    label: 'Agents Overview',
    path: '/agents',
    icon: Bot,
    iconColor: 'text-[#2563eb]',
  },
  {
    id: 'coastal-risk-agent',
    label: 'Coastal Impact & Risk',
    path: '/agents/coastal-risk',
    icon: Waves,
    iconColor: 'text-[#0284c7]',
    isLive: true,
  },
];

const WORKSPACES: WorkspaceItem[] = [
  {
    id: 'fisherman',
    label: 'Fisherman',
    path: '/fisherman',
    icon: Ship,
    iconColor: 'text-[#1e3a5f]',
  },
  {
    id: 'marine-monitoring',
    label: 'Marine Monitoring',
    path: '/marine-monitoring',
    icon: Waves,
    iconColor: 'text-[#0ea5e9]',
  },
  {
    id: 'protected-areas',
    label: 'Protected Areas',
    path: '/protected-areas',
    icon: Leaf,
    iconColor: 'text-[#10b981]',
  },
  {
    id: 'coastal-authority',
    label: 'Coastal Authority',
    path: '/coastal-authority',
    icon: Landmark,
    iconColor: 'text-[#8b5cf6]',
  },
  {
    id: 'disaster-management',
    label: 'Disaster Management',
    path: '/disaster-management',
    icon: AlertTriangle,
    iconColor: 'text-[#ef4444]',
  },
];

interface SidebarProps {
  onOpenModal?: (type: ModalType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenModal }) => {
  return (
    <nav className="h-full flex flex-col py-3 overflow-y-auto" aria-label="Main navigation">
      {/* Brand Header */}
      <div className="px-4 pt-2 pb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center shadow-xs">
          <Waves className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-[18px] tracking-wide text-[#0a1628] leading-none block">
            ORCA
          </span>
          <span className="text-[10.5px] text-[#4a6fa5] font-medium tracking-tight block mt-0.5">
            Marine & Coastal Intelligence
          </span>
        </div>
      </div>

      {/* WORKSPACES Section */}
      <div className="mb-4">
        <h3 className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
          Workspaces
        </h3>
        <div className="space-y-1 mt-1">
          {WORKSPACES.map((ws) => {
            const Icon = ws.icon;
            return (
              <NavLink
                key={ws.id}
                to={ws.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2.5 px-3 py-2 rounded-xl text-[13.5px] transition-all ${
                    isActive
                      ? 'bg-[#e8f1fc] text-[#1d4ed8] font-semibold shadow-xs'
                      : 'text-[#334155] font-medium hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }`
                }
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${ws.iconColor}`} />
                <span className="truncate">{ws.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* AGENTS HUB Section */}
      <div className="mb-4">
        <div className="px-4 py-1.5 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
            Agents Hub
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 text-blue-700 tracking-tight">
            AI Engine
          </span>
        </div>
        <div className="space-y-1 mt-1">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            return (
              <NavLink
                key={agent.id}
                to={agent.path}
                end={agent.path === '/agents'}
                title={agent.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2.5 px-3 py-2 rounded-xl text-[13.5px] transition-all ${
                    isActive
                      ? 'bg-[#e8f1fc] text-[#1d4ed8] font-semibold shadow-xs'
                      : 'text-[#334155] font-medium hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }`
                }
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${agent.iconColor}`} />
                <span className="truncate flex-1">{agent.label}</span>
                {agent.isLive && (
                  <span className="flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Investigations Section */}
      <div className="mb-4">
        <h3 className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
          Investigations
        </h3>
        <div className="space-y-1 mt-0.5">
          <button
            type="button"
            onClick={() => onOpenModal?.('new_investigation')}
            className="w-[calc(100%-20px)] flex items-center gap-2.5 mx-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all cursor-pointer text-left group"
          >
            <Plus className="w-4 h-4 flex-shrink-0 text-[#2563eb] group-hover:scale-125 transition-transform" />
            <span className="font-medium">New Investigation</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal?.('my_investigations')}
            className="w-[calc(100%-20px)] flex items-center gap-2.5 mx-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all cursor-pointer text-left group"
          >
            <FileText className="w-4 h-4 flex-shrink-0 text-[#64748b] group-hover:scale-110 transition-transform" />
            <span className="font-medium">My Investigations</span>
          </button>
        </div>
      </div>

      {/* Data & Resources Section */}
      <div className="mb-4">
        <h3 className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
          Data & Resources
        </h3>
        <div className="space-y-1 mt-0.5">
          <button
            type="button"
            onClick={() => onOpenModal?.('live_data')}
            className="w-[calc(100%-20px)] flex items-center gap-2.5 mx-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all cursor-pointer text-left group"
          >
            <Radio className="w-4 h-4 flex-shrink-0 text-cyan-600 group-hover:scale-110 transition-transform" />
            <span className="flex-1 font-medium">Live Data</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live stream active" />
          </button>

          <button
            type="button"
            onClick={() => onOpenModal?.('historical_data')}
            className="w-[calc(100%-20px)] flex items-center gap-2.5 mx-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all cursor-pointer text-left group"
          >
            <DbIcon className="w-4 h-4 flex-shrink-0 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Historical Data</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal?.('settings')}
            className="w-[calc(100%-20px)] flex items-center gap-2.5 mx-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all cursor-pointer text-left group"
          >
            <Settings className="w-4 h-4 flex-shrink-0 text-[#64748b] group-hover:rotate-45 transition-transform" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
