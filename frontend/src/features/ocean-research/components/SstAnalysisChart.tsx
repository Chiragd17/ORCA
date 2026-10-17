import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { OceanTimeSeriesPoint } from '../../../types';
import { Thermometer } from 'lucide-react';

interface Props {
  timeSeries: OceanTimeSeriesPoint[];
  loading: boolean;
}

export const SstAnalysisChart: React.FC<Props> = ({ timeSeries, loading }) => {
  if (loading || timeSeries.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-[#d8e4f0] shadow-xs h-[280px] flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-teal-600" />
          <h3 className="text-xs font-bold text-[#0a1628]">SST Climatological Trajectory</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          {loading ? 'Computing sea temperature time series...' : 'No telemetry data loaded.'}
        </div>
      </div>
    );
  }

  // Format data for chart (subsample if more than 36 points to prevent clutter)
  const step = Math.max(1, Math.floor(timeSeries.length / 32));
  const data = timeSeries
    .filter((_, idx) => idx % step === 0)
    .map((p) => {
      let label = p.time;
      try {
        const d = new Date(p.time);
        label = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
      } catch {
        // use fallback
      }
      return {
        time: label,
        sst: Number(p.sst.toFixed(2)),
        baseline: Number(p.baseline_sst.toFixed(2)),
      };
    });

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#d8e4f0] shadow-xs h-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
            <Thermometer className="w-3.5 h-3.5" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[#0a1628]">SST Climatological Trajectory</h3>
            <span className="text-[10px] text-slate-400">Observed / Modeled SST vs 30-yr ERA5 Baseline</span>
          </div>
        </div>
        <span className="text-[10.5px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
          Unit: °C
        </span>
      </div>

      <div className="flex-1 w-full min-h-0 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9.5, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tick={{ fontSize: 9.5, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(v) => `${v.toFixed(1)}°`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '11px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: any, name: any) => [
                `${Number(value).toFixed(2)} °C`,
                name === 'sst' ? 'Observed / Modeled SST' : '30-yr Baseline',
              ]}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', paddingTop: '-10px', paddingBottom: '4px' }}
            />
            <Line
              type="monotone"
              dataKey="sst"
              name="Modeled SST"
              stroke="#0d9488"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#0f766e', strokeWidth: 1.5 }}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="ERA5 30yr Baseline"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
