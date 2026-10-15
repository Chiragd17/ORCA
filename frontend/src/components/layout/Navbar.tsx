import React from 'react';
import { NavLink } from 'react-router-dom';
import { Anchor, ShieldAlert, Waves, Compass, Activity, ShieldCheck } from 'lucide-react';

const workspaces = [
  { id: 'fisherman', label: 'Fisherman', path: '/fisherman', icon: Anchor },
  { id: 'marine-monitoring', label: 'Marine Monitoring', path: '/marine-monitoring', icon: Waves },
  { id: 'protected-areas', label: 'Protected Areas', path: '/protected-areas', icon: ShieldCheck },
  { id: 'coastal-authority', label: 'Coastal Authority', path: '/coastal-authority', icon: Compass },
  { id: 'disaster-management', label: 'Disaster Management', path: '/disaster-management', icon: ShieldAlert },
];

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              ORCA
            </span>
            <span className="block text-[10px] text-slate-400 font-mono tracking-tight uppercase">
              Marine & Coastal Intelligence
            </span>
          </div>
        </div>

        {/* Five Workspaces Nav */}
        <nav className="flex items-center gap-1">
          {workspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <NavLink
                key={ws.id}
                to={ws.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{ws.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>4 AGENTS ACTIVE</span>
        </div>
      </div>
    </header>
  );
};
