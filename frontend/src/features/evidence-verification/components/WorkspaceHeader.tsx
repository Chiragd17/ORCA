import React from 'react';
import { ShieldCheck, RefreshCw, Play } from 'lucide-react';

interface Props {
  lastUpdated?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onRunVerification?: () => void;
  overallState?: string;
}

export const WorkspaceHeader: React.FC<Props> = ({
  lastUpdated,
  loading = false,
  onRefresh,
  onRunVerification,
  overallState: _overallState = 'matched',
}) => {
  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title and metadata */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0a1628]">
                  Evidence & Scientific Verification Agent
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Specialist Agent 4
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUDIT ENGINE ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#6b8fc0]">
                Independent evaluation of scientific claims, evidence provenance, physical units, deterministic calculations, and source conflicts.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Audit Sync: {lastUpdated}
            </span>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl border border-[#cbd5e1] text-[#475569] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Audit Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {onRunVerification && (
            <button
              type="button"
              onClick={onRunVerification}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run Scientific Audit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
