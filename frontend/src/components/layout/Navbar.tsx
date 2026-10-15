import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, Database, Server, Menu } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const [health, setHealth] = useState<{ status: string; database: string; version: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.checkHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth(null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <header className="h-[60px] flex items-center justify-between px-4 bg-white border-b border-[#d8e4f0] sticky top-0 z-50">
      {/* Left: Logo + Menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[#f0f5fa] text-[#4a6fa5] transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0891b2] to-[#2563eb] flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-[15px] tracking-wide text-[#0a1628]">
              ORCA
            </span>
            <span className="block text-[9px] text-[#4a6fa5] font-medium tracking-tight">
              Marine & Coastal Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-3">
        {/* API Status */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#f7fafc] border border-[#d8e4f0] text-xs font-medium">
          <div className="flex items-center gap-1.5" title={health ? `API v${health.version}` : 'API offline'}>
            <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <Server className="w-3.5 h-3.5 text-[#4a6fa5]" />
            <span className={health ? 'text-emerald-700' : 'text-rose-600'}>
              {health ? 'API LIVE' : 'API OFFLINE'}
            </span>
          </div>

          <span className="text-[#d8e4f0]">|</span>

          <div className="flex items-center gap-1.5" title={`DB: ${health?.database || 'unknown'}`}>
            <span className={`w-2 h-2 rounded-full ${health?.database === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <Database className="w-3.5 h-3.5 text-[#4a6fa5]" />
            <span className={health?.database === 'connected' ? 'text-emerald-700' : 'text-amber-600'}>
              {health?.database === 'connected' ? 'DB LIVE' : 'DB NO-CONN'}
            </span>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-1 hover:text-[#2563eb] text-[#4a6fa5] transition-colors"
            title={lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : 'Check connection'}
            aria-label="Refresh health status"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#2563eb]' : ''}`} />
          </button>
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-[#1a3258] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          K
        </div>
      </div>
    </header>
  );
};
