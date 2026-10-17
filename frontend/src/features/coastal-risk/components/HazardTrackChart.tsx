import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Finding } from '../../../types';
import { HourlyForecastPoint } from './VoyageForecastAdvisory';

interface Props {
  findings: Finding[];
  loading: boolean;
  forecastPoints?: HourlyForecastPoint[];
  timeRange?: string;
  vesselCautionLimitM?: number;
}

export const HazardTrackChart: React.FC<Props> = ({
  findings,
  loading,
  forecastPoints,
  timeRange = 'historical',
  vesselCautionLimitM = 1.8,
}) => {
  const isForecastMode = timeRange.startsWith('next');

  // Format forecast series if available
  const forecastChartData = useMemo(() => {
    if (!forecastPoints || forecastPoints.length === 0) return [];
    return forecastPoints.map((p) => {
      let hourStr = p.time;
      try {
        const d = new Date(p.time);
        hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch {
        // Keep original
      }
      return {
        time: hourStr,
        waveHeight: Number(p.wave_height.toFixed(2)),
        swellHeight: Number(p.swell_height.toFixed(2)),
        windGusts: Number(p.wind_gusts.toFixed(1)),
        cautionLimit: vesselCautionLimitM,
        riskTier: p.risk_tier,
      };
    });
  }, [forecastPoints, vesselCautionLimitM]);

  // Extract hazard/historical data from findings
  const trackData = useMemo(() => {
    const historicalFindings = findings.filter(
      (f) =>
        f.claim?.toLowerCase().includes('cyclone') ||
        f.claim?.toLowerCase().includes('storm') ||
        f.claim?.toLowerCase().includes('historical')
    );

    if (historicalFindings.length === 0) return [];

    return historicalFindings
      .map((f, i) => {
        const yearMatch = f.claim.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : 2020 + i;
        return {
          label: f.claim.substring(0, 30) + '...',
          year,
          value: f.value || 0,
          unit: f.unit || '',
          isForecast: f.is_forecast,
        };
      })
      .sort((a, b) => a.year - b.year);
  }, [findings]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">
          {isForecastMode ? 'Hourly Wave & Swell Forecast' : 'Hazard Track & Forecast'}
        </h3>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  // Render Forecast Chart if forward duration is selected
  if (isForecastMode && forecastChartData.length > 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[#0a1628]">
              Hourly Wave & Swell Forecast
            </h3>
            <span className="text-[10px] text-slate-500">
              ECMWF forward ocean model simulation (Next {forecastChartData.length} hrs)
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
            Forward Simulation
          </span>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9.5, fill: '#6b8fc0' }}
                interval={Math.ceil(forecastChartData.length / 8)}
              />
              <YAxis
                tick={{ fontSize: 9.5, fill: '#6b8fc0' }}
                width={30}
                unit="m"
              />
              <Tooltip
                contentStyle={{
                  fontSize: '11px',
                  borderRadius: '8px',
                  border: '1px solid #d8e4f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'waveHeight') return [`${value} m`, 'Wave Height (Hs)'];
                  if (name === 'swellHeight') return [`${value} m`, 'Swell Wave'];
                  if (name === 'cautionLimit') return [`${value} m`, 'Vessel Caution Threshold'];
                  return [value, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="waveHeight"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                name="waveHeight"
              />
              <Line
                type="monotone"
                dataKey="swellHeight"
                stroke="#06b6d4"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                dot={false}
                name="swellHeight"
              />
              <Line
                type="monotone"
                dataKey="cautionLimit"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="cautionLimit"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 mt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-[#2563eb]" />
              <span>Wave Hs (m)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-[#06b6d4] border-t border-dashed" />
              <span>Swell (m)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-[#f59e0b] border-t border-dashed" />
              <span>Vessel Caution</span>
            </span>
          </div>
          <span className="text-slate-400 font-mono">Hourly Grids</span>
        </div>
      </div>
    );
  }

  // Fallback: Historical view
  if (trackData.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Hazard Track & Forecast</h3>
        <div className="h-48 flex flex-col items-center justify-center text-xs text-[#6b8fc0] gap-2">
          <span>No hazard track data available</span>
          <span className="text-[10px] text-[#93b1d6]">Select forward forecast duration or run historical analysis</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#0a1628]">Hazard Track & Precedents</h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Historical Precedents
        </span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trackData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#6b8fc0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b8fc0' }} width={35} />
            <Tooltip
              contentStyle={{
                fontSize: '11px',
                borderRadius: '8px',
                border: '1px solid #d8e4f0',
              }}
              formatter={(value: any, _name: any) => [value, 'Value']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#93b1d6]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span>Cyclone Precedent Surges</span>
        </div>
      </div>
    </div>
  );
};
