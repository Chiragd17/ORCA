import React, { useState, useMemo } from 'react';
import { History, ChevronRight, Search, X, AlertCircle } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'partial'>('all');

  const filteredInvestigations = useMemo(() => {
    return investigations.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = inv.investigation_id.toLowerCase().includes(term);
        const matchesQuery = inv.query.toLowerCase().includes(term);
        const matchesWorkspace = (inv.workspace || '').toLowerCase().includes(term);
        return matchesId || matchesQuery || matchesWorkspace;
      }
      return true;
    });
  }, [investigations, searchTerm, statusFilter]);

  const completedCount = useMemo(
    () => investigations.filter((i) => i.status === 'completed').length,
    [investigations]
  );
  const partialCount = useMemo(
    () => investigations.filter((i) => i.status === 'partial').length,
    [investigations]
  );

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-[#0a1628]">Recent Investigations</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
          {investigations.length} Total
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by ID, query, or workspace..."
          className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 bg-slate-50/50 transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 text-[10px] font-bold">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          All ({investigations.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Completed ({completedCount})
        </button>
        {partialCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('partial')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'partial'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Partial ({partialCount})
          </button>
        )}
      </div>

      {/* Investigations List */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {loading && investigations.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Loading investigations from database...
          </div>
        ) : filteredInvestigations.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-1">
            <AlertCircle className="w-5 h-5 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No matching investigations</p>
            <p className="text-[11px] text-slate-400">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No investigations in this category.'}
            </p>
          </div>
        ) : (
          filteredInvestigations.map((inv) => {
            const isSelected = inv.investigation_id === selectedId;
            const isPartial = inv.status === 'partial';
            const dateStr = inv.created_at
              ? new Date(inv.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <button
                key={inv.investigation_id}
                type="button"
                onClick={() => onSelect(inv.investigation_id)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50/60 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-600 font-bold">
                      {inv.investigation_id}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
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

                  <div className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                    {inv.query}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{inv.findings_count ?? 0} findings</span>
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${
                    isSelected
                      ? 'text-indigo-600 translate-x-0.5'
                      : 'text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5'
                  }`}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
