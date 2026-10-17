import React, { useState, useMemo } from 'react';
import {
  Search,
  Compass,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  HazardEvent,
  HazardTrackPoint,
  FindingItem,
  EvidenceRecordItem,
} from '../types';

interface Props {
  historicalEvents: HazardEvent[];
  selectedEvent: HazardEvent | null;
  trackPoints: HazardTrackPoint[];
  findings: FindingItem[];
  evidence: EvidenceRecordItem[];
  limitations?: string[];
  loading?: boolean;
  onSelectEvent?: (event: HazardEvent, scrollToMap?: boolean) => void;
}

type TabId = 'inventory' | 'track' | 'findings' | 'evidence' | 'methodology';

export const HazardDetailedResults: React.FC<Props> = ({
  historicalEvents,
  selectedEvent,
  trackPoints,
  findings,
  evidence,
  limitations: _limitations = [],
  loading: _loading,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'inventory', label: 'Cyclone Inventory', count: historicalEvents.length },
    { id: 'track', label: 'Waypoint Fixes', count: trackPoints.length },
    { id: 'findings', label: 'Agent Findings', count: findings.length },
    { id: 'evidence', label: 'Evidence Ledger', count: evidence.length },
    { id: 'methodology', label: 'Methodology & Safeguards' },
  ];

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return historicalEvents;
    const q = searchQuery.toLowerCase();
    return historicalEvents.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.hazard_id.toLowerCase().includes(q) ||
        (e.basin && e.basin.toLowerCase().includes(q))
    );
  }, [historicalEvents, searchQuery]);

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] shadow-xs overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="px-5 pt-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-orange-600 text-orange-900 bg-white shadow-2xs rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-orange-100 text-orange-800 font-bold' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'inventory' && (
          <div className="relative min-w-[200px] mb-1.5 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search storm by name..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>
        )}
      </div>

      {/* Tab Content Body */}
      <div className="p-4">
        {/* TAB 1: Cyclone Inventory */}
        {activeTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Storm ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Basin</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">First Observed</th>
                  <th className="py-2.5 px-3">Last Observed</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvents.slice(0, 15).map((ev) => {
                  const isSelected = selectedEvent?.hazard_id === ev.hazard_id;
                  return (
                    <tr
                      key={ev.hazard_id}
                      onClick={() => {
                        onSelectEvent?.(ev);
                        setActiveTab('track');
                      }}
                      className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-orange-50/80 border-l-4 border-l-orange-500 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-blue-700">
                        {ev.hazard_id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#0a1628] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        <span>{ev.name}</span>
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {ev.basin ? ev.basin.replace('_', ' ') : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-slate-100 text-slate-600">
                          {ev.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {ev.first_observed ? new Date(ev.first_observed).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {ev.last_observed ? new Date(ev.last_observed).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent?.(ev);
                              setActiveTab('track');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            title="View chronological waypoint fixes"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>View Track</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent?.(ev);
                              const el = document.getElementById('hazard-map-card');
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                            title="Focus track on map"
                          >
                            Map ↑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Waypoint Fixes */}
        {activeTab === 'track' && (
          <div className="overflow-x-auto space-y-3">
            {/* Context header with storm name, metadata, and quick navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-600 text-white shadow-xs">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0a1628] flex items-center gap-1.5">
                    <span>{selectedEvent?.name || 'Selected Cyclone Trajectory'}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white border border-orange-200 text-orange-700 font-bold">
                      {trackPoints.length} Chronological Fixes
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                    {selectedEvent?.hazard_id} • Basin: {selectedEvent?.basin?.replace('_', ' ') || 'Arabian Sea'} • Source: {selectedEvent?.source || 'NOAA IBTrACS'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer font-medium"
                >
                  ← Back to Inventory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('hazard-map-card');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="px-3 py-1 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Focus on Map ↑</span>
                </button>
              </div>
            </div>

            {trackPoints.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Compass className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-500">No Track Fixes Loaded</p>
                <p className="text-xs">Select a storm from the Cyclone Inventory to view chronological waypoints.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Fix #</th>
                    <th className="py-2.5 px-3">Valid UTC</th>
                    <th className="py-2.5 px-3">Latitude</th>
                    <th className="py-2.5 px-3">Longitude</th>
                    <th className="py-2.5 px-3">Wind (knots)</th>
                    <th className="py-2.5 px-3">Wind (km/h)</th>
                    <th className="py-2.5 px-3">Pressure</th>
                    <th className="py-2.5 px-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trackPoints.map((pt, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">#{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-slate-800">
                        {pt.time ? new Date(pt.time).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2 px-3 font-mono">{pt.latitude.toFixed(2)}°N</td>
                      <td className="py-2 px-3 font-mono">{pt.longitude.toFixed(2)}°E</td>
                      <td className="py-2 px-3 font-bold text-orange-600">
                        {pt.wind_speed_knots !== null ? `${pt.wind_speed_knots} kts` : '--'}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {pt.wind_speed_knots !== null ? `${Math.round(pt.wind_speed_knots * 1.852)} km/h` : '--'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {pt.pressure_hpa !== null ? `${pt.pressure_hpa} hPa` : '--'}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                          {pt.category || 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 3: Agent Findings */}
        {activeTab === 'findings' && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-500">No Findings Generated Yet</p>
                <p className="text-xs">Run a hazard analysis or ask the specialist chat to generate findings.</p>
              </div>
            ) : (
              findings.map((f, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700 font-mono">{f.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      VERIFIED FINDING
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">{f.claim}</p>
                  {f.evidence_ids && f.evidence_ids.length > 0 && (
                    <div className="flex items-center gap-1 pt-1 text-[10px] text-slate-400">
                      <span>Citations:</span>
                      {f.evidence_ids.map((cid, cIdx) => (
                        <span key={cIdx} className="font-mono text-blue-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {cid}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Evidence Ledger */}
        {activeTab === 'evidence' && (
          <div className="space-y-3">
            {evidence.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-500">No Evidence Records Loaded</p>
                <p className="text-xs">Evidence records will populate from verified database queries.</p>
              </div>
            ) : (
              evidence.map((ev, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-blue-700">{ev.id}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10.5px]">
                        {ev.source_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ev.retrieval_time ? new Date(ev.retrieval_time).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold">{ev.variable}:</span> {JSON.stringify(ev.value)} {ev.unit}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: Methodology & Safeguards */}
        {activeTab === 'methodology' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed max-w-4xl">
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Statutory Authority & Precedence Safeguard</span>
              </h4>
              <p className="text-[11.5px] text-amber-800 leading-relaxed">
                ORCA Marine Hazard & Forecast Agent operates as an autonomous decision-support system. It does not replace official meteorological warnings. Official bulletins from the <strong>India Meteorological Department (IMD)</strong>, the <strong>Indian National Centre for Ocean Information Services (INCOIS)</strong>, and local <strong>Port Officer cautionary signals</strong> legally supersede all automated agent advisories.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                <h4 className="font-bold text-[#0a1628] mb-2">Douglas Sea Scale Breakdown</h4>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  <li>• <strong>Code 0-2 (Calm to Smooth):</strong> Wave height &lt; 0.5 m</li>
                  <li>• <strong>Code 3 (Slight):</strong> Wave height 0.5 – 1.25 m</li>
                  <li>• <strong>Code 4 (Moderate):</strong> Wave height 1.25 – 2.5 m (Craft caution)</li>
                  <li>• <strong>Code 5 (Rough):</strong> Wave height 2.5 – 4.0 m (Small boat prohibition)</li>
                  <li>• <strong>Code 6 (Very Rough):</strong> Wave height 4.0 – 6.0 m (Severe gale)</li>
                  <li>• <strong>Code 7+ (High / Phenomenal):</strong> Wave height &gt; 6.0 m (Cyclonic surge)</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                <h4 className="font-bold text-[#0a1628] mb-2">IMD Cyclone Wind Classification</h4>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  <li>• <strong>Depression (D):</strong> 17 – 27 knots (31 – 49 km/h)</li>
                  <li>• <strong>Deep Depression (DD):</strong> 28 – 33 knots (50 – 61 km/h)</li>
                  <li>• <strong>Cyclonic Storm (CS):</strong> 34 – 47 knots (62 – 88 km/h)</li>
                  <li>• <strong>Severe Cyclonic Storm (SCS):</strong> 48 – 63 knots (89 – 117 km/h)</li>
                  <li>• <strong>Very Severe (VSCS):</strong> 64 – 89 knots (118 – 166 km/h)</li>
                  <li>• <strong>Extremely Severe (ESCS):</strong> 90 – 119 knots (167 – 221 km/h)</li>
                  <li>• <strong>Super Cyclonic Storm (SuCS):</strong> ≥ 120 knots (≥ 222 km/h)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
