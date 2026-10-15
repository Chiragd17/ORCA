import React, { useMemo } from 'react';
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
        const name = ev.source_name || 'Open-Meteo Marine';
        if (!sourceMap.has(name)) {
          sourceMap.set(name, {
            name: `${name} (Weather & Marine)`,
            type: 'live',
            details: ev.retrieval_time
              ? `Live • ${getRelativeTime(ev.retrieval_time)}`
              : 'Live',
          });
        }
      } else if (ev.data_type === 'historical_hazard') {
        const name = ev.source_name || 'IMD/INCOIS';
        if (!sourceMap.has(name)) {
          sourceMap.set(name, {
            name: `${name} (Weather & Cyclone)`,
            type: 'historical',
            details: `Historical record`,
          });
        }
      }
    }

    // Add Census of India if settlements exist
    const hasSettlements = evidence.some(e => e.raw_data?.feature_type === 'settlement');
    if (hasSettlements && !sourceMap.has('Census of India (Population)')) {
      sourceMap.set('Census of India (Population)', {
        name: 'Census of India (Population)',
        type: 'historical',
        details: 'Historical • 2011',
      });
    }

    return Array.from(sourceMap.values());
  }, [evidence]);

  return (
    <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <div className="px-4 py-3 border-b border-[#e8eef5] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0a1628]">Data Sources & Provenance</h3>
        {sources.length > 0 && (
          <span className="text-[11px] text-[#2563eb] font-medium cursor-pointer hover:underline">
            View details →
          </span>
        )}
      </div>

      {sources.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-[#6b8fc0]">No data sources loaded</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f0f5fa]">
          {sources.map((src) => (
            <div key={src.name} className="px-4 py-2.5 flex items-center justify-between hover:bg-[#f7fafc] transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  src.type === 'live' ? 'bg-emerald-500' : 'bg-blue-400'
                }`} />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#1a3258] truncate">{src.name}</p>
                  <p className="text-[10px] text-[#6b8fc0]">{src.details}</p>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                src.type === 'live'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {src.type === 'live' ? 'Live' : 'Historical'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
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
