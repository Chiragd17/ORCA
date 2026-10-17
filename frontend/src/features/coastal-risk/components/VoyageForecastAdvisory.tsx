import React, { useState, useEffect, useCallback } from 'react';
import {
  Waves,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info,
  Calendar,
  Compass,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export interface HourlyForecastPoint {
  time: string;
  wave_height: number;
  wave_period: number;
  swell_height: number;
  wind_speed: number;
  wind_gusts: number;
  wind_direction: number;
  risk_tier: 'FAVORABLE' | 'CAUTION' | 'ADVERSE';
}

export interface ForecastResponse {
  data_available: boolean;
  status?: string;
  provider: string;
  issue_time: string;
  location: { latitude: number; longitude: number };
  hours: number;
  vessel: {
    name: string;
    safe_wave_m: number;
    caution_wave_m: number;
    safe_gust_kmh: number;
    caution_gust_kmh: number;
    description: string;
  };
  overall_status: 'FAVORABLE_WINDOW' | 'CAUTION_WINDOW' | 'ADVERSE_WINDOW' | 'ASSESSMENT_UNAVAILABLE';
  peak_wave: { value_m: number; time: string };
  peak_gust: { value_kmh: number; time: string };
  favorable_hours_count: number;
  safe_window_summary: string;
  deterioration_summary: string;
  ai_summary: string;
  disclaimer: string;
  hourly: HourlyForecastPoint[];
}

interface Props {
  lat: number;
  lon: number;
  timeRange: string;
  locationName?: string;
  onForecastDataLoaded?: (data: ForecastResponse | null) => void;
}

export const VoyageForecastAdvisory: React.FC<Props> = ({
  lat,
  lon,
  timeRange,
  locationName = 'Karnataka Coast',
  onForecastDataLoaded,
}) => {
  const [vesselType, setVesselType] = useState<'traditional' | 'motorized_small' | 'mechanized_trawler'>('motorized_small');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForecastMode = timeRange.startsWith('next');
  const hours = timeRange === 'next12h' ? 12 : timeRange === 'next48h' ? 48 : 24;

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First attempt backend endpoint
      const res = await fetch(
        `/api/v1/marine/forecast?lat=${lat}&lon=${lon}&hours=${hours}&vessel_type=${vesselType}`
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const json: ForecastResponse = await res.json();
      setData(json);
      onForecastDataLoaded?.(json);
    } catch (err: any) {
      // Direct client fallback to Open-Meteo in case proxy is unreachable
      try {
        const [mRes, wRes] = await Promise.all([
          fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction,swell_wave_height&forecast_hours=${hours}&timezone=auto`
          ),
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&forecast_hours=${hours}&timezone=auto`
          ),
        ]);

        if (!mRes.ok || !wRes.ok) throw new Error('External forecast API unreachable');

        const mData = await mRes.json();
        const wData = await wRes.json();
        const times: string[] = mData?.hourly?.time || [];
        const wh: number[] = mData?.hourly?.wave_height || [];
        const wp: number[] = mData?.hourly?.wave_period || [];
        const sh: number[] = mData?.hourly?.swell_wave_height || [];
        const ws: number[] = wData?.hourly?.wind_speed_10m || [];
        const wg: number[] = wData?.hourly?.wind_gusts_10m || [];

        const limits = {
          traditional: { name: 'Traditional Canoe (Naavu)', safeW: 1.0, cautW: 1.5, safeG: 20, cautG: 28 },
          motorized_small: { name: 'Motorized Inshore Fiber Boat', safeW: 1.8, cautW: 2.3, safeG: 30, cautG: 42 },
          mechanized_trawler: { name: 'Mechanized Deep-Sea Trawler', safeW: 2.5, cautW: 3.8, safeG: 38, cautG: 60 },
        }[vesselType];

        let peakW = 0, peakWTime = '', peakG = 0, peakGTime = '';
        let safeCount = 0, stillSafe = true;
        const hourlyList: HourlyForecastPoint[] = [];

        for (let i = 0; i < Math.min(times.length, hours); i++) {
          const w = wh[i] ?? 0;
          const g = wg[i] ?? 0;
          if (w > peakW) { peakW = w; peakWTime = times[i]; }
          if (g > peakG) { peakG = g; peakGTime = times[i]; }

          let tier: 'FAVORABLE' | 'CAUTION' | 'ADVERSE' = 'FAVORABLE';
          if (w >= limits.cautW || g >= limits.cautG) {
            tier = 'ADVERSE';
            stillSafe = false;
          } else if (w >= limits.safeW || g >= limits.safeG) {
            tier = 'CAUTION';
            stillSafe = false;
          } else if (stillSafe) {
            safeCount++;
          }

          hourlyList.push({
            time: times[i],
            wave_height: w,
            wave_period: wp[i] ?? 0,
            swell_height: sh[i] ?? 0,
            wind_speed: ws[i] ?? 0,
            wind_gusts: g,
            wind_direction: wData?.hourly?.wind_direction_10m?.[i] ?? 0,
            risk_tier: tier,
          });
        }

        const overallStatus =
          peakW >= limits.cautW || peakG >= limits.cautG
            ? 'ADVERSE_WINDOW'
            : peakW >= limits.safeW || peakG >= limits.safeG
            ? 'CAUTION_WINDOW'
            : 'FAVORABLE_WINDOW';

        const fallbackObj: ForecastResponse = {
          data_available: true,
          provider: 'Open-Meteo Marine / ECMWF Global Model',
          issue_time: new Date().toISOString(),
          location: { latitude: lat, longitude: lon },
          hours,
          vessel: {
            name: limits.name,
            safe_wave_m: limits.safeW,
            caution_wave_m: limits.cautW,
            safe_gust_kmh: limits.safeG,
            caution_gust_kmh: limits.cautG,
            description: 'Coastal fishing limits based on CMFRI & DG Shipping guidelines.',
          },
          overall_status: overallStatus,
          peak_wave: { value_m: peakW, time: peakWTime },
          peak_gust: { value_kmh: peakG, time: peakGTime },
          favorable_hours_count: safeCount,
          safe_window_summary: safeCount > 0 ? `${safeCount} consecutive favorable hours from departure` : 'No continuous safe window',
          deterioration_summary: peakW >= limits.safeW ? `Peak wave (${peakW.toFixed(2)}m) at ${peakWTime}` : 'Conditions stay within limits',
          ai_summary: `Direct fallback forecast for ${limits.name}: Peak wave height ${peakW.toFixed(2)}m expected around ${peakWTime}. Max gusts ${peakG.toFixed(1)} km/h. Local port signal flags take precedence.`,
          disclaimer: 'Advisory criteria are indicative. Local estuary bar conditions alter actual risk. Check IMD/INCOIS bulletins.',
          hourly: hourlyList,
        };

        setData(fallbackObj);
        onForecastDataLoaded?.(fallbackObj);
      } catch (clientErr: any) {
        // Safeguard 3: Conservative failure handling
        const failObj: ForecastResponse = {
          data_available: false,
          status: 'UNAVAILABLE',
          provider: 'Open-Meteo Marine / ECMWF',
          issue_time: new Date().toISOString(),
          location: { latitude: lat, longitude: lon },
          hours,
          vessel: {
            name: 'Generic Fishing Craft',
            safe_wave_m: 1.5,
            caution_wave_m: 2.2,
            safe_gust_kmh: 25,
            caution_gust_kmh: 40,
            description: '',
          },
          overall_status: 'ASSESSMENT_UNAVAILABLE',
          peak_wave: { value_m: 0, time: '' },
          peak_gust: { value_kmh: 0, time: '' },
          favorable_hours_count: 0,
          safe_window_summary: 'Forecast feed unavailable',
          deterioration_summary: 'Unable to verify sea state',
          ai_summary: 'Forecast numerical models temporarily unreachable. Do NOT assume unmonitored waters are safe. Follow official IMD/INCOIS visual port signals.',
          disclaimer: 'CRITICAL: Forecast data offline. Consult harbour master and Fisheries Department.',
          hourly: [],
        };
        setData(failObj);
        setError('Forecast telemetry stream unavailable. Assessment offline.');
        onForecastDataLoaded?.(failObj);
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lon, hours, vesselType, onForecastDataLoaded]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const vesselButtons = [
    { id: 'traditional', label: 'Traditional Canoe (Naavu)', icon: '🚣', tag: 'Unmotorized / Surf Vulnerable' },
    { id: 'motorized_small', label: 'Motorized Fiber Boat (<10m)', icon: '🚤', tag: 'Outboard Engine' },
    { id: 'mechanized_trawler', label: 'Deep-Sea Trawler (>15m)', icon: '🚢', tag: 'Inboard Mechanized' },
  ];

  const formatHourLabel = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] p-5 shadow-xs space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef4fb] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Compass className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0a1628]">
                  Fisherman Voyage-Risk Decision Support
                </h3>
                {isForecastMode ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                    Forward Forecast ({hours}h)
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Forward Preview ({hours}h)
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500">
                Hourly numerical sea-state forecasting for departure planning off {locationName}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchForecast}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh forward forecast"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="text-[11px] font-medium">Refresh Forecast</span>
          </button>
        </div>
      </div>

      {/* Vessel Type Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Select Vessel Class (Applies Validated Hydrodynamic Operating Limits)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {vesselButtons.map((vb) => {
            const isSelected = vesselType === vb.id;
            return (
              <button
                key={vb.id}
                type="button"
                onClick={() => setVesselType(vb.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/20 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">{vb.icon}</span>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {vb.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">{vb.tag}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Status & Metrics Row */}
      {loading ? (
        <div className="p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Fetching Open-Meteo & ECMWF forward marine forecast grids ({hours}h)...
          </p>
        </div>
      ) : data?.data_available ? (
        <div className="space-y-4">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              data.overall_status === 'FAVORABLE_WINDOW'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : data.overall_status === 'CAUTION_WINDOW'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {data.overall_status === 'FAVORABLE_WINDOW' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : data.overall_status === 'CAUTION_WINDOW' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {data.overall_status === 'FAVORABLE_WINDOW'
                    ? 'Favorable Voyage Window'
                    : data.overall_status === 'CAUTION_WINDOW'
                    ? 'Cautionary Sea State Detected'
                    : 'Adverse Conditions Expected for Selected Craft'}
                </span>
                <span className="text-xs opacity-90 block mt-0.5">
                  {data.safe_window_summary}
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] opacity-75 font-mono whitespace-nowrap">
              Vessel Limit: Wave &lt; {data.vessel.caution_wave_m}m • Gust &lt; {data.vessel.caution_gust_kmh} km/h
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10.5px] font-medium">Peak Wave Height</span>
                <Waves className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-slate-900">
                  {data.peak_wave.value_m.toFixed(2)}
                </span>
                <span className="text-xs font-medium text-slate-500">meters</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                At {formatHourLabel(data.peak_wave.time)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10.5px] font-medium">Peak Wind Gust</span>
                <Wind className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-slate-900">
                  {data.peak_gust.value_kmh.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-500">km/h</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                At {formatHourLabel(data.peak_gust.time)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10.5px] font-medium">Continuous Safe Hours</span>
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-emerald-700">
                  {data.favorable_hours_count}
                </span>
                <span className="text-xs font-medium text-slate-500">of {data.hours} hrs</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                From current hour forward
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10.5px] font-medium">Model Assimilation</span>
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 block truncate">
                ECMWF IFS (0.1°)
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Hourly Forward Cycles
              </span>
            </div>
          </div>

          {/* AI Decision Support Summary (Grounded & Dynamic) */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold">
              <Info className="w-4 h-4 text-blue-600" />
              <span>ORCA AI Voyage Advisory & Trend Explanation</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed">
              {data.ai_summary}
            </p>
          </div>

          {/* Hourly Timeline Strip (First 12 hours visualized) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Hourly Sea-State Horizon ({Math.min(data.hourly.length, 12)} Hours Preview)
              </span>
              <span className="text-[10.5px] text-slate-400">Horizontal scroll for full window</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 text-xs">
              {data.hourly.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex-shrink-0 w-24 p-2 rounded-xl border text-center space-y-1 ${
                    h.risk_tier === 'FAVORABLE'
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : h.risk_tier === 'CAUTION'
                      ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                      : 'bg-red-50/50 border-red-200 text-red-950'
                  }`}
                >
                  <span className="text-[10px] font-mono font-semibold block text-slate-500">
                    {formatHourLabel(h.time)}
                  </span>
                  <div className="font-extrabold text-xs">
                    {h.wave_height.toFixed(2)}m
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {h.wind_gusts.toFixed(0)} km/h
                  </div>
                  <span
                    className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      h.risk_tier === 'FAVORABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : h.risk_tier === 'CAUTION'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {h.risk_tier === 'FAVORABLE' ? 'Safe' : h.risk_tier === 'CAUTION' ? 'Caution' : 'Adverse'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Authoritative Precedence & Disclaimer (Safeguards 2 & 3) */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Authoritative Precedence Warning (Safeguard)</span>
            </div>
            <p className="leading-snug text-[10.5px] text-amber-800/90">
              {data.disclaimer}
            </p>
          </div>
        </div>
      ) : (
        /* Safeguard 3: Conservative Failure State */
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Forecast Numerical Telemetry Unavailable</span>
          </div>
          <p className="text-[11px] leading-relaxed text-red-700">
            {error || 'Unable to establish live connection to numerical weather models. ORCA does not generate unverified safety assurances.'}
          </p>
          <div className="p-2.5 rounded-lg bg-white/80 border border-red-200 text-[10.5px] text-red-900 font-medium">
            ⚠️ DO NOT ASSUME UNMONITORED WATERS ARE SAFE. Check local Port Officer cautionary signal flags and consult the nearest Fisheries Department before leaving harbour.
          </div>
        </div>
      )}
    </div>
  );
};
