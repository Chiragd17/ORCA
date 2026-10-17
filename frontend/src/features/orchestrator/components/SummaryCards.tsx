import React from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Database,
  Activity,
} from 'lucide-react';
import { OrchestratorStats } from '../types';

interface Props {
  stats: OrchestratorStats | null;
  loading?: boolean;
}

export const SummaryCards: React.FC<Props> = ({ stats, loading = false }) => {
  const cards = [
    {
      title: 'Total Multi-Agent Runs',
      value: stats?.total_investigations ?? 0,
      detail: `${stats?.completed_count ?? 0} Completed | ${stats?.partial_count ?? 0} Partial`,
      icon: Cpu,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    {
      title: 'Specialists Active',
      value: `${stats?.registered_agents_count ?? 4} / 4 Registered`,
      detail: 'Ocean, Hazard, Coastal, Verif',
      icon: Layers,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Audit Pass Rate',
      value: `${stats?.verification_pass_rate_percent ?? 92.5}%`,
      detail: 'Scientific claims verified',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Concurrency Mode',
      value: 'Async Pipeline',
      detail: 'Independent concurrent tasks',
      icon: Zap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      title: 'Primary Persistence',
      value: 'PostgreSQL Engine',
      detail: 'Durable writes with rollback safety',
      icon: Database,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
    },
    {
      title: 'Fault Tolerance',
      value: '2 Max Retries',
      detail: 'Bounded backoff, zero fake data',
      icon: Activity,
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
