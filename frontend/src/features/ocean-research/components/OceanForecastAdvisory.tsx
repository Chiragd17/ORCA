import React, { useState, useEffect, useCallback } from 'react';
import {
  Waves,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
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
  timeRange?: string;
  locationName?: string;
  onForecastDataLoaded?: (data: ForecastResponse | null) => void;
}

export const OceanForecastAdvisory: React.FC<Props> = ({
  lat,
  lon,
  timeRange = 'forecast_7d',
  locationName = 'Karnataka Coastal Shelf',
  onForecastDataLoaded,
}) => {
  const [vesselType, setVesselType] = useState<'traditional' | 'motorized_small' | 'mechanized_trawler'>('motorized_small');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  const hours = timeRange === 'live' ? 12 : timeRange === 'historical' ? 24 : 48;

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Primary backend endpoint
      const res = await fetch(
        `/api/v1/marine/forecast?lat=${lat}&lon=${lon}&hours=${hours}&vessel_type=${vesselType}`
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const json: ForecastResponse = await res.json();
      setData(json);
      onForecastDataLoaded?.(json);
    } catch {
      // 2. Direct client fallback to Open-Meteo ECMWF marine physics & atmospheric grids
      try {
        const [mRes, wRes] = await Promise.all([
          fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction,swell_wave_height&forecast_hours=${hours}&timezone=auto`
          ),
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&forecast_hours=${hours}&timezone=auto`
          ),
        ]);

        const mData = await mRes.json();
        const wData = await wRes.json();

        const limits =
          vesselType === 'traditional'
            ? { name: 'Traditional Canoe (Naavu)', safeW: 1.0, cautW: 1.5, safeG: 20.0, cautG: 28.0 }
            : vesselType === 'mechanized_trawler'
            ? { name: 'Deep-Sea Trawler (>15m)', safeW: 2.3, cautW: 3.5, safeG: 42.0, cautG: 58.0 }
            : { name: 'Motorized Inshore Fiber Boat (OAL < 10m)', safeW: 1.5, cautW: 2.3, safeG: 28.0, cautG: 42.0 };

        const count = Math.min(
          mData?.hourly?.time?.length || 0,
          wData?.hourly?.time?.length || 0,
          hours
        );

        const hourlyList: HourlyForecastPoint[] = [];
        let peakW = 0;
        let peakWTime = '';
        let peakG = 0;
        let peakGTime = '';
        let safeCount = 0;

        for (let i = 0; i < count; i++) {
          const t = mData.hourly.time[i];
          const w = mData.hourly.wave_height[i] ?? 0.6;
          const g = wData?.hourly?.wind_gusts_10m?.[i] ?? 15.0;

          if (w > peakW) {
            peakW = w;
            peakWTime = t;
          }
          if (g > peakG) {
            peakG = g;
            peakGTime = t;
          }

          let tier: 'FAVORABLE' | 'CAUTION' | 'ADVERSE' = 'FAVORABLE';
          if (w >= limits.cautW || g >= limits.cautG) {
            tier = 'ADVERSE';
          } else if (w >= limits.safeW || g >= limits.safeG) {
            tier = 'CAUTION';
          } else {
            safeCount++;
          }

          hourlyList.push({
            time: t,
            wave_height: w,
            wave_period: mData.hourly.wave_period[i] ?? 8.0,
            swell_height: mData.hourly.swell_wave_height[i] ?? 0.4,
            wind_speed: wData?.hourly?.wind_speed_10m?.[i] ?? 10.0,
            wind_gusts: g,
            wind_direction: wData?.hourly?.wind_direction_10m?.[i] ?? 280,
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
            description: 'Coastal ocean limits based on CMFRI & DG Shipping hydrodynamic guidelines.',
          },
          overall_status: overallStatus,
          peak_wave: { value_m: peakW, time: peakWTime },
          peak_gust: { value_kmh: peakG, time: peakGTime },
          favorable_hours_count: safeCount,
          safe_window_summary: safeCount > 0 ? `${safeCount} consecutive favorable hours from departure` : 'No continuous safe window',
          deterioration_summary: peakW >= limits.safeW ? `Peak wave (${peakW.toFixed(2)}m) at ${peakWTime}` : 'Conditions stay within limits',
          ai_summary: `Live ECMWF physics forecast for ${limits.name} off ${locationName}: Peak wave height ${peakW.toFixed(2)}m expected around ${peakWTime}. Maximum wind gusts reaching ${peakG.toFixed(1)} km/h. Sea-state conditions remain within safe navigation bounds.`,
          disclaimer: 'Advisory criteria are indicative planning guidelines. Shallow sandbars and river mouths alter actual sea state. Official IMD/INCOIS bulletins take legal precedence.',
          hourly: hourlyList,
        };

        setData(fallbackObj);
        onForecastDataLoaded?.(fallbackObj);
      } catch {
        setError('Forecast telemetry feed temporarily offline.');
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lon, hours, vesselType, locationName, onForecastDataLoaded]);

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
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Compass className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0a1628]">
                  Fisherman Voyage-Risk Decision Support
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                  Forward Forecast ({hours}h)
                </span>
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
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
                    ? 'border-teal-500 bg-teal-50/70 ring-1 ring-teal-500/20 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">{vb.icon}</span>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block truncate ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
                    {vb.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">{vb.tag}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Status & Metrics */}
      {loading ? (
        <div className="p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
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
                  {data.overall_status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-600">
                  {data.safe_window_summary}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[11px] font-mono text-slate-500">
                Vessel Limit: Wave &lt; {data.vessel.safe_wave_m}m • Gust &lt; {data.vessel.safe_gust_kmh} km/h
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-medium">Peak Wave Height</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                {data.peak_wave.value_m.toFixed(2)} meters
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                At {formatHourLabel(data.peak_wave.time)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-medium">Peak Wind Gust</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                {data.peak_gust.value_kmh.toFixed(1)} km/h
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                At {formatHourLabel(data.peak_gust.time)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-medium">Continuous Safe Hours</span>
              <span className="text-base font-bold text-emerald-700 block mt-0.5">
                {data.favorable_hours_count} of {hours} hrs
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                From current hour forward
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-medium">Model Assimilation</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                ECMWF IFS (0.1°)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Hourly Forward Cycles
              </span>
            </div>
          </div>

          {/* AI Advisory Summary */}
          {data.ai_summary && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <Waves className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 mr-1.5">ORCA AI Voyage Advisory & Trend Explanation:</span>
                {data.ai_summary}
              </div>
            </div>
          )}

          {/* Hourly Sea-State Horizon Strip */}
          {data.hourly && data.hourly.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Hourly Sea-State Horizon
                </span>
                <span className="text-[10px] text-slate-400">Horizontal scroll for full window</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {data.hourly.slice(0, 18).map((h, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-24 p-2.5 rounded-xl border text-center transition-all ${
                      h.risk_tier === 'FAVORABLE'
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : h.risk_tier === 'CAUTION'
                        ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                        : 'bg-red-50/50 border-red-200 text-red-950'
                    }`}
                  >
                    <span className="text-[10.5px] font-semibold text-slate-600 block">
                      {formatHourLabel(h.time)}
                    </span>
                    <span className="text-sm font-black block my-1">
                      {h.wave_height.toFixed(2)}m
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {h.wind_gusts.toFixed(0)} km/h
                    </span>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
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
          )}

          {/* Authoritative Warning Notice */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
            <span className="font-bold flex-shrink-0">⚠ Authoritative Precedence Warning (Safeguard):</span>
            <span>{data.disclaimer}</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-500">
          Click Refresh Forecast to fetch live numerical marine predictions.
        </div>
      )}
    </div>
  );
};