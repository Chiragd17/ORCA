import React from 'react';
import { Thermometer, Waves, Compass, Sparkles } from 'lucide-react';
import { OceanSummary } from '../../../types';

interface Props {
  summary: OceanSummary | null;
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
  <div className="p-3 rounded-xl bg-white border border-[#d8e4f0] shadow-2xs flex items-center gap-3">
    <div className={`p-2 rounded-lg ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      {loading ? (
        <div className="skeleton h-6 w-16 mb-1" />
      ) : (
        <p className="text-xl font-bold text-[#0a1628] leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      <p className="text-[11px] text-[#4a6fa5] font-medium leading-tight">{label}</p>
      {sublabel && (
        <p className="text-[10px] text-[#93b1d6] italic truncate">{sublabel}</p>
      )}
    </div>
  </div>
);

export const OceanSummaryCards: React.FC<Props> = ({ summary, loading }) => {
  if (!summary && !loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] text-center">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-1">Key Oceanographic Summary</h3>
        <p className="text-xs text-[#6b8fc0]">Run research analysis to compute live marine indicators</p>
      </div>
    );
  }

  const sstAnomaly = summary?.sst_anomaly ?? 0;
  const anomalyStr = `${sstAnomaly >= 0 ? '+' : ''}${sstAnomaly.toFixed(2)}°C vs Baseline`;

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#0a1628] mb-2">Key Oceanographic Summary</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Thermometer className="w-4 h-4 text-teal-600" />}
          value={summary ? `${summary.latest_sst.toFixed(1)} °C` : '--'}
          label="Sea Surface Temperature"
          sublabel={summary ? anomalyStr : 'SST telemetry'}
          color="bg-teal-50"
          loading={loading}
        />
        <StatCard
          icon={<Waves className="w-4 h-4 text-blue-600" />}
          value={summary ? `${summary.wave_height_mean.toFixed(2)} m` : '--'}
          label="Significant Wave Height"
          sublabel={summary ? `Peak ${summary.wave_height_peak.toFixed(2)}m • Swell ${summary.swell_period_mean}s` : 'Wave spectrum'}
          color="bg-blue-50"
          loading={loading}
        />
        <StatCard
          icon={<Compass className="w-4 h-4 text-purple-600" />}
          value={summary ? `${summary.current_velocity_mean.toFixed(2)} m/s` : '--'}
          label="Ocean Current Velocity"
          sublabel={summary ? `Heading ${summary.current_direction_degrees.toFixed(0)}° WNW` : 'Hydrodynamic flow'}
          color="bg-purple-50"
          loading={loading}
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
          value={summary ? `${summary.chlorophyll_proxy_mg_m3.toFixed(2)} mg/m³` : '--'}
          label="Chlorophyll-a Proxy"
          sublabel={summary ? 'Biological productivity' : 'Ocean colour index'}
          color="bg-emerald-50"
          loading={loading}
        />
      </div>
    </div>
  );
};
