import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Anchor, ShieldAlert, Waves, Compass, Activity, ShieldCheck, RefreshCw, Database, Server } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

const workspaces = [
  { id: 'fisherman', label: 'Fisherman', path: '/fisherman', icon: Anchor },
  { id: 'marine-monitoring', label: 'Marine Monitoring', path: '/marine-monitoring', icon: Waves },
  { id: 'protected-areas', label: 'Protected Areas', path: '/protected-areas', icon: ShieldCheck },
  { id: 'coastal-authority', label: 'Coastal Authority', path: '/coastal-authority', icon: Compass },
  { id: 'disaster-management', label: 'Disaster Management', path: '/disaster-management', icon: ShieldAlert },
];

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<{ status: string; database: string; version: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await apiClient.checkHealth();
      setHealth(data);
      setError(null);
      setLastChecked(new Date());
    } catch (err: any) {
      setHealth(null);
      setError('Backend unreachable');
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

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

        {/* Real Backend & Database Health Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            {/* Backend Status */}
            <div className="flex items-center gap-1.5" title={error ? error : `Backend API v${health?.version || '0.1.0'} active`}>
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className={health ? 'text-slate-300' : 'text-rose-400'}>
                {health ? 'API LIVE' : 'API OFFLINE'}
              </span>
            </div>

            <span className="text-slate-700">|</span>

            {/* Database Status */}
            <div className="flex items-center gap-1.5" title={`Database status: ${health?.database || 'disconnected'}`}>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className={`w-2 h-2 rounded-full ${health?.database === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={health?.database === 'connected' ? 'text-slate-300' : 'text-amber-400'}>
                {health?.database === 'connected' ? 'DB LIVE' : 'DB NO-CONN'}
              </span>
            </div>

            {/* Manual refresh / last checked */}
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="p-1 hover:text-cyan-400 text-slate-500 transition-colors"
              title={lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : 'Check connection'}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
