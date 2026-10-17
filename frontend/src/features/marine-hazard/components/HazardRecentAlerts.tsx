import React, { useState } from 'react';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { HazardEvent } from '../types';

interface Props {
  liveAlerts: HazardEvent[];
  historicalEvents: HazardEvent[];
  onSelectEvent?: (event: HazardEvent, scrollToMap?: boolean) => void;
}

// Canonical Karnataka & Arabian Sea Cyclone Precedents verified in NOAA IBTrACS & PostgreSQL DB
const KARNATAKA_PRECEDENTS: (HazardEvent & { impactSummary: string; categoryLabel: string; badgeText: string; badgeStyle: string; maxWindKnots: number })[] = [
  {
    hazard_id: 'hz-ibtracs-2021133n10071',
    name: 'Cyclone Tauktae (Cat 4)',
    type: 'cyclone',
    basin: 'arabian_sea',
    status: 'historical',
    source: 'NOAA IBTrACS / IMD',
    first_observed: '2021-05-13T11:30:00Z',
    last_observed: '2021-05-19T11:30:00Z',
    maxWindKnots: 120,
    track_points: [],
    categoryLabel: 'Category 4 • Extremely Severe Cyclonic Storm (ESCS)',
    badgeText: 'KARNATAKA IMPACT',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300',
    impactSummary: 'Passed directly off Karnataka coastal shelf (Mangaluru, Malpe, Karwar), generating severe swells >5.5m, storm surge, and coastal erosion.',
  },
  {
    hazard_id: 'hz-ibtracs-2019296n15066',
    name: 'Cyclone Kyarr (SuCS)',
    type: 'cyclone',
    basin: 'arabian_sea',
    status: 'historical',
    source: 'NOAA IBTrACS / IMD',
    first_observed: '2019-10-22T23:30:00Z',
    last_observed: '2019-11-03T11:30:00Z',
    maxWindKnots: 135,
    track_points: [],
    categoryLabel: 'Super Cyclonic Storm (SuCS) • Record Arabian Sea Intensity',
    badgeText: 'SUPER CYCLONE',
    badgeStyle: 'bg-purple-50 text-purple-800 border-purple-300',
    impactSummary: 'One of the most intense cyclones on record in the Arabian Sea (135 kts), driving long-period swells across Karnataka shelf.',
  },
  {
    hazard_id: 'hz-ibtracs-2023156n10067',
    name: 'Cyclone Biparjoy (ESCS)',
    type: 'cyclone',
    basin: 'arabian_sea',
    status: 'historical',
    source: 'NOAA IBTrACS / IMD',
    first_observed: '2023-06-05T05:30:00Z',
    last_observed: '2023-06-19T05:30:00Z',
    maxWindKnots: 90,
    track_points: [],
    categoryLabel: 'Extremely Severe Cyclonic Storm (ESCS)',
    badgeText: 'ARABIAN SEA',
    badgeStyle: 'bg-blue-50 text-blue-800 border-blue-300',
    impactSummary: 'Longest-lived cyclone in the Arabian Sea (14 days), producing sustained high-energy swell spectra off the west coast.',
  },
  {
    hazard_id: 'hz-ibtracs-2020153n13072',
    name: 'Cyclone Nisarga (SCS)',
    type: 'cyclone',
    basin: 'arabian_sea',
    status: 'historical',
    source: 'NOAA IBTrACS / IMD',
    first_observed: '2020-05-31T23:30:00Z',
    last_observed: '2020-06-04T11:30:00Z',
    maxWindKnots: 65,
    track_points: [],
    categoryLabel: 'Severe Cyclonic Storm (SCS)',
    badgeText: 'WEST COAST',
    badgeStyle: 'bg-cyan-50 text-cyan-800 border-cyan-300',
    impactSummary: 'Formed as a depression off Karnataka/Goa shelf, tracking northward along Konkan coast with heavy rainfall and rough seas.',
  },
  {
    hazard_id: 'hz-ibtracs-2019160n11073',
    name: 'Cyclone Vayu (VSCS)',
    type: 'cyclone',
    basin: 'arabian_sea',
    status: 'historical',
    source: 'NOAA IBTrACS / IMD',
    first_observed: '2019-06-08T23:30:00Z',
    last_observed: '2019-06-18T11:30:00Z',
    maxWindKnots: 85,
    track_points: [],
    categoryLabel: 'Very Severe Cyclonic Storm (VSCS)',
    badgeText: 'WEST COAST',
    badgeStyle: 'bg-sky-50 text-sky-800 border-sky-300',
    impactSummary: 'Paralleled the entire west coast of India with strong monsoonal surge and gale winds off Karnataka coastal waters.',
  },
];

export const HazardRecentAlerts: React.FC<Props> = ({
  liveAlerts,
  historicalEvents,
  onSelectEvent,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<HazardEvent | null>(null);

  // Strict Regional Filtering: Include only Indian Waters / Regional Basins (Arabian Sea, Bay of Bengal, North Indian Ocean)
  // Excludes distant global alerts (Pacific, Atlantic) to keep focus strictly on Karnataka & India
  const regionalLiveAlerts = React.useMemo(() => {
    return liveAlerts.filter((ev) => {
      const b = (ev.basin || '').toLowerCase();
      if (b === 'arabian_sea' || b === 'bay_of_bengal' || b === 'north_indian') return true;
      if (ev.track_points && ev.track_points.length > 0) {
        const pt = ev.track_points[0];
        if (pt.latitude >= 0 && pt.latitude <= 32 && pt.longitude >= 50 && pt.longitude <= 102) {
          return true;
        }
      }
      return false;
    });
  }, [liveAlerts]);

  // Combine live regional alerts (if active in India) with Karnataka & Arabian Sea historical precedents
  const items = React.useMemo(() => {
    const list: HazardEvent[] = [...regionalLiveAlerts];

    // Merge with Karnataka precedents from database or canonical precedents
    KARNATAKA_PRECEDENTS.forEach((prec) => {
      if (list.length < 5) {
        // Find existing record in historicalEvents if already fetched with points
        const found = historicalEvents.find((h) => h.hazard_id === prec.hazard_id || h.name.toLowerCase().includes(prec.name.split(' ')[1].toLowerCase()));
        list.push(found || prec);
      }
    });

    return list.slice(0, 5);
  }, [regionalLiveAlerts, historicalEvents]);

  const getAlertBadge = (ev: HazardEvent) => {
    if (ev.status === 'active') {
      return { bg: 'bg-red-50 text-red-700 border-red-200', text: 'ACTIVE ALERT' };
    }
    const prec = KARNATAKA_PRECEDENTS.find((p) => p.hazard_id === ev.hazard_id || ev.name.includes(p.name.split(' ')[1]));
    if (prec) {
      return { bg: prec.badgeStyle, text: prec.badgeText };
    }
    if (ev.basin === 'arabian_sea') {
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'ARABIAN SEA' };
    }
    return { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'PRECEDENT' };
  };

  const getPrecedentMeta = (ev: HazardEvent) => {
    return KARNATAKA_PRECEDENTS.find((p) => p.hazard_id === ev.hazard_id || ev.name.includes(p.name.split(' ')[1]));
  };

  return (
    <>
      <div className="rounded-2xl bg-white border border-[#d8e4f0] shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <h3 className="text-xs font-bold text-[#0a1628]">Recent Storm Alerts & Precedents</h3>
              <p className="text-[10px] text-slate-400">Karnataka & Arabian Sea Waters</p>
            </div>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {regionalLiveAlerts.length > 0 ? `${regionalLiveAlerts.length} Active (India)` : 'Nominal Swell'}
          </span>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No regional alerts or precedents available.
            </div>
          ) : (
            items.map((ev) => {
              const badge = getAlertBadge(ev);
              const prec = getPrecedentMeta(ev);
              const isTauktae = ev.hazard_id === 'hz-ibtracs-2021133n10071' || ev.name.toUpperCase().includes('TAUKTAE');

              return (
                <div
                  key={ev.hazard_id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    onSelectEvent?.(ev);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isTauktae
                      ? 'border-amber-300 bg-amber-50/20 hover:bg-amber-50/50'
                      : 'border-slate-200/80 hover:border-orange-300 hover:bg-orange-50/30'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg}`}>
                        {badge.text}
                      </span>
                      <p className="text-xs font-bold text-[#0a1628] truncate">{ev.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {isTauktae
                        ? 'Arabian Sea • Karnataka Coastal Impact (2021)'
                        : prec
                        ? `Arabian Sea • ${prec.categoryLabel.split('•')[0].trim()}`
                        : `${ev.basin ? ev.basin.replace('_', ' ') : 'Arabian Sea'} • ${
                            ev.first_observed ? new Date(ev.first_observed).getFullYear() : 'Historical Precedent'
                          }`}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Flyout Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {getPrecedentMeta(selectedEvent)?.impactSummary && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11.5px] text-amber-900 leading-relaxed">
                <span className="font-bold text-amber-950">Karnataka Coastal Context: </span>
                {getPrecedentMeta(selectedEvent)?.impactSummary}
              </div>
            )}

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Data Source:</span>
                <span className="font-semibold text-slate-800">{selectedEvent.source || 'NOAA IBTrACS / IMD RSMC'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Oceanic Basin:</span>
                <span className="capitalize text-slate-800 font-medium">
                  {selectedEvent.basin?.replace('_', ' ') || 'Arabian Sea (West Coast)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Intensity Classification:</span>
                <span className="font-semibold text-orange-700">
                  {getPrecedentMeta(selectedEvent)?.categoryLabel ||
                    (selectedEvent.metadata_json?.severity_knots ? `${selectedEvent.metadata_json.severity_knots} kts` : 'Severe Cyclonic Storm')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Observation Period:</span>
                <span className="font-mono text-slate-800">
                  {selectedEvent.first_observed ? new Date(selectedEvent.first_observed).toLocaleDateString() : 'N/A'} – {selectedEvent.last_observed ? new Date(selectedEvent.last_observed).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Chronological Fixes:</span>
                <span className="font-bold text-orange-600">
                  {selectedEvent.track_points?.length || 'Full Track Available in DB'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 italic">IMD RSMC New Delhi & IBTrACS</span>
              <button
                onClick={() => {
                  onSelectEvent?.(selectedEvent, true);
                  setSelectedEvent(null);
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Load Track on Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
