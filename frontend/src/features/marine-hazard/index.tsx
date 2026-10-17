import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  });

  const abortRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);

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

      // Select active regional alert if present (Arabian Sea / Bay of Bengal), otherwise select historical cyclone precedent
      const regionalAlert = alertsRes?.find(
        (a) => a.basin === 'arabian_sea' || a.basin === 'bay_of_bengal' || a.basin === 'north_indian'
      );

      if (regionalAlert) {
        setSelectedEvent(regionalAlert);
        if (regionalAlert.track_points && regionalAlert.track_points.length > 0) {
          setTrackPoints(regionalAlert.track_points);
          const maxW = Math.max(...regionalAlert.track_points.map((p) => p.wind_speed_knots || 0));
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
                : 'Cyclonic Storm'
            );
          }
        }
      } else if (historyRes.items && historyRes.items.length > 0) {
        // Find prominent regional cyclone in the Arabian Sea or use first item
        const regionalCyclone =
          historyRes.items.find(
            (h) => (h.name.toUpperCase().includes('TAUKTAE') || h.basin === 'arabian_sea')
          ) || historyRes.items[0];

        setSelectedEvent(regionalCyclone);
        try {
          const trackRes = await hazardApi.fetchHazardTrack(regionalCyclone.hazard_id);
          setTrackPoints(trackRes.track_points || []);
          if (trackRes.track_points && trackRes.track_points.length > 0) {
            const maxW = Math.max(...trackRes.track_points.map((p) => p.wind_speed_knots || 0));
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
                  : 'Cyclonic Storm'
              );
            }
          }
        } catch {
          // ignore
        }
      } else if (alertsRes && alertsRes.length > 0) {
        setSelectedEvent(alertsRes[0]);
        if (alertsRes[0].track_points && alertsRes[0].track_points.length > 0) {
          setTrackPoints(alertsRes[0].track_points);
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
      hazardType: string
    ) => {
      if (loading) return;
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setActiveParams({
        query,
        lat,
        lon,
        radiusKm,
        timeHorizon,
        hazardType,
        sector:
          lat > 14.2
            ? 'uttara'
            : lat < 13.1
            ? 'dakshina'
            : lat < 13.7
            ? 'udupi'
            : 'statewide',
      });

      setLoading(true);
      setError(null);
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1800));

      try {
        // 1. Fetch latest marine forecast for the sector
        try {
          const marineRes = await hazardApi.fetchMarineForecasts(lat, lon, 0.5, 24);
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
          } else {
            // Live direct query to Open-Meteo Marine API
            const mLive = await fetch(
              `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&forecast_hours=6&timezone=auto`
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
            }
          }
        } catch {
          // keep existing
        }

        // 2. Run agent analysis endpoint
        const resolvedLocName =
          lat > 14.2
            ? 'Karwar / Northern Coastal Shelf'
            : lat < 13.1
            ? 'Mangaluru / Southern Coastal Shelf'
            : lat < 13.7
            ? 'Malpe / Central Coastal Shelf'
            : 'Karnataka Coastal Shelf';

        const analysisRes = await hazardApi.analyzeHazardAgent({
          query,
          latitude: lat,
          longitude: lon,
          location_name: resolvedLocName,
          radius_km: radiusKm,
        });

        if (analysisRes.findings) {
          setFindings(analysisRes.findings);
        }
        if (analysisRes.evidence) {
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
    [loading]
  );

  // Auto-run on mount
  useEffect(() => {
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

  const handleSelectEvent = async (event: HazardEvent) => {
    setSelectedEvent(event);
    try {
      const trackRes = await hazardApi.fetchHazardTrack(event.hazard_id);
      setTrackPoints(trackRes.track_points || []);
      if (trackRes.track_points && trackRes.track_points.length > 0) {
        const maxW = Math.max(...trackRes.track_points.map((p) => p.wind_speed_knots || 0));
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
  };

  return (
    <div className="flex gap-4 min-h-full">
      {/* Main Analysis Column */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Workspace Header */}
        <HazardWorkspaceHeader
          lastUpdated={lastUpdated}
          loading={loading}
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
        />

        {/* Error notification banner */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span className="text-red-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Map + Summary Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <HazardMap
              stormName={selectedEvent?.name || 'Cyclone Precedents & Hazard Registry'}
              stormId={selectedEvent?.hazard_id || 'IBTrACS'}
              basin={selectedEvent?.basin || 'arabian_sea'}
              trackPoints={trackPoints}
              isLoading={loading}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={(idx) => setSelectedPointIndex(idx)}
              source={selectedEvent?.source || 'NOAA IBTrACS'}
              activeAlertCount={liveAlerts.length}
            />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <HazardSummaryCards
              activeAlertsCount={liveAlerts.length}
              totalHistoricalCount={totalHistoricalCount}
              peakWindKnots={peakWindKnots}
              windCategory={windCategory}
              significantWaveHeight={significantWaveHeight}
              douglasState={douglasState}
              loading={loading}
            />
            <HazardConditionBadge
              status={
                liveAlerts.length > 0
                  ? 'ACTIVE GDACS CYCLONE ALERT'
                  : douglasState?.toUpperCase() || 'MODERATE SWELL REGIME'
              }
              regime={
                selectedEvent?.basin?.replace('_', ' ').toUpperCase() ||
                'NORTH INDIAN OCEAN / ARABIAN SEA'
              }
              description={
                liveAlerts.length > 0
                  ? 'Active international disaster warning logged. Monitor statutory IMD/INCOIS advisories.'
                  : significantWaveHeight !== null
                  ? `Current significant wave height ${significantWaveHeight.toFixed(2)}m within safe operating parameters for motorized coastal craft. Local bar shoaling requires vigilance.`
                  : 'Assessing nearshore swell spectra and real-time numerical wave fields for Karnataka Coastal Shelf.'
              }
            />
          </div>
        </div>

        {/* Forward Marine Forecast & Operational Vessel Advisory */}
        {forecastVisible && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <HazardForecastAdvisory
              lat={activeParams.lat}
              lon={activeParams.lon}
              timeRange={activeParams.timeHorizon}
              locationName={
                activeParams.sector === 'statewide'
                  ? 'Karnataka Coastal Shelf'
                  : activeParams.sector === 'uttara'
                  ? 'Uttara Kannada / Karwar Shelf'
                  : activeParams.sector === 'udupi'
                  ? 'Malpe / Udupi Central Shelf'
                  : 'Mangaluru / Dakshina Kannada Shelf'
              }
              onClose={() => setForecastVisible(false)}
            />
          </div>
        )}

        {/* Specialist Agent Chat Panel */}
        <HazardSpecialistChat
          lat={activeParams.lat}
          lon={activeParams.lon}
          locationName={
            activeParams.sector === 'statewide'
              ? 'Karnataka Coastal Shelf'
              : activeParams.sector === 'uttara'
              ? 'Karwar / Northern Shelf'
              : activeParams.sector === 'udupi'
              ? 'Malpe / Central Shelf'
              : 'Mangaluru / Southern Shelf'
          }
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
          activeAlertCount={liveAlerts.length}
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
