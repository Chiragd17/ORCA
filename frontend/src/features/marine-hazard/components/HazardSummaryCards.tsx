import React from 'react';
import { AlertTriangle, Compass, Wind, Waves } from 'lucide-react';

interface Props {
  activeAlertsCount: number;
  totalHistoricalCount: number;
  peakWindKnots: number | null;
  windCategory: string | null;
  significantWaveHeight: number | null;
  douglasState: string | null;
  loading: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sublabel?: string;
  color: string;
  loading: boolean;
  isLive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, sublabel, color, loading, isLive }) => (
  <div className="p-3 rounded-xl bg-white border border-[#d8e4f0] shadow-2xs flex items-center gap-3 transition-all hover:border-slate-300">
    <div className={`p-2 rounded-lg ${color}`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      {loading ? (
        <div className="skeleton h-6 w-16 mb-1" />
      ) : (
        <div className="flex items-center gap-1.5">
          <p className="text-xl font-bold text-[#0a1628] leading-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      )}
      <p className="text-[11px] text-[#4a6fa5] font-medium leading-tight">{label}</p>
      {sublabel && (
        <p className="text-[10px] text-[#93b1d6] italic truncate">{sublabel}</p>
      )}
    </div>
  </div>
);

export const HazardSummaryCards: React.FC<Props> = ({
  activeAlertsCount,
  totalHistoricalCount,
  peakWindKnots,
  windCategory,
  significantWaveHeight,
  douglasState,
  loading,
}) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#0a1628] mb-2">Key Marine Hazard Summary</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          value={activeAlertsCount > 0 ? `${activeAlertsCount} Active` : '0 Active'}
          label="Regional Disaster Alerts"
          sublabel={activeAlertsCount > 0 ? `${activeAlertsCount} active in regional waters` : 'Karnataka & Arabian Sea Clear'}
          color="bg-amber-50"
          loading={loading}
          isLive={activeAlertsCount > 0}
        />
        <StatCard
          icon={<Compass className="w-4 h-4 text-blue-600" />}
          value={totalHistoricalCount > 0 ? `${totalHistoricalCount.toLocaleString()} Storms` : loading ? '...' : '--'}
          label="Tracked Cyclones Registry"
          sublabel="NOAA IBTrACS Archive"
          color="bg-blue-50"
          loading={loading}
        />
        <StatCard
          icon={<Wind className="w-4 h-4 text-red-600" />}
          value={peakWindKnots !== null ? `${peakWindKnots.toFixed(0)} kts` : '--'}
          label="Peak Sustained Wind"
          sublabel={windCategory ? `IMD: ${windCategory}` : 'Saffir-Simpson / IMD scale'}
          color="bg-red-50"
          loading={loading}
          isLive={peakWindKnots !== null && peakWindKnots > 0}
        />
        <StatCard
          icon={<Waves className="w-4 h-4 text-cyan-600" />}
          value={significantWaveHeight !== null ? `${significantWaveHeight.toFixed(2)} m` : '--'}
          label="Significant Wave Height"
          sublabel={douglasState ? `Douglas: ${douglasState}` : 'Open-water wave field'}
          color="bg-cyan-50"
          loading={loading}
          isLive={significantWaveHeight !== null}
        />
      </div>
    </div>
  );
};
