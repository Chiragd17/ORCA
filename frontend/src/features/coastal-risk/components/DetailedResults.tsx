import React, { useState, useMemo } from 'react';
import { ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { Finding, EvidenceRecord, CoastalFinding } from '../../../types';

interface Props {
  findings: Finding[];
  evidence: EvidenceRecord[];
  coastalFindings: CoastalFinding[];
  limitations: string[];
  loading: boolean;
}

type TabId = 'features' | 'evidence' | 'methodology' | 'limitations';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  intersecting: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Intersecting' },
  near_risk: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Near Risk' },
  safe: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Safe' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Unknown' },
};

export const DetailedResults: React.FC<Props> = ({
  findings: _findings, evidence, coastalFindings, limitations, loading,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('features');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'features', label: 'Coastal Features', count: coastalFindings.length },
    { id: 'evidence', label: 'Evidence', count: evidence.length },
    { id: 'methodology', label: 'Methodology' },
    { id: 'limitations', label: 'Limitations' },
  ];

  const filteredFeatures = useMemo(() => {
    let result = [...coastalFindings];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortField === 'population') cmp = (a.population || 0) - (b.population || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [coastalFindings, searchQuery, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-4">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Detailed Analysis Results</h3>
        <div className="skeleton h-6 w-64 mb-3" />
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e8eef5]">
        <h3 className="text-sm font-semibold text-[#0a1628]">Detailed Analysis Results</h3>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-[#e8eef5] flex gap-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#6b8fc0] hover:text-[#1a3258]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#f0f5fa] text-[#4a6fa5]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'features' && (
          <div>
            {/* Search */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-[#f7fafc] border border-[#d8e4f0] rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-[#93b1d6]" />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-[#0a1628] placeholder-[#93b1d6] focus:outline-none"
                />
              </div>
            </div>

            {filteredFeatures.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6b8fc0]">
                {coastalFindings.length === 0
                  ? 'No coastal features analyzed yet. Run an analysis first.'
                  : 'No features match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#e8eef5]">
                      <th className="text-left py-2 px-2 text-[#4a6fa5] font-semibold cursor-pointer hover:text-[#1a3258]"
                          onClick={() => toggleSort('name')}>
                        <span className="flex items-center gap-1">Feature Name <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left py-2 px-2 text-[#4a6fa5] font-semibold cursor-pointer hover:text-[#1a3258]"
                          onClick={() => toggleSort('type')}>
                        <span className="flex items-center gap-1">Type <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left py-2 px-2 text-[#4a6fa5] font-semibold">Status</th>
                      <th className="text-right py-2 px-2 text-[#4a6fa5] font-semibold cursor-pointer hover:text-[#1a3258]"
                          onClick={() => toggleSort('population')}>
                        <span className="flex items-center gap-1 justify-end">Population / Impact <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left py-2 px-2 text-[#4a6fa5] font-semibold">Evidence ID</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeatures.map((feat, i) => {
                      const statusStyle = STATUS_STYLES[feat.status] || STATUS_STYLES.unknown;
                      return (
                        <tr key={i} className="border-b border-[#f0f5fa] hover:bg-[#f7fafc] cursor-pointer transition-colors">
                          <td className="py-2.5 px-2 font-medium text-[#1a3258]">{feat.name}</td>
                          <td className="py-2.5 px-2 text-[#4a6fa5] capitalize">{feat.type.replace('_', ' ')}</td>
                          <td className="py-2.5 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-[#1a3258] font-medium">
                            {feat.population ? feat.population.toLocaleString() : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-[#6b8fc0] font-mono text-[10px]">{feat.evidenceId || '—'}</td>
                          <td className="py-2.5 px-2">
                            <ChevronRight className="w-3.5 h-3.5 text-[#93b1d6]" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-2">
            {evidence.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6b8fc0]">No evidence records collected yet.</div>
            ) : (
              evidence.map((ev) => (
                <div key={ev.evidence_id} className="p-3 rounded-lg bg-[#f7fafc] border border-[#e8eef5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#2563eb] font-medium">{ev.evidence_id}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      ev.data_type === 'live_marine_observation'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {ev.data_type === 'live_marine_observation' ? 'Live' : ev.data_type === 'coastal_feature' ? 'Reference' : 'Historical'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#3a5070] mt-1">{ev.source_name}</p>
                  {ev.observation_time && (
                    <p className="text-[10px] text-[#93b1d6] mt-0.5">
                      Observation: {new Date(ev.observation_time).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-[10px] text-[#93b1d6]">
                    Retrieved: {new Date(ev.retrieval_time).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'methodology' && (
          <div className="space-y-3 text-xs text-[#3a5070] leading-relaxed">
            <div>
              <h4 className="font-semibold text-[#0a1628] mb-1">Spatial Analysis</h4>
              <p>Features are screened against the hazard footprint using deterministic geodesic distance calculations (Haversine formula, WGS84 EPSG:4326). Features within the specified impact radius are classified as "intersecting."</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#0a1628] mb-1">Population Exposure</h4>
              <p>Population estimates are summed from Census of India 2011 official municipal/settlement headcounts. No extrapolation, interpolation, or current-year projection is applied. Values represent administrative population within settlement bounds, not confirmed flood-exposed individuals.</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#0a1628] mb-1">Evidence Architecture</h4>
              <p>Every finding is linked to one or more evidence records with traceable source identifiers, retrieval timestamps, and SHA-256 payload checksums. Evidence records may be independently verified against the original data provider.</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#0a1628] mb-1">Live Marine Data</h4>
              <p>Current ocean conditions are fetched from the Open-Meteo Marine API, providing significant wave height, swell height, wave period, and wind wave measurements. These are open-water observations and exclude shallow-water bathymetric effects and coastal wave breaking.</p>
            </div>
          </div>
        )}

        {activeTab === 'limitations' && (
          <div className="space-y-2">
            {limitations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6b8fc0]">No limitations documented for this analysis.</div>
            ) : (
              limitations.map((lim, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/50">
                  <span className="text-amber-500 text-xs mt-0.5">⚠</span>
                  <p className="text-[11px] text-[#3a5070] leading-snug">{lim}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
