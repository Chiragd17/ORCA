import React from 'react';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Database,
  Binary,
} from 'lucide-react';
import { VerificationSummaryData } from '../types';

interface Props {
  summary: VerificationSummaryData | null;
  loading?: boolean;
}

export const SummaryCards: React.FC<Props> = ({ summary, loading = false }) => {
  const cards = [
    {
      title: 'Claims Assessed',
      value: summary?.claims_assessed ?? 0,
      detail: 'Evaluated across active investigations',
      icon: FileCheck2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Supported Claims',
      value: summary?.supported_claims ?? 0,
      detail: 'Passed all deterministic checks',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Unverified Claims',
      value: (summary?.unverified_claims ?? 0) + (summary?.potential_gap_claims ?? 0),
      detail: 'Missing referenced evidence in feed',
      icon: HelpCircle,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
    },
    {
      title: 'Material Conflicts',
      value: summary?.material_conflicts ?? 0,
      detail: 'Discrepancy beyond empirical tolerance',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      title: 'Evidence Records',
      value: summary?.evidence_records_examined ?? 0,
      detail: 'Cryptographic SHA-256 verified',
      icon: Database,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
    },
    {
      title: 'Checks Completed',
      value: `${summary?.checks_completed ?? 0} / ${(summary?.checks_completed ?? 0) + (summary?.checks_failed ?? 0)}`,
      detail: '0% arithmetic LLM hallucinations',
      icon: Binary,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-white border border-[#d8e4f0] shadow-xs hover:border-[#b8d4f0] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#64748b] leading-tight">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg ${c.bgColor} ${c.color} border ${c.borderColor}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0a1628]">
                {loading ? '...' : c.value}
              </div>
              <p className="text-[10px] text-[#94a3b8] truncate mt-0.5">
                {c.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
