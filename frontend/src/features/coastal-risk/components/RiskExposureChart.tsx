import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RiskSummary } from '../../../types';

interface Props {
  summary: RiskSummary | null;
  loading: boolean;
}

const COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981'];

export const RiskExposureChart: React.FC<Props> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Risk Exposure by Feature Type</h3>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  if (!summary || summary.totalFeatures === 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Risk Exposure by Feature Type</h3>
        <div className="h-48 flex items-center justify-center text-xs text-[#6b8fc0]">
          No exposure data available
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Settlements', value: summary.affectedSettlements, pct: Math.round((summary.affectedSettlements / summary.totalFeatures) * 100) },
    { name: 'Ports', value: summary.portFacilities, pct: Math.round((summary.portFacilities / summary.totalFeatures) * 100) },
    { name: 'Healthcare', value: summary.healthcareFacilities, pct: Math.round((summary.healthcareFacilities / summary.totalFeatures) * 100) },
    { name: 'Protected Areas', value: summary.protectedAreas, pct: Math.round((summary.protectedAreas / summary.totalFeatures) * 100) },
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <h3 className="text-sm font-semibold text-[#0a1628] mb-2">Risk Exposure by Feature Type</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="40%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              label={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} features`, name]}
              contentStyle={{
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #d8e4f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Custom legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] mt-1">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            <span className="text-[#3a5070]">{item.name}</span>
            <span className="text-[#6b8fc0]">{item.value} ({item.pct}%)</span>
          </div>
        ))}
      </div>
      <div className="text-center mt-1">
        <span className="text-[10px] text-[#93b1d6]">Total Features: {summary.totalFeatures}</span>
      </div>
    </div>
  );
};
