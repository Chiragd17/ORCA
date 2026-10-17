import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EvidenceRecord } from '../../../types';
import { Users, BarChart3, Layers, ListOrdered } from 'lucide-react';

interface Props {
  evidence: EvidenceRecord[];
  loading: boolean;
}

const BAR_COLORS = [
  '#1d4ed8', // Dark blue
  '#2563eb', // Primary blue
  '#3b82f6', // Bright blue
  '#60a5fa', // Light blue
  '#0284c7', // Sky blue
  '#0ea5e9', // Light sky
  '#94a3b8', // Slate for 'Others'
];

function cleanSettlementName(fullName: string): string {
  return fullName
    .replace(/\s*(City Corporation|City Municipal Corporation|City Municipality|Town Municipality|Coastal Municipality|Coastal Settlement|Coastal Town|Coastal Village|Coastal Spit|Coastal Node|Coastal Heritage Town|\(Kapu\)|\(Byndoor\)|-Barkur)\s*/gi, '')
    .trim();
}

function getDistrict(lat: number): string {
  if (lat >= 13.95) return 'Uttara Kannada';
  if (lat >= 13.12) return 'Udupi';
  return 'Dakshina Kannada';
}

export const PopulationChart: React.FC<Props> = ({ evidence, loading }) => {
  const [activeTab, setActiveTab] = useState<'top' | 'district' | 'all'>('top');

  // Extract all settlement features with populations
  const settlements = useMemo(() => {
    return evidence
      .filter(e => e.data_type === 'coastal_feature' && e.raw_data?.feature_type === 'settlement' && e.raw_data?.estimated_population)
      .map(e => {
        const raw = e.raw_data!;
        const lat = raw.latitude || e.latitude || 13.0;
        return {
          id: raw.id || e.evidence_id,
          fullName: raw.name as string,
          shortName: cleanSettlementName(raw.name as string),
          population: Number(raw.estimated_population),
          district: getDistrict(lat),
          year: raw.census_year || 2011,
        };
      })
      .sort((a, b) => b.population - a.population);
  }, [evidence]);

  const totalPop = useMemo(() => {
    return settlements.reduce((sum, s) => sum + s.population, 0);
  }, [settlements]);

  // Top 6 settlements + grouped 'Others' for horizontal bar chart
  const topChartData = useMemo(() => {
    if (settlements.length <= 6) {
      return settlements.map(s => ({
        name: s.shortName,
        fullName: s.fullName,
        population: s.population,
        district: s.district,
      }));
    }

    const top5 = settlements.slice(0, 5).map(s => ({
      name: s.shortName,
      fullName: s.fullName,
      population: s.population,
      district: s.district,
    }));

    const othersTotal = settlements.slice(5).reduce((sum, s) => sum + s.population, 0);
    const othersCount = settlements.length - 5;

    return [
      ...top5,
      {
        name: `+${othersCount} Others`,
        fullName: `${othersCount} other coastal settlements combined`,
        population: othersTotal,
        district: 'Regional Coast',
      },
    ];
  }, [settlements]);

  // Group by coastal district
  const districtData = useMemo(() => {
    const map: Record<string, number> = {
      'Dakshina Kannada': 0,
      'Udupi': 0,
      'Uttara Kannada': 0,
    };

    for (const s of settlements) {
      if (map[s.district] !== undefined) {
        map[s.district] += s.population;
      } else {
        map[s.district] = (map[s.district] || 0) + s.population;
      }
    }

    return Object.entries(map)
      .map(([district, pop]) => ({
        district,
        population: pop,
        percentage: totalPop > 0 ? ((pop / totalPop) * 100).toFixed(1) : '0',
      }))
      .filter(d => d.population > 0)
      .sort((a, b) => b.population - a.population);
  }, [settlements, totalPop]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#0a1628]">Population Exposure</h3>
          <div className="w-20 h-5 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="h-52 bg-slate-50 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Population Exposure</h3>
        <div className="h-52 flex flex-col items-center justify-center text-xs text-[#6b8fc0] space-y-1">
          <Users className="w-6 h-6 text-slate-300 mb-1" />
          <p>No settlement population data in active buffer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm flex flex-col justify-between">
      {/* Header with Title and Total Count */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563eb]" />
            <h3 className="text-sm font-semibold text-[#0a1628]">Population Exposure</h3>
          </div>
          <span className="text-base font-bold text-[#2563eb] tracking-tight">
            {totalPop.toLocaleString()}
          </span>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 mb-3 bg-[#f1f5f9] p-0.5 rounded-lg text-[11px] font-medium text-[#475569]">
          <button
            type="button"
            onClick={() => setActiveTab('top')}
            className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'top' ? 'bg-white text-[#0f172a] shadow-xs font-semibold' : 'hover:text-[#0f172a]'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Top Hubs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('district')}
            className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'district' ? 'bg-white text-[#0f172a] shadow-xs font-semibold' : 'hover:text-[#0f172a]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>By District</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-[#0f172a] shadow-xs font-semibold' : 'hover:text-[#0f172a]'
            }`}
          >
            <ListOrdered className="w-3 h-3" />
            <span>All ({settlements.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Top Hubs Horizontal Bar Chart */}
      {activeTab === 'top' && (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topChartData}
              layout="vertical"
              margin={{ top: 2, right: 35, left: 10, bottom: 2 }}
            >
              <XAxis
                type="number"
                tickFormatter={(val: number) => val >= 1000 ? `${Math.round(val / 1000)}k` : val.toString()}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={74}
                tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#d8e4f0] p-2 rounded-lg shadow-md text-xs">
                        <p className="font-semibold text-[#0a1628]">{data.fullName}</p>
                        <p className="text-[#64748b] text-[10px] mb-1">{data.district}</p>
                        <p className="text-[#2563eb] font-bold text-sm">
                          {data.population.toLocaleString()} <span className="text-xs font-normal text-slate-500">residents</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="population" radius={[0, 4, 4, 0]} barSize={16}>
                {topChartData.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab 2: District Breakdown */}
      {activeTab === 'district' && (
        <div className="h-44 flex flex-col justify-center space-y-3 px-1">
          {districtData.map((d, idx) => (
            <div key={d.district} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0a1628]">{d.district}</span>
                <span className="text-[#475569] font-medium">
                  {d.population.toLocaleString()} <span className="text-slate-400">({d.percentage}%)</span>
                </span>
              </div>
              <div className="w-full bg-[#f1f5f9] rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${d.percentage}%`,
                    backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: All Settlements Scrollable List */}
      {activeTab === 'all' && (
        <div className="h-44 overflow-y-auto space-y-1.5 pr-1 text-xs">
          {settlements.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#f8fafc] border border-transparent hover:border-[#e2e8f0] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 w-4 text-right flex-shrink-0">
                  #{idx + 1}
                </span>
                <div className="min-w-0 truncate">
                  <p className="font-medium text-[#0f172a] truncate">{s.shortName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.district}</p>
                </div>
              </div>
              <span className="font-semibold text-[#2563eb] flex-shrink-0 ml-2">
                {s.population.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footnote */}
      <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10px] text-[#93b1d6]">
        <span>Census of India 2011</span>
        <span>{settlements.length} coastal settlements in buffer</span>
      </div>
    </div>
  );
};
