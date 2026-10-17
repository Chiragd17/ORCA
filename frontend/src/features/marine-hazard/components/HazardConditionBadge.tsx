import React from 'react';
import { ShieldCheck, AlertTriangle, Wind } from 'lucide-react';

interface Props {
  status: string;
  regime: string;
  description: string;
}

export const HazardConditionBadge: React.FC<Props> = ({ status, regime, description }) => {
  const isRedAlert = status.includes('SEVERE') || status.includes('EXTREME') || status.includes('RED') || status.includes('CYCLONE');
  const isCaution = status.includes('MODERATE') || status.includes('CAUTION') || status.includes('ROUGH') || status.includes('ORANGE');

  let badgeColor = 'bg-emerald-600 text-white';
  let containerBg = 'bg-emerald-50/80 border-emerald-200';
  let badgeText = 'NORMAL';
  let Icon = ShieldCheck;

  if (isRedAlert) {
    badgeColor = 'bg-red-600 text-white';
    containerBg = 'bg-red-50 border-red-200';
    badgeText = 'ALERT';
    Icon = AlertTriangle;
  } else if (isCaution) {
    badgeColor = 'bg-amber-500 text-white';
    containerBg = 'bg-amber-50 border-amber-200';
    badgeText = 'CAUTION';
    Icon = Wind;
  }

  return (
    <div className={`p-3.5 rounded-xl ${containerBg} border transition-all shadow-2xs`}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
        <span>Marine Hazard Regime & Status</span>
        <span className="text-[10px] uppercase font-mono tracking-wider text-orange-900 bg-white/80 px-2 py-0.5 rounded-md border border-orange-200">
          {regime}
        </span>
      </div>
      <div className="flex items-center gap-3.5 mt-2">
        <span className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-xs font-black tracking-tight ${badgeColor} shadow-xs flex-shrink-0`}>
          <div className="flex flex-col items-center leading-none">
            <Icon className="w-4 h-4 mb-0.5" />
            <span className="text-[9.5px] uppercase">{badgeText}</span>
          </div>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#1a3258] leading-tight">
            {status}
          </p>
          <p className="text-[11px] text-[#4a6fa5] mt-1 leading-snug">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
