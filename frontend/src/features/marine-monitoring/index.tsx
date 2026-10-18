import React, { useState } from 'react';
import {
  Waves,
  Activity,
  Compass,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  Radio,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { WorkspaceMapViewer } from '../workspaces-common/WorkspaceMapViewer';
import { WorkspaceChatbot } from '../workspaces-common/WorkspaceChatbot';
import { WorkspaceAnalysisModal } from '../workspaces-common/WorkspaceAnalysisModal';

const FORECAST_7DAY_DATA = [
  { day: 'May 18', waveHeight: 0.62, windSpeed: 9.4 },
  { day: 'May 19', waveHeight: 0.85, windSpeed: 12.1 },
  { day: 'May 20', waveHeight: 1.15, windSpeed: 16.5 },
  { day: 'May 21', waveHeight: 0.72, windSpeed: 10.2 },
  { day: 'May 22', waveHeight: 0.95, windSpeed: 13.8 },
  { day: 'May 23', waveHeight: 0.68, windSpeed: 8.9 },
  { day: 'May 24', waveHeight: 0.60, windSpeed: 7.5 },
];

export const MarineMonitoringWorkspace: React.FC = () => {
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [highlightSector, setHighlightSector] = useState<string | null>(null);

  const quickPrompts = [
    'Analyze SST anomaly trends along the Karnataka coast',
    'Check ocean current velocity and salinity at 12.87°N, 74.88°E',
    'Verify Open-Meteo wave telemetry against scientific audit',
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center flex-shrink-0">
            <Waves className="w-6 h-6 text-cyan-600" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[#0a1628]">Marine Monitoring Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                Ocean Physics & Telemetry
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API LIVE
              </span>
            </div>
            <p className="text-xs text-[#6b8fc0]">
              Real-time ocean data • Forecasts • Trends • Open-Meteo & Copernicus Buoys
            </p>
          </div>
        </div>

        {/* Action Button Top-Right */}
        <button
          type="button"
          onClick={() => setAnalysisModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Run Marine Monitoring Analysis</span>
        </button>
      </div>

      {/* 2. Main Three-Column Layout (Matching Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Marine Conditions Map & Heatmap (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              <h3 className="text-xs font-bold text-[#0a1628]">Marine Conditions (Live)</h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span>Wave Heatmap Overlay</span>
            </div>
          </div>

          <WorkspaceMapViewer
            mode="marine-monitoring"
            height="360px"
            center={[74.45, 13.25]}
            zoom={7.9}
            highlightSector={highlightSector}
            onMarkerClick={name => setHighlightSector(name)}
          />

          {/* Wave Height Legend Scale */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[10px] text-slate-600">
            <span className="font-bold text-slate-700">Wave Scale:</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-900" /> &gt;3.0m</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600" /> 2.0-3.0m</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> 1.0-2.0m</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-cyan-400" /> 0.5-1.0m</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-300" /> &lt;0.5m</span>
            </div>
          </div>
        </div>

        {/* Middle: Live Parameters List (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-[#0a1628]">Live Parameters</h3>
              <p className="text-[10px] text-slate-400">Mangaluru Offshore (12.87°N, 74.88°E)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-blue-500" /> Wave Height</span>
              <strong className="text-slate-900 font-bold font-mono">0.62 m</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-indigo-500" /> Wave Period</span>
              <strong className="text-slate-900 font-bold font-mono">9.5 s</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-cyan-500" /> Swell Height</span>
              <strong className="text-slate-900 font-bold font-mono">0.52 m (202° SSW)</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-teal-500" /> Wind Speed</span>
              <strong className="text-slate-900 font-bold font-mono">9.4 km/h (Gusts 15.7)</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-purple-500" /> Wind Direction</span>
              <strong className="text-slate-900 font-bold font-mono">98° E</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-400" /> Humidity</span>
              <strong className="text-slate-900 font-bold font-mono">92%</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-amber-500" /> Pressure</span>
              <strong className="text-slate-900 font-bold font-mono">1010.0 hPa</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 text-rose-500" /> Sea Surface Temp</span>
              <strong className="text-slate-900 font-bold font-mono">28.7 °C</strong>
            </div>
          </div>

          <div className="pt-2 text-[10.5px] text-slate-400 flex items-center justify-between border-t border-slate-100 font-mono">
            <span>Checked: Live Stream</span>
            <span className="text-emerald-600 font-semibold">HTTP 200 OK</span>
          </div>
        </div>

        {/* Right: Forecast Chart & Data Source (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* 7-Day Forecast Time Series */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0a1628]">Forecast (Next 7 Days)</h3>
              <span className="text-[10px] text-slate-400">Trend</span>
            </div>

            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={FORECAST_7DAY_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #d8e4f0' }}
                  />
                  <Line type="monotone" dataKey="waveHeight" stroke="#0284c7" strokeWidth={2} name="Wave (m)" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="windSpeed" stroke="#0d9488" strokeWidth={1.5} name="Wind (km/h)" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Source Status */}
          <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Data Source
            </span>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-600 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Open-Meteo Marine API</h4>
                <p className="text-[10.5px] text-emerald-600 font-semibold">Status: Online</p>
              </div>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-relaxed pt-1">
              Synchronized with Arabian Sea regional ocean circulation models and IMD feeds.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Marine Forecast Timeline Bar (Matching Screenshot Bottom Row) */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-600" />
            Marine Forecast Timeline
          </span>
          <span className="text-[10px] font-mono text-slate-400">168-Hour Window</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Wave Height</span>
            <strong className="text-xs font-bold text-slate-800">0.6 - 1.2 m</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Swell Height</span>
            <strong className="text-xs font-bold text-slate-800">0.4 - 0.8 m</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Period</span>
            <strong className="text-xs font-bold text-slate-800">8 - 10 s</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Wind</span>
            <strong className="text-xs font-bold text-slate-800">8 - 15 km/h</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block">SST</span>
            <strong className="text-xs font-bold text-slate-800">28 - 29 °C</strong>
          </div>
        </div>
      </div>

      {/* Floating AI Chatbot Copilot */}
      <WorkspaceChatbot
        workspace="marine-monitoring"
        workspaceTitle="Marine Monitoring"
        quickPrompts={quickPrompts}
        onAnalysisGenerated={() => {
          setHighlightSector('Mangaluru Offshore');
        }}
      />

      {/* Analysis Execution Modal */}
      <WorkspaceAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        workspace="marine-monitoring"
        workspaceTitle="Marine Monitoring Analysis"
        defaultQuery="Analyze near-surface sea temperatures, wave spectra, and ocean current velocity off the Karnataka coastline across 168 forecast hours."
        plannedAgents={['ocean_research', 'evidence_verification']}
        onCompleted={(_id, _ans) => setHighlightSector('Mangaluru Offshore')}
      />
    </div>
  );
};
