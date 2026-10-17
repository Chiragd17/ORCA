import React from 'react';
import { ShieldCheck, Flame, Compass, Waves } from 'lucide-react';

interface Props {
  status: string;
  regime: string;
  description: string;
}

export const OceanConditionBadge: React.FC<Props> = ({ status, regime, description }) => {
  const isWarming = status.includes('ELEVATED') || status.includes('WARMING');
  const isUpwelling = status.includes('UPWELLING') || status.includes('COOL');
  const isSwell = status.includes('SWELL') || status.includes('HEAVY');

  let badgeColor = 'bg-teal-600 text-white';
  let containerBg = 'bg-teal-50/80 border-teal-200';
  let badgeText = 'OPTIMAL';
  let Icon = ShieldCheck;

  if (isWarming) {
    badgeColor = 'bg-rose-500 text-white';
    containerBg = 'bg-rose-50 border-rose-200';
    badgeText = 'WARMING';
    Icon = Flame;
  } else if (isUpwelling) {
    badgeColor = 'bg-cyan-600 text-white';
    containerBg = 'bg-cyan-50 border-cyan-200';
    badgeText = 'UPWELLING';
    Icon = Compass;
  } else if (isSwell) {
    badgeColor = 'bg-blue-600 text-white';
    containerBg = 'bg-blue-50 border-blue-200';
    badgeText = 'SWELL';
    Icon = Waves;
  }

  return (
    <div className={`p-3.5 rounded-xl ${containerBg} border transition-all shadow-2xs`}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
        <span>Oceanographic Regime & Status</span>
        <span className="text-[10px] uppercase font-mono tracking-wider text-teal-800 bg-white/80 px-2 py-0.5 rounded-md border border-teal-200">
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
