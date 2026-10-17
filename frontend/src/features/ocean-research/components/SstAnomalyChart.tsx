import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { OceanTimeSeriesPoint } from '../../../types';

interface Props {
  timeSeries: OceanTimeSeriesPoint[];
  loading?: boolean;
  baselineTemp?: number;
}

export const SstAnomalyChart: React.FC<Props> = ({
  timeSeries,
  loading,
  baselineTemp = 29.2,
}) => {
  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton h-56 rounded-lg" />
      </div>
    );
  }

  // Sample or aggregate points so the bar chart isn't overcrowded (e.g. 24-48 points or every 3-4 hours)
  const sampledData = React.useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    const step = Math.max(1, Math.floor(timeSeries.length / 28));
    return timeSeries
      .filter((_, idx) => idx % step === 0)
      .map((pt) => {
        const d = new Date(pt.time);
        const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
        const hourStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        return {
          timestamp: pt.time,
          label: `${dayStr} ${hourStr}`,
          sst: pt.sst_c ?? pt.sst,
          baseline: pt.baseline_sst_c ?? pt.baseline_sst ?? baselineTemp,
          anomaly: Number((pt.sst_anomaly_c ?? pt.sst_anomaly ?? 0).toFixed(2)),
        };
      });
  }, [timeSeries, baselineTemp]);

  const latestAnomaly = sampledData.length > 0 ? sampledData[sampledData.length - 1].anomaly : 0;
  const avgAnomaly = sampledData.length > 0
    ? Number((sampledData.reduce((acc, p) => acc + p.anomaly, 0) / sampledData.length).toFixed(2))
    : 0;

  return (
    <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-[#0a1628]">SST Thermal Anomaly</h3>
            <p className="text-[11px] text-[#6b8fc0]">
              Delta vs 30-year Arabian Sea ERA5 monthly baseline ({baselineTemp.toFixed(1)}°C)
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                latestAnomaly > 0.5
                  ? 'bg-amber-100 text-amber-800'
                  : latestAnomaly < -0.5
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {latestAnomaly >= 0 ? `+${latestAnomaly.toFixed(2)}` : latestAnomaly.toFixed(2)} °C
            </span>
            <p className="text-[10px] text-[#93b1d6] mt-0.5">Mean: {avgAnomaly >= 0 ? `+${avgAnomaly}` : avgAnomaly}°C</p>
          </div>
        </div>

        {sampledData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-xs text-[#6b8fc0]">
            No temporal anomaly data available for this horizon.
          </div>
        ) : (
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampledData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#6b8fc0' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b8fc0' }}
                  tickLine={false}
                  unit="°"
                  domain={[-1.5, 1.5]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d8e4f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(val: any) => [`${Number(val) >= 0 ? '+' : ''}${Number(val).toFixed(2)} °C`, 'Anomaly']}
                  labelFormatter={(lbl, items) => {
                    const item = items?.[0]?.payload;
                    return item ? `${lbl} (SST: ${item.sst}°C | Base: ${item.baseline}°C)` : String(lbl);
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Bar dataKey="anomaly" radius={[2, 2, 0, 0]}>
                  {sampledData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.anomaly >= 0 ? '#ea580c' : '#0284c7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#f0f5fa] text-[10px] text-[#6b8fc0]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]" />
            Positive Anomaly (Thermal Surplus)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7]" />
            Negative Anomaly (Upwelling/Cooling)
          </span>
        </div>
        <span>ERA5 1991-2020 Climatology</span>
      </div>
    </div>
  );
};
