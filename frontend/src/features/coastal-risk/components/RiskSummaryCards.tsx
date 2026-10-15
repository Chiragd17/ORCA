import React from 'react';
import { Users, Anchor, Trees } from 'lucide-react';
import { RiskSummary } from '../../../types';

interface Props {
  summary: RiskSummary | null;
  loading: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sublabel?: string;
  color: string;
  loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, sublabel, color, loading }) => (
  <div className="p-3 rounded-xl bg-white border border-[#d8e4f0] shadow-sm flex items-center gap-3">
    <div className={`p-2 rounded-lg ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      {loading ? (
        <div className="skeleton h-6 w-12 mb-1" />
      ) : (
        <p className="text-xl font-bold text-[#0a1628] leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      <p className="text-[11px] text-[#4a6fa5] font-medium leading-tight">{label}</p>
      {sublabel && (
        <p className="text-[10px] text-[#93b1d6] italic">{sublabel}</p>
      )}
    </div>
  </div>
);

export const RiskSummaryCards: React.FC<Props> = ({ summary, loading }) => {
  if (!summary && !loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] text-center">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-1">Key Risk Summary</h3>
        <p className="text-xs text-[#6b8fc0]">Run an analysis to see risk metrics</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#0a1628] mb-2">Key Risk Summary</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Users className="w-4 h-4 text-red-500" />}
          value={summary?.affectedSettlements ?? 0}
          label="Affected Settlements"
          sublabel="Within hazard area"
          color="bg-red-50"
          loading={loading}
        />
        <StatCard
          icon={<Users className="w-4 h-4 text-blue-600" />}
          value={summary?.estimatedPopulation ?? 0}
          label="Estimated Population"
          sublabel={summary?.estimatedPopulation ? '(Census 2011)' : undefined}
          color="bg-blue-50"
          loading={loading}
        />
        <StatCard
          icon={<Anchor className="w-4 h-4 text-cyan-600" />}
          value={summary?.portFacilities ?? 0}
          label="Port Facilities"
          sublabel="At risk"
          color="bg-cyan-50"
          loading={loading}
        />
        <StatCard
          icon={<Trees className="w-4 h-4 text-emerald-600" />}
          value={summary?.protectedAreas ?? 0}
          label="Protected Area"
          sublabel="At risk"
          color="bg-emerald-50"
          loading={loading}
        />
      </div>
    </div>
  );
};
