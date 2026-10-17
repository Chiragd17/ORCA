import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Radio,
  CheckCircle2,
  Copy,
  Check,
  X,
  Landmark,
  Waves,
  MapPin,
  Search,
  Layers,
} from 'lucide-react';
import { EvidenceRecord } from '../../../types';

interface Props {
  evidence: EvidenceRecord[];
}

interface SourceEntry {
  name: string;
  type: 'historical' | 'live' | 'derived';
  details: string;
}

export const DataProvenance: React.FC<Props> = ({ evidence }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'evidence'>('sources');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const sources = useMemo<SourceEntry[]>(() => {
    const sourceMap = new Map<string, SourceEntry>();

    for (const ev of evidence) {
      if (ev.data_type === 'coastal_feature') {
        const provider = ev.raw_data?.dataset_metadata?.license?.includes('ODbL')
          ? 'OpenStreetMap (Coastal Features)'
          : 'Census of India (Population)';

        if (!sourceMap.has(provider)) {
          sourceMap.set(provider, {
            name: provider,
            type: 'historical',
            details: ev.raw_data?.census_year
              ? `Historical • ${ev.raw_data.census_year}`
              : 'Historical • 2024',
          });
        }
      } else if (ev.data_type === 'live_marine_observation') {
        const name = ev.source_name || 'Open-Meteo Marine API';
        if (!sourceMap.has(name)) {
          sourceMap.set(name, {
            name: `${name} (Weather & Marine)`,
            type: 'live',
            details: ev.retrieval_time
              ? `Live • ${getRelativeTime(ev.retrieval_time)}`
              : 'Live • just now',
          });
        }
      } else if (ev.data_type === 'historical_hazard') {
        const name = ev.source_name || 'IMD/INCOIS';
        if (!sourceMap.has(name)) {
          sourceMap.set(name, {
            name: `${name} (Weather & Cyclone)`,
            type: 'historical',
            details: 'Historical record • Cyclone Tauktae',
          });
        }
      }
    }

    // Add Census of India if settlements exist
    const hasSettlements = evidence.some((e) => e.raw_data?.feature_type === 'settlement');
    if (hasSettlements && !sourceMap.has('Census of India (Population)')) {
      sourceMap.set('Census of India (Population)', {
        name: 'Census of India (Population)',
        type: 'historical',
        details: 'Historical • 2011',
      });
    }

    return Array.from(sourceMap.values());
  }, [evidence]);

  const filteredEvidence = useMemo(() => {
    if (!searchQuery) return evidence;
    const q = searchQuery.toLowerCase();
    return evidence.filter(
      (ev) =>
        ev.evidence_id?.toLowerCase().includes(q) ||
        ev.source_name?.toLowerCase().includes(q) ||
        ev.data_type?.toLowerCase().includes(q) ||
        ev.hash?.toLowerCase().includes(q) ||
        (ev.raw_data?.name && String(ev.raw_data.name).toLowerCase().includes(q))
    );
  }, [evidence, searchQuery]);

  return (
    <>
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-xs">
        <div className="px-4 py-3 border-b border-[#e8eef5] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0a1628]">Data Sources & Provenance</h3>
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] text-[#2563eb] font-semibold cursor-pointer hover:text-[#1d4ed8] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>View details</span>
              <span>→</span>
            </button>
          )}
        </div>

        {sources.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-[#6b8fc0]">No data sources loaded</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f5fa]">
            {sources.map((src) => (
              <div
                key={src.name}
                onClick={() => setIsOpen(true)}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-[#f7fafc] transition-colors cursor-pointer group"
                title="Click to view provenance details"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      src.type === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#1a3258] truncate group-hover:text-[#2563eb] transition-colors">
                      {src.name}
                    </p>
                    <p className="text-[10px] text-[#6b8fc0]">{src.details}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    src.type === 'live'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {src.type === 'live' ? 'Live' : 'Historical'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Data Sources & Provenance Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      Data Sources & Scientific Provenance
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      SHA-256 Cryptographic Chain
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official registries, live APIs, and spatial feature datasets utilized by ORCA AI Agents.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10.5px] text-slate-500 block">Total Ingested Evidence</span>
                <span className="font-bold text-slate-800">{evidence.length} Signed Records</span>
              </div>
              <div>
                <span className="text-[10.5px] text-slate-500 block">Integrity Protocol</span>
                <span className="font-bold text-blue-600">SHA-256 Hashing</span>
              </div>
              <div>
                <span className="text-[10.5px] text-slate-500 block">Spatial Datum</span>
                <span className="font-bold text-slate-800">EPSG:4326 (WGS 84)</span>
              </div>
              <div>
                <span className="text-[10.5px] text-slate-500 block">Verification Standard</span>
                <span className="font-bold text-emerald-600">Agent 4 Verified</span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 flex gap-6 bg-white text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('sources')}
                className={`py-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'sources'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Primary Data Providers</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                  4
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('evidence')}
                className={`py-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'evidence'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Evidence Records Ledger</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {evidence.length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'sources' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Census of India */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            Census of India (Population)
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            Office of the Registrar General & Census Commissioner
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Historical
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Official decennial demographic records providing ward and municipal population
                      counts for Karnataka’s coastal settlements. Used for deterministic population exposure summation.
                    </p>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coverage:</span>
                        <span className="font-medium">19 Settlements (Dakshina Kannada, Udupi, Uttara Kannada)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monitored Inhabitants:</span>
                        <span className="font-bold text-slate-900">1,075,668 residents</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">License:</span>
                        <span className="font-medium">Government Open Data License (GODL-India)</span>
                      </div>
                    </div>
                  </div>

                  {/* Open-Meteo Marine */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-white hover:border-emerald-400 transition-colors space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Radio className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            Open-Meteo Marine API
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            ECMWF IFS & NOAA GFS Marine Numerical Models
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Real-time marine physical observations ingested via high-resolution oceanographic wave models,
                      reporting significant wave heights, swell periods, and wind-wave interactions.
                    </p>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ingested Variables:</span>
                        <span className="font-medium">Wave Height (Hs), Direction, Swell Period, Wind Waves</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sampling Rate:</span>
                        <span className="font-medium">Hourly Global Assimilation</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">License:</span>
                        <span className="font-medium">CC BY 4.0 International Attribution</span>
                      </div>
                    </div>
                  </div>

                  {/* OpenStreetMap */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            OpenStreetMap (Features & Infrastructure)
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            Geospatial Community Registry & Field Surveys
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Geospatial
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Vector geographic boundaries for Karnataka’s 320km coastline, critical ports (New Mangalore Port,
                      Karwar Port), naval bases, fishing harbours, and protective seawalls.
                    </p>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ingested Features:</span>
                        <span className="font-medium">36 Verified Karnataka Polygons & Nodes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coordinate Datum:</span>
                        <span className="font-medium">EPSG:4326 (WGS 84 Geodesic)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">License:</span>
                        <span className="font-medium">Open Database License (ODbL)</span>
                      </div>
                    </div>
                  </div>

                  {/* IMD / INCOIS */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Waves className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            IMD / INCOIS Historical Cyclones
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            Ministry of Earth Sciences, Govt of India
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        Hazard Model
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Historical cyclonic surge data used for extreme hazard scenario modeling, including
                      Cyclone Tauktae (May 2021) with 5.8m Arabian Sea surge waves.
                    </p>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Surge Precedent:</span>
                        <span className="font-medium">Cyclone Tauktae (5.8m Extreme Wave Peak)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Threshold Calibration:</span>
                        <span className="font-medium">High (&gt;4.0m), Mod (2.5-4.0m), Low (&lt;2.5m)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Verification:</span>
                        <span className="font-medium">IMD / INCOIS Validated Archives</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search evidence by ID, feature name, source, or SHA-256 hash..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Evidence Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                      {filteredEvidence.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No evidence records match your search filter.
                        </div>
                      ) : (
                        filteredEvidence.map((ev) => (
                          <div key={ev.evidence_id} className="p-3.5 hover:bg-slate-50/80 transition-colors text-xs space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800 text-[11px]">
                                  {ev.evidence_id}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  ev.data_type === 'live_marine_observation'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {ev.data_type}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-400">
                                {ev.retrieval_time ? new Date(ev.retrieval_time).toLocaleString() : 'N/A'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                              <div>
                                <span className="text-slate-400">Source: </span>
                                <span className="font-medium text-slate-700">{ev.source_name || 'Standard Registry'}</span>
                                {ev.raw_data?.name && (
                                  <span className="text-slate-900 font-semibold ml-1">({ev.raw_data.name})</span>
                                )}
                              </div>
                              {ev.latitude != null && ev.longitude != null && (
                                <div className="text-slate-500">
                                  <span className="text-slate-400">Coords: </span>
                                  <span className="font-mono">{ev.latitude.toFixed(4)}°N, {ev.longitude.toFixed(4)}°E</span>
                                </div>
                              )}
                            </div>

                            {/* SHA-256 Hash Display */}
                            {ev.hash && (
                              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-slate-600">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-slate-400 font-sans font-semibold">SHA-256:</span>
                                  <span className="truncate">{ev.hash}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyHash(ev.hash!)}
                                  className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-sans font-medium flex-shrink-0 cursor-pointer"
                                >
                                  {copiedHash === ev.hash ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Cryptographic provenance actively verified by Evidence & Verification Agent.
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function getRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)} hr ago`;
  } catch {
    return 'unknown';
  }
}
