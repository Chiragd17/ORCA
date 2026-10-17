import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Waves } from 'lucide-react';
import { hazardApi } from './api';
import {
  HazardEvent,
  HazardTrackPoint,
  FindingItem,
  EvidenceRecordItem,
} from './types';
import {
  HazardWorkspaceHeader,
  HazardControls,
  HazardSummaryCards,
  HazardConditionBadge,
  HazardMap,
  HazardForecastAdvisory,
  HazardSpecialistChat,
  HazardDetailedResults,
  HazardLiveDataStatus,
  HazardRecentAlerts,
  HazardDataProvenance,
  SectorPreset,
} from './components';

export const MarineHazardWorkspace: React.FC = () => {
  const [liveAlerts, setLiveAlerts] = useState<HazardEvent[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<HazardEvent[]>([]);
  const [totalHistoricalCount, setTotalHistoricalCount] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<HazardEvent | null>(null);
  const [trackPoints, setTrackPoints] = useState<HazardTrackPoint[]>([]);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [forecastVisible, setForecastVisible] = useState<boolean>(true);
  const [activeMapLayer, setActiveMapLayer] = useState<'waves' | 'douglas' | 'cyclone'>('waves');

  // Peak metrics for summary cards
  const [peakWindKnots, setPeakWindKnots] = useState<number | null>(null);
  const [windCategory, setWindCategory] = useState<string | null>(null);
  const [significantWaveHeight, setSignificantWaveHeight] = useState<number | null>(null);
  const [douglasState, setDouglasState] = useState<string | null>(null);

  const [activeParams, setActiveParams] = useState({
    query: 'Analyze marine wave conditions, cyclone hazards, and Douglas sea state off Karnataka Coastal Shelf',
    lat: 13.85,
    lon: 74.50,
    radiusKm: 160,
    timeHorizon: 'forecast_7d',
    hazardType: 'all',
    sector: 'statewide',
    presetName: 'Karnataka Coastal Shelf',
    basin: 'arabian_sea',
  });

  const abortRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);

  // Regional Indian Ocean / Arabian Sea active alert count (excludes distant Pacific/Atlantic alerts)
  const regionalAlertCount = React.useMemo(() => {
    return liveAlerts.filter((ev) => {
      const b = (ev.basin || '').toLowerCase();
      if (b === 'arabian_sea' || b === 'bay_of_bengal' || b === 'north_indian') return true;
      if (ev.track_points && ev.track_points.length > 0) {
        const pt = ev.track_points[0];
        if (pt.latitude >= 0 && pt.latitude <= 32 && pt.longitude >= 50 && pt.longitude <= 102) {
          return true;
        }
      }
      return false;
    }).length;
  }, [liveAlerts]);

  // Load initial data (live alerts + historical list)
  const loadInitialData = useCallback(async () => {
    try {
      const [alertsRes, historyRes] = await Promise.all([
        hazardApi.fetchActiveLiveAlerts().catch(() => []),
        hazardApi.fetchHazardList({
          search: '',
          basin: 'all',
          category: 'all',
          sortBy: 'last_observed',
          sortOrder: 'desc',
          page: 1,
          limit: 25,
        }).catch(() => ({ items: [], count: 0, total: 0, page: 1, limit: 25, pages: 1 })),
      ]);

      setLiveAlerts(alertsRes || []);
      setHistoricalEvents(historyRes.items || []);
      setTotalHistoricalCount(historyRes.total ?? historyRes.count ?? 0);

      // Select active regional alert if present (Arabian Sea / Bay of Bengal), otherwise prominent Arabian Sea cyclone
      const regionalAlert = alertsRes?.find(
        (a) => a.basin === 'arabian_sea' || a.basin === 'bay_of_bengal' || a.basin === 'north_indian'
      );

      let initialStorm: HazardEvent | null = regionalAlert || null;

      if (!initialStorm && historyRes.items && historyRes.items.length > 0) {
        initialStorm =
          historyRes.items.find(
            (h) => h.name.toUpperCase().includes('TAUKTAE') || h.hazard_id === 'hz-ibtracs-2021133n10071'
          ) || null;

        if (!initialStorm) {
          const tauktaeRes = await hazardApi.fetchHazardList({ search: 'Tauktae', limit: 1 }).catch(() => ({ items: [] }));
          if (tauktaeRes.items && tauktaeRes.items.length > 0) {
            initialStorm = tauktaeRes.items[0];
          } else {
            initialStorm = historyRes.items.find((h) => h.basin === 'arabian_sea') || historyRes.items[0];
          }
        }
      }

      if (initialStorm) {
        setSelectedEvent(initialStorm);
        try {
          const trackRes = await hazardApi.fetchHazardTrack(initialStorm.hazard_id);
          const pts = trackRes.track_points || [];
          setTrackPoints(pts);
          if (pts.length > 0) {
            const maxW = Math.max(...pts.map((p) => p.wind_speed_knots || 0));
            if (maxW > 0) {
              setPeakWindKnots(maxW);
              setWindCategory(
                maxW >= 120
                  ? 'Super Cyclone'
                  : maxW >= 90
                  ? 'Extremely Severe (ESCS)'
                  : maxW >= 64
                  ? 'Very Severe (VSCS)'
                  : maxW >= 48
                  ? 'Severe (SCS)'
                  : maxW >= 34
                  ? 'Cyclonic Storm'
                  : 'Depression'
              );
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const runHazardAnalysis = useCallback(
    async (
      query: string,
      lat: number,
      lon: number,
      radiusKm: number,
      timeHorizon: string,
      hazardType: string,
      preset?: SectorPreset
    ) => {
      if (loading) return;
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const sectorId =
        preset?.id ||
        (lon > 80
          ? 'bay_of_bengal'
          : lon < 70
          ? 'arabian_deep'
          : lat > 14.2
          ? 'uttara'
          : lat < 13.1
          ? 'dakshina'
          : lat < 13.7
          ? 'udupi'
          : 'statewide');

      const targetBasin = preset?.basin || (lon > 80 ? 'bay_of_bengal' : 'arabian_sea');

      const locName =
        preset?.name ||
        (sectorId === 'bay_of_bengal'
          ? 'Bay of Bengal Basin'
          : sectorId === 'arabian_deep'
          ? 'Arabian Sea Basin'
          : sectorId === 'uttara'
          ? 'Karwar & Northern Shelf'
          : sectorId === 'dakshina'
          ? 'Mangaluru & Southern Shelf'
          : sectorId === 'udupi'
          ? 'Malpe & Central Coastal Shelf'
          : 'Karnataka Coastal Shelf');

      setActiveParams({
        query,
        lat,
        lon,
        radiusKm,
        timeHorizon,
        hazardType,
        sector: sectorId,
        presetName: locName,
        basin: targetBasin,
      });

      setLoading(true);
      setError(null);
      const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

      try {
        // 1. Fetch live Open-Meteo wave conditions for exact coordinates
        try {
          const mLive = await fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period&forecast_hours=6&timezone=auto`
          ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

          if (mLive?.hourly?.wave_height && mLive.hourly.wave_height.length > 0) {
            const hs = mLive.hourly.wave_height[0];
            setSignificantWaveHeight(hs);
            setDouglasState(
              hs < 0.1
                ? 'Calm (Code 0)'
                : hs < 0.5
                ? 'Calm (Code 1)'
                : hs < 1.25
                ? 'Slight (Code 3)'
                : hs < 2.5
                ? 'Moderate (Code 4)'
                : hs < 4.0
                ? 'Rough (Code 5)'
                : hs < 6.0
                ? 'Very Rough (Code 6)'
                : 'High (Code 7+)'
            );
          } else {
            const marineRes = await hazardApi.fetchMarineForecasts(lat, lon, 0.5, 24).catch(() => ({ items: [] }));
            if (marineRes.items && marineRes.items.length > 0) {
              const validWaves = marineRes.items
                .filter((it) => typeof it.wave_height_m === 'number')
                .map((it) => it.wave_height_m as number);

              if (validWaves.length > 0) {
                const hs = validWaves[0];
                setSignificantWaveHeight(hs);
                setDouglasState(
                  hs < 0.1
                    ? 'Calm (Code 0)'
                    : hs < 0.5
                    ? 'Calm (Code 1)'
                    : hs < 1.25
                    ? 'Slight (Code 3)'
                    : hs < 2.5
                    ? 'Moderate (Code 4)'
                    : hs < 4.0
                    ? 'Rough (Code 5)'
                    : hs < 6.0
                    ? 'Very Rough (Code 6)'
                    : 'High (Code 7+)'
                );
              }
            }
          }
        } catch {
          // preserve wave height
        }

        // 2. Dynamic Storm & Track Selection matching sector and horizon
        try {
          let chosenStorm: HazardEvent | null = null;
          const regionalAlert = liveAlerts.find(
            (a) => a.basin === targetBasin || a.basin === 'arabian_sea' || a.basin === 'bay_of_bengal'
          );

          if ((timeHorizon === 'live' || hazardType === 'gdacs') && regionalAlert) {
            chosenStorm = regionalAlert;
          } else if (targetBasin === 'bay_of_bengal') {
            chosenStorm =
              historicalEvents.find(
                (h) => h.basin === 'bay_of_bengal' && (h.name.includes('Ditwah') || h.name.includes('Amphan') || h.name.includes('Senyar'))
              ) ||
              historicalEvents.find((h) => h.basin === 'bay_of_bengal') ||
              null;
            if (!chosenStorm) {
              const bobRes = await hazardApi.fetchHazardList({ basin: 'bay_of_bengal', limit: 5 }).catch(() => ({ items: [] }));
              if (bobRes.items?.length > 0) chosenStorm = bobRes.items[0];
            }
          } else if (sectorId === 'arabian_deep') {
            chosenStorm =
              historicalEvents.find(
                (h) => h.name.includes('Kyarr') || h.name.includes('Gonu') || h.name.includes('Shakhti')
              ) ||
              historicalEvents.find((h) => h.basin === 'arabian_sea') ||
              null;
            if (!chosenStorm) {
              const asRes = await hazardApi.fetchHazardList({ basin: 'arabian_sea', search: 'Kyarr', limit: 5 }).catch(() => ({ items: [] }));
              if (asRes.items?.length > 0) chosenStorm = asRes.items[0];
            }
          } else {
            // Karnataka Coastline (Statewide, Uttara Kannada, Udupi, Dakshina Kannada)
            chosenStorm =
              historicalEvents.find(
                (h) => h.name.toUpperCase().includes('TAUKTAE') || h.hazard_id === 'hz-ibtracs-2021133n10071'
              ) || null;
            if (!chosenStorm) {
              const asRes = await hazardApi.fetchHazardList({ basin: 'arabian_sea', search: 'Tauktae', limit: 1 }).catch(() => ({ items: [] }));
              if (asRes.items?.length > 0) chosenStorm = asRes.items[0];
              else chosenStorm = historicalEvents.find((h) => h.basin === 'arabian_sea') || null;
            }
          }

          if (chosenStorm) {
            setSelectedEvent(chosenStorm);
            const trackRes = await hazardApi.fetchHazardTrack(chosenStorm.hazard_id).catch(() => ({ track_points: [] }));
            const pts = trackRes.track_points || [];
            setTrackPoints(pts);
            if (pts.length > 0) {
              const maxW = Math.max(...pts.map((p) => p.wind_speed_knots || 0));
              setPeakWindKnots(maxW > 0 ? maxW : null);
              setWindCategory(
                maxW >= 120
                  ? 'Super Cyclone'
                  : maxW >= 90
                  ? 'Extremely Severe (ESCS)'
                  : maxW >= 64
                  ? 'Very Severe (VSCS)'
                  : maxW >= 48
                  ? 'Severe (SCS)'
                  : maxW >= 34
                  ? 'Cyclonic Storm'
                  : 'Depression'
              );
            }
          }
        } catch {
          // ignore
        }

        // 3. Run specialist agent analysis endpoint
        const analysisRes = await hazardApi.analyzeHazardAgent({
          query,
          latitude: lat,
          longitude: lon,
          location_name: locName,
          radius_km: radiusKm,
        }).catch(() => null);

        if (analysisRes?.findings) {
          setFindings(analysisRes.findings);
        }
        if (analysisRes?.evidence) {
          setEvidence(analysisRes.evidence);
        }

        await minDelay;
        setLastUpdated(new Date());
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to complete marine hazard analysis.');
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, liveAlerts, historicalEvents]
  );

  // Auto-run on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    loadInitialData();
    runHazardAnalysis(
      'Analyze marine wave conditions, cyclone hazards, and Douglas sea state off Karnataka Coastal Shelf',
      13.85,
      74.50,
      160,
      'forecast_7d',
      'all'
    );
  }, [loadInitialData, runHazardAnalysis]);

  const handleSelectEvent = async (event: HazardEvent, scrollToMap: boolean = false) => {
    setSelectedEvent(event);
    setActiveMapLayer('cyclone');
    try {
      const trackRes = await hazardApi.fetchHazardTrack(event.hazard_id);
      const pts = trackRes.track_points || [];
      setTrackPoints(pts);
      if (pts.length > 0) {
        const maxW = Math.max(...pts.map((p) => p.wind_speed_knots || 0));
        setPeakWindKnots(maxW > 0 ? maxW : null);
        setWindCategory(
          maxW >= 120
            ? 'Super Cyclone'
            : maxW >= 90
            ? 'Extremely Severe (ESCS)'
            : maxW >= 64
            ? 'Very Severe (VSCS)'
            : maxW >= 48
            ? 'Severe (SCS)'
            : maxW >= 34
            ? 'Cyclonic Storm (CS)'
            : 'Depression'
        );
      }
    } catch {
      // keep existing track if fetch fails
    }
    if (scrollToMap) {
      const mapCard = document.getElementById('hazard-map-card');
      if (mapCard) {
        mapCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex gap-4 min-h-full">
      {/* Main Analysis Column */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Workspace Header */}
        <HazardWorkspaceHeader
          lastUpdated={lastUpdated}
          loading={loading}
          forecastVisible={forecastVisible}
          onToggleForecast={() => setForecastVisible((v) => !v)}
          onRefresh={() => {
            loadInitialData();
            runHazardAnalysis(
              activeParams.query,
              activeParams.lat,
              activeParams.lon,
              activeParams.radiusKm,
              activeParams.timeHorizon,
              activeParams.hazardType
            );
          }}
        />

        {/* Control Parameter Bar */}
        <HazardControls
          onRunAnalysis={runHazardAnalysis}
          loading={loading}
          forecastVisible={forecastVisible}
          onToggleForecast={() => setForecastVisible((v) => !v)}
        />

        {/* Error notification banner */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span className="text-red-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Forward Marine Forecast & Operational Vessel Advisory - Primary Prominence */}
        {forecastVisible ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <HazardForecastAdvisory
              lat={activeParams.lat}
              lon={activeParams.lon}
              timeRange={activeParams.timeHorizon}
              locationName={activeParams.presetName}
              onClose={() => setForecastVisible(false)}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#d8e4f0] shadow-xs text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-[#0a1628] text-sm">
                  <span>Forward Marine Forecast & Vessel Risk Advisory</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Live Feed Available
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  High-resolution numerical wave spectra (ECMWF IFS Model) and 24h operational vessel limits are available.
                </p>
              </div>
            </div>
            <button
              onClick={() => setForecastVisible(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold shadow-xs flex items-center gap-2 cursor-pointer text-xs transition-all hover:scale-[1.02]"
            >
              <Waves className="w-4 h-4" />
              <span>Open Forecast Advisory</span>
            </button>
          </div>
        )}

        {/* Main Map + Summary Cards Row */}
        <div id="hazard-map-card" className="grid grid-cols-1 lg:grid-cols-5 gap-4 scroll-mt-4">
          <div className="lg:col-span-3">
            <HazardMap
              stormName={selectedEvent?.name || 'Cyclone Precedents & Hazard Registry'}
              stormId={selectedEvent?.hazard_id || 'IBTrACS'}
              basin={selectedEvent?.basin || activeParams.basin}
              trackPoints={trackPoints}
              isLoading={loading}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={(idx) => setSelectedPointIndex(idx)}
              source={selectedEvent?.source || 'NOAA IBTrACS'}
              activeAlertCount={regionalAlertCount}
              centerLat={activeParams.lat}
              centerLon={activeParams.lon}
              sectorName={activeParams.presetName}
              radiusKm={activeParams.radiusKm}
              significantWaveHeight={significantWaveHeight}
              douglasState={douglasState}
              activeLayer={activeMapLayer}
              onLayerChange={setActiveMapLayer}
            />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <HazardSummaryCards
              activeAlertsCount={regionalAlertCount}
              totalHistoricalCount={totalHistoricalCount}
              peakWindKnots={peakWindKnots}
              windCategory={windCategory}
              significantWaveHeight={significantWaveHeight}
              douglasState={douglasState}
              loading={loading}
            />
            <HazardConditionBadge
              status={
                selectedEvent?.status === 'active'
                  ? `ACTIVE GDACS CYCLONE ALERT: ${selectedEvent.name.toUpperCase()}`
                  : douglasState
                  ? `${douglasState.toUpperCase()} SWELL REGIME`
                  : 'NOMINAL SWELL REGIME'
              }
              regime={
                activeParams.sector === 'bay_of_bengal'
                  ? 'BAY OF BENGAL BASIN'
                  : activeParams.sector === 'arabian_deep'
                  ? 'OFFSHORE ARABIAN SEA'
                  : activeParams.sector === 'uttara'
                  ? 'UTTARA KANNADA (KARWAR)'
                  : activeParams.sector === 'udupi'
                  ? 'UDUPI (MALPE SHELF)'
                  : activeParams.sector === 'dakshina'
                  ? 'DAKSHINA KANNADA (MANGALURU)'
                  : 'KARNATAKA COASTAL SHELF'
              }
              description={
                selectedEvent?.status === 'active'
                  ? `Active international disaster warning logged (${selectedEvent.name}). Monitor statutory IMD/INCOIS advisories.`
                  : significantWaveHeight !== null
                  ? `Live significant wave height ${significantWaveHeight.toFixed(2)}m off ${activeParams.presetName}. ${
                      selectedEvent ? `Historical precedent: ${selectedEvent.name}${peakWindKnots ? ` (${peakWindKnots.toFixed(0)} kts peak wind)` : ''}.` : ''
                    } Normal coastal craft operations within safe operating limits.`
                  : 'Assessing nearshore swell spectra and real-time numerical wave fields for Karnataka Coastal Shelf.'
              }
            />
          </div>
        </div>

        {/* Specialist Agent Chat Panel */}
        <HazardSpecialistChat
          lat={activeParams.lat}
          lon={activeParams.lon}
          locationName={activeParams.presetName}
        />

        {/* Detailed Results with Tabs */}
        <HazardDetailedResults
          historicalEvents={historicalEvents}
          selectedEvent={selectedEvent}
          trackPoints={trackPoints}
          findings={findings}
          evidence={evidence}
          loading={loading}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Right Intelligence Rail */}
      <div className="hidden xl:block w-[340px] flex-shrink-0 space-y-4">
        <HazardLiveDataStatus
          loading={loading}
          activeAlertCount={regionalAlertCount}
          significantWaveHeight={significantWaveHeight}
          douglasState={douglasState}
          peakWindKnots={peakWindKnots}
          sectorName={activeParams.presetName}
          centerLat={activeParams.lat}
          centerLon={activeParams.lon}
          onRefresh={() => {
            loadInitialData();
            runHazardAnalysis(
              activeParams.query,
              activeParams.lat,
              activeParams.lon,
              activeParams.radiusKm,
              activeParams.timeHorizon,
              activeParams.hazardType
            );
          }}
        />
        <HazardRecentAlerts
          liveAlerts={liveAlerts}
          historicalEvents={historicalEvents}
          onSelectEvent={handleSelectEvent}
        />
        <HazardDataProvenance evidence={evidence} />
      </div>
    </div>
  );
};

export default MarineHazardWorkspace;
