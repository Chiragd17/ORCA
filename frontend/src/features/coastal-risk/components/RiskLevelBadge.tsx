import React from 'react';

interface Props {
  level: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  description: string;
}

const LEVEL_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-500 text-white' },
  MODERATE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500 text-white' },
  LOW: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-500 text-white' },
  UNKNOWN: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', badge: 'bg-gray-400 text-white' },
};

export const RiskLevelBadge: React.FC<Props> = ({ level, description }) => {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.UNKNOWN;

  return (
    <div className={`p-3 rounded-xl ${style.bg} border ${style.border}`}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[#4a6fa5]">Risk Level</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-sm font-black ${style.badge}`}>
          {level}
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#1a3258]">
            {level === 'UNKNOWN' ? 'Assessment unavailable' : `${level.charAt(0) + level.slice(1).toLowerCase()} coastal impact potential`}
          </p>
          <p className="text-[11px] text-[#6b8fc0] mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
    </div>
  );
};
