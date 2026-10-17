import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { OceanTimeSeriesPoint } from '../../../types';

interface Props {
  timeSeries: OceanTimeSeriesPoint[];
  loading?: boolean;
}

function getCompassDir(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((deg % 360) / 22.5);
  return dirs[idx % 16];
}

export const OceanHydrodynamicsChart: React.FC<Props> = ({
  timeSeries,
  loading,
}) => {
  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-5 w-44" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="skeleton h-56 rounded-lg" />
      </div>
    );
  }

  const sampledData = React.useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    const step = Math.max(1, Math.floor(timeSeries.length / 32));
    return timeSeries
      .filter((_, idx) => idx % step === 0)
      .map((pt) => {
        const d = new Date(pt.time);
        const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
        const hourStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        return {
          timestamp: pt.time,
          label: `${dayStr} ${hourStr}`,
          waveHeight: Number((pt.wave_height_m ?? pt.wave_height ?? 0).toFixed(2)),
          currentSpeed: Number((pt.current_velocity_ms ?? pt.current_velocity ?? 0).toFixed(2)),
          currentDir: Math.round(pt.current_direction_deg ?? pt.current_direction ?? 0),
          currentDirText: getCompassDir(pt.current_direction_deg ?? pt.current_direction ?? 0),
        };
      });
  }, [timeSeries]);

  const maxWave = sampledData.length > 0
    ? Math.max(...sampledData.map(d => d.waveHeight))
    : 0;
  const maxCurrent = sampledData.length > 0
    ? Math.max(...sampledData.map(d => d.currentSpeed))
    : 0;

  return (
    <div className="rounded-xl bg-white border border-[#d8e4f0] shadow-sm p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-[#0a1628]">Wave & Current Hydrodynamics</h3>
            <p className="text-[11px] text-[#6b8fc0]">
              Open-Meteo physical model: Significant Wave Height (Hs) & Current Speed (U,V)
            </p>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
              Peak Wave: {maxWave.toFixed(2)}m
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700">
              Max Current: {maxCurrent.toFixed(2)}m/s
            </span>
          </div>
        </div>

        {sampledData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-xs text-[#6b8fc0]">
            No hydrodynamic telemetry available.
          </div>
        ) : (
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampledData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#6b8fc0' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                {/* Left Axis: Wave Height */}
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: '#0284c7' }}
                  tickLine={false}
                  unit="m"
                  domain={[0, 'auto']}
                />
                {/* Right Axis: Current Speed */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: '#0d9488' }}
                  tickLine={false}
                  unit="m/s"
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d8e4f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(val: any, name: string, item: any) => {
                    if (name === 'Wave Height') return [`${val} m`, 'Wave Height (Hs)'];
                    if (name === 'Current Speed') {
                      const payload = item?.payload;
                      const dir = payload?.currentDirText ? ` (${payload.currentDir}° ${payload.currentDirText})` : '';
                      const kts = (Number(val) * 1.94384).toFixed(1);
                      return [`${val} m/s [${kts} kts]${dir}`, 'Current Speed'];
                    }
                    return [val, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={24}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '10px', paddingTop: '-10px' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="waveHeight"
                  name="Wave Height"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="currentSpeed"
                  name="Current Speed"
                  stroke="#0d9488"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#f0f5fa] text-[10px] text-[#6b8fc0]">
        <span>Open-Meteo ECMWF Wave Model + GFS Ocean Current Grid</span>
        <span>Karnataka Offshore Continental Shelf</span>
      </div>
    </div>
  );
};
