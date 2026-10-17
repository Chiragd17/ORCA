import React from 'react';
import { History, ChevronRight } from 'lucide-react';
import { InvestigationListItem } from '../types';

interface Props {
  investigations: InvestigationListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export const InvestigationHistoryList: React.FC<Props> = ({
  investigations,
  selectedId,
  onSelect,
  loading = false,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-[#0a1628]">Recent Investigations</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {investigations.length} Logged
        </span>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {investigations.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            {loading ? 'Loading investigations...' : 'No multi-agent investigations run yet.'}
          </div>
        ) : (
          investigations.map((inv) => {
            const isSelected = inv.investigation_id === selectedId;
            const isPartial = inv.status === 'partial';

            return (
              <button
                key={inv.investigation_id}
                type="button"
                onClick={() => onSelect(inv.investigation_id)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50/50 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {inv.investigation_id}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {inv.workspace}
                    </span>
                    {isPartial ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        PARTIAL
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {inv.query}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
