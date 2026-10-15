import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EvidenceRecord } from '../../../types';

interface Props {
  evidence: EvidenceRecord[];
  loading: boolean;
}

export const PopulationChart: React.FC<Props> = ({ evidence, loading }) => {
  // Extract actual population data from evidence
  const populationData = useMemo(() => {
    const settlements = evidence.filter(
      e => e.data_type === 'coastal_feature' && e.raw_data?.feature_type === 'settlement' && e.raw_data?.estimated_population
    );

    if (settlements.length === 0) return [];

    // Sort by population for a meaningful bar-like area chart
    return settlements
      .map(e => ({
        name: e.raw_data!.name as string,
        population: e.raw_data!.estimated_population as number,
        year: e.raw_data!.census_year || 2011,
      }))
      .sort((a, b) => b.population - a.population);
  }, [evidence]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Population Exposure</h3>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  if (populationData.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Population Exposure</h3>
        <div className="h-48 flex items-center justify-center text-xs text-[#6b8fc0]">
          No population data available
        </div>
      </div>
    );
  }

  const totalPop = populationData.reduce((sum, d) => sum + d.population, 0);

  return (
    <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#0a1628]">Population Exposure</h3>
        <span className="text-lg font-bold text-[#2563eb]">{totalPop.toLocaleString()}</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={populationData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: '#6b8fc0' }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={50}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b8fc0' }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
              width={40}
            />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString(), 'Population']}
              labelStyle={{ color: '#0a1628', fontSize: 12 }}
              contentStyle={{
                fontSize: '11px',
                borderRadius: '8px',
                border: '1px solid #d8e4f0',
              }}
            />
            <Area
              type="monotone"
              dataKey="population"
              stroke="#3b82f6"
              fill="#dbeafe"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-[#93b1d6] mt-1 text-center">
        Source: Census of India 2011 • Administrative settlement boundaries
      </p>
    </div>
  );
};
