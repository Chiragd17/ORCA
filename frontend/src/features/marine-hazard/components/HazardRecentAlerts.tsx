import React, { useState } from 'react';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { HazardEvent } from '../types';

interface Props {
  liveAlerts: HazardEvent[];
  historicalEvents: HazardEvent[];
  onSelectEvent?: (event: HazardEvent) => void;
}

export const HazardRecentAlerts: React.FC<Props> = ({
  liveAlerts,
  historicalEvents,
  onSelectEvent,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<HazardEvent | null>(null);

  // Combine live alerts first (prioritizing regional alerts), then prominent historical cyclones
  const items = React.useMemo(() => {
    if (liveAlerts.length > 0) {
      const sorted = [...liveAlerts].sort((a, b) => {
        const aLocal = (a.basin === 'arabian_sea' || a.basin === 'bay_of_bengal' || a.basin === 'north_indian') ? 1 : 0;
        const bLocal = (b.basin === 'arabian_sea' || b.basin === 'bay_of_bengal' || b.basin === 'north_indian') ? 1 : 0;
        return bLocal - aLocal;
      });
      return sorted.slice(0, 5);
    }
    return historicalEvents.slice(0, 5);
  }, [liveAlerts, historicalEvents]);

  const getAlertBadge = (ev: HazardEvent) => {
    if (ev.status === 'active') {
      return { bg: 'bg-red-50 text-red-700 border-red-200', text: 'ACTIVE ALERT' };
    }
    return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'HISTORICAL' };
  };

  return (
    <>
      <div className="rounded-2xl bg-white border border-[#d8e4f0] shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-[#0a1628]">Recent Storm Alerts & Precedents</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {liveAlerts.length > 0 ? `${liveAlerts.length} Active` : 'Registry'}
          </span>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No recent alerts or precedents available.
            </div>
          ) : (
            items.map((ev) => {
              const badge = getAlertBadge(ev);
              return (
                <div
                  key={ev.hazard_id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    onSelectEvent?.(ev);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200/80 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${badge.bg}`}>
                        {badge.text}
                      </span>
                      <p className="text-xs font-bold text-[#0a1628] truncate">{ev.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ev.basin ? ev.basin.replace('_', ' ') : 'North Indian Ocean'} • {ev.first_observed ? new Date(ev.first_observed).getFullYear() : 'Historical'}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Flyout Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0a1628]">{selectedEvent.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedEvent.hazard_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Data Source:</span>
                <span className="font-semibold text-slate-800">{selectedEvent.source}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Oceanic Basin:</span>
                <span className="capitalize text-slate-800">{selectedEvent.basin?.replace('_', ' ') || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Observation Period:</span>
                <span className="font-mono text-slate-800">
                  {selectedEvent.first_observed ? new Date(selectedEvent.first_observed).toLocaleDateString() : 'N/A'} – {selectedEvent.last_observed ? new Date(selectedEvent.last_observed).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Track Fixes in DB:</span>
                <span className="font-bold text-orange-600">{selectedEvent.track_points?.length || 0} Points</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  onSelectEvent?.(selectedEvent);
                  setSelectedEvent(null);
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs"
              >
                Load Track on Map
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
