import React from 'react';
import { AlertTriangle, RefreshCw, Clock, Waves } from 'lucide-react';

interface Props {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  forecastVisible?: boolean;
  onToggleForecast?: () => void;
}

export const HazardWorkspaceHeader: React.FC<Props> = ({
  lastUpdated,
  loading,
  onRefresh,
  forecastVisible = true,
  onToggleForecast,
}) => {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-xl text-white shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a1628]">Marine Hazard & Forecast Agent</h1>
            <p className="text-xs text-[#4a6fa5] mt-0.5">
              Autonomous cyclone tracking, GDACS disaster alerts, Douglas Sea State evaluation, and numerical marine forecasts
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-xs text-[#6b8fc0]">
        {lastUpdated && (
          <div className="hidden md:flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Last updated</span>
            <span className="font-medium text-[#3a5070]">
              {lastUpdated.toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </span>
          </div>
        )}

        {onToggleForecast && (
          <button
            onClick={onToggleForecast}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              forecastVisible
                ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={forecastVisible ? 'Hide / Collapse Forward Marine Forecast Advisory' : 'Open Forward Marine Forecast Advisory'}
          >
            <Waves className={`w-3.5 h-3.5 ${forecastVisible ? 'text-orange-600' : 'text-slate-400'}`} />
            <span>Forecast Advisory</span>
            <span className={`w-1.5 h-1.5 rounded-full ${forecastVisible ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[#e6f0ff] text-[#4a6fa5] hover:text-[#0284c7] transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Refresh marine hazard analysis"
          title="Refresh hazard and forecast data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
