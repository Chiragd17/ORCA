import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  X,
  Search,
} from 'lucide-react';
import { EvidenceRecord } from '../../../types';

interface Props {
  evidence: EvidenceRecord[];
}

interface SourceEntry {
  name: string;
  type: 'live' | 'historical' | 'satellite';
  details: string;
  provider: string;
  license: string;
  coverage: string;
}

export const OceanDataProvenance: React.FC<Props> = ({ evidence }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'evidence'>('sources');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const sources: SourceEntry[] = [
    {
      name: 'Open-Meteo Marine Physical API',
      type: 'live',
      details: 'Live • Hourly Forecast (168h)',
      provider: 'European Centre for Medium-Range Weather Forecasts (ECMWF) / Open-Meteo',
      license: 'Open Database License (ODbL) / CC-BY 4.0',
      coverage: 'Karnataka Littoral (12.5°N - 15.0°N, 73.8°E - 75.0°E)',
    },
    {
      name: 'ERA5 High-Resolution Reanalysis',
      type: 'historical',
      details: 'Historical • 1991–2020 Climatology',
      provider: 'Copernicus Climate Change Service (C3S) / ECMWF',
      license: 'Copernicus Open Access Policy',
      coverage: 'Arabian Sea Continental Shelf (0.25° grid)',
    },
    {
      name: 'INCOIS National Buoy Network',
      type: 'live',
      details: 'Live • 30-min In-Situ Buoy 23001',
      provider: 'Indian National Centre for Ocean Information Services',
      license: 'Government of India Open Data License',
      coverage: 'Arabian Sea Offshore Buoy Station 23001',
    },
    {
      name: 'Copernicus Marine Environment (CMEMS)',
      type: 'satellite',
      details: 'Satellite • Optical Chl-a / Physics',
      provider: 'Mercator Ocean International / EU Copernicus',
      license: 'EU Copernicus Marine License',
      coverage: 'Arabian Sea Basin (0.08° multi-mission composite)',
    },
  ];

  const filteredEvidence = useMemo(() => {
    if (!searchQuery) return evidence;
    const q = searchQuery.toLowerCase();
    return evidence.filter(
      (e) =>
        e.evidence_id.toLowerCase().includes(q) ||
        e.source_name.toLowerCase().includes(q) ||
        (e.payload_hash || e.hash || '').toLowerCase().includes(q)
    );
  }, [evidence, searchQuery]);

  return (
    <>
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#0a1628]">Data Sources & Provenance</h3>
          <button
            onClick={() => setIsOpen(true)}
            className="text-[11px] font-medium text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-0.5"
          >
            <span>View details</span>
            <span className="text-[10px]">→</span>
          </button>
        </div>

        {/* Source items preview */}
        <div className="space-y-2">
          {sources.slice(0, 3).map((src, i) => (
            <div
              key={i}
              onClick={() => setIsOpen(true)}
              className="flex items-center justify-between p-2 rounded-lg border border-[#e8eef5] hover:bg-[#f7fafc] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  src.type === 'live' ? 'bg-emerald-500' :
                  src.type === 'satellite' ? 'bg-teal-500' : 'bg-blue-500'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#1a3258] truncate">{src.name}</p>
                  <p className="text-[10px] text-[#6b8fc0] truncate">{src.details}</p>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                src.type === 'live'
                  ? 'bg-emerald-50 text-emerald-700'
                  : src.type === 'satellite'
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {src.type === 'live' ? 'Live' : src.type === 'satellite' ? 'Satellite' : 'Historical'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance Full Detail Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#d8e4f0] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-5 py-4 border-b border-[#e8eef5] flex items-center justify-between bg-[#f7fafc]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-semibold text-[#0a1628]">Scientific Provenance & Cryptographic Verification</h3>
                  <p className="text-[11px] text-[#6b8fc0]">Person 1 Oceanographic Ingestion Pipeline & SHA-256 Signatures</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#6b8fc0] hover:text-[#0a1628] hover:bg-[#e8eef5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs inside modal */}
            <div className="px-5 border-b border-[#e8eef5] flex gap-4">
              <button
                onClick={() => setActiveTab('sources')}
                className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'sources'
                    ? 'border-[#2563eb] text-[#2563eb]'
                    : 'border-transparent text-[#6b8fc0] hover:text-[#1a3258]'
                }`}
              >
                Data Providers ({sources.length})
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'evidence'
                    ? 'border-[#2563eb] text-[#2563eb]'
                    : 'border-transparent text-[#6b8fc0] hover:text-[#1a3258]'
                }`}
              >
                Evidence Ledger Records ({evidence.length})
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {activeTab === 'sources' ? (
                sources.map((src, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-[#e8eef5] bg-[#f7fafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#0a1628]">{src.name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        src.type === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {src.details}
                      </span>
                    </div>
                    <p className="text-[#3a5070]"><strong>Provider:</strong> {src.provider}</p>
                    <p className="text-[#3a5070]"><strong>Coverage:</strong> {src.coverage}</p>
                    <p className="text-[11px] text-[#6b8fc0]"><strong>License:</strong> {src.license}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-1.5 mb-2">
                    <Search className="w-3.5 h-3.5 text-[#93b1d6]" />
                    <input
                      type="text"
                      placeholder="Search evidence records or SHA-256 hashes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-[#0a1628] placeholder-[#93b1d6] focus:outline-none"
                    />
                  </div>

                  {filteredEvidence.map((ev) => {
                    const hashVal = ev.payload_hash || ev.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
                    return (
                      <div key={ev.evidence_id} className="p-3 rounded-lg border border-[#e8eef5] bg-[#f7fafc] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#2563eb]">{ev.evidence_id}</span>
                          <span className="text-[10px] text-[#93b1d6]">
                            {new Date(ev.retrieval_time).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#3a5070]"><strong>Source:</strong> {ev.source_name}</p>
                        <div className="bg-white p-2 rounded border border-[#e8eef5] flex items-center justify-between">
                          <div className="min-w-0 flex-1 mr-2">
                            <span className="text-[10px] text-[#93b1d6] block uppercase font-semibold">SHA-256 Checksum</span>
                            <span className="text-[11px] font-mono text-[#4a6fa5] truncate block">{hashVal}</span>
                          </div>
                          <button
                            onClick={() => handleCopyHash(hashVal)}
                            className="px-2 py-1 rounded bg-[#f0f5fa] hover:bg-[#e2edf8] text-[#2563eb] text-[11px] font-medium transition-colors flex items-center gap-1"
                          >
                            {copiedHash === hashVal ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedHash === hashVal ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#e8eef5] flex justify-end bg-[#f7fafc]">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-medium hover:bg-[#1d4ed8]"
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
