import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Finding } from '../../../types';

interface Props {
  findings: Finding[];
  loading: boolean;
}

export const HazardTrackChart: React.FC<Props> = ({ findings, loading }) => {
  // Extract hazard/historical data from findings
  const trackData = useMemo(() => {
    const historicalFindings = findings.filter(f =>
      f.claim?.toLowerCase().includes('cyclone') ||
      f.claim?.toLowerCase().includes('storm') ||
      f.claim?.toLowerCase().includes('historical')
    );

    if (historicalFindings.length === 0) return [];

    // Create timeline entries from historical precedents
    return historicalFindings.map((f, i) => {
      const yearMatch = f.claim.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2020 + i;
      return {
        label: f.claim.substring(0, 30) + '...',
        year,
        value: f.value || 0,
        unit: f.unit || '',
        isForecast: f.is_forecast,
      };
    }).sort((a, b) => a.year - b.year);
  }, [findings]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Hazard Track & Forecast</h3>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  if (trackData.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
        <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Hazard Track & Forecast</h3>
        <div className="h-48 flex flex-col items-center justify-center text-xs text-[#6b8fc0] gap-2">
          <span>No hazard track data available</span>
          <span className="text-[10px] text-[#93b1d6]">Run analysis to load historical cyclone precedents</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[#d8e4f0] shadow-sm">
      <h3 className="text-sm font-semibold text-[#0a1628] mb-2">Hazard Track & Forecast</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trackData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: '#6b8fc0' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b8fc0' }}
              width={35}
            />
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
          <span>Historical Track</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f97316] border border-dashed border-[#f97316]" />
          <span>Forecast (when available)</span>
        </div>
      </div>
    </div>
  );
};
