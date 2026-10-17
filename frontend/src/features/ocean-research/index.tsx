import React, { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import {
  OceanResearchData,
  Investigation,
  EvidenceRecord,
  Finding,
  OceanStation,
} from '../../types';
import {
  OceanWorkspaceHeader,
  ResearchControls,
  OceanMap,
  OceanSummaryCards,
  OceanConditionBadge,
  SstAnalysisChart,
  SstAnomalyChart,
  OceanHydrodynamicsChart,
  OceanDetailedResults,
  OceanLiveDataStatus,
  OceanRecentFindings,
  OceanDataProvenance,
  OceanForecastAdvisory,
} from './components';

export const OceanResearchWorkspace: React.FC = () => {
  const [researchData, setResearchData] = useState<OceanResearchData | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedStation, setSelectedStation] = useState<OceanStation | null>(null);
  const [forecastVisible, setForecastVisible] = useState<boolean>(true);

  const [activeParams, setActiveParams] = useState({
    query: 'Analyze sea surface temperature, wave dynamics, and ocean currents off Karnataka Coastal Shelf across 7-day forecast horizon against ERA5 climatological baseline.',
    lat: 13.85,
    lon: 74.50,
    radiusKm: 160,
    timeHorizon: 'forecast_7d',
    sector: 'statewide',
  });

  const abortRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);

  const runOceanResearch = useCallback(
    async (
      query: string,
      lat: number,
      lon: number,
      radiusKm: number,
      timeHorizon: string
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
        sector:
          lat > 14.2
            ? 'uttara_kannada'
            : lat < 13.1
            ? 'dakshina_kannada'
            : lat < 13.7
            ? 'udupi'
            : 'statewide',
      });

      if (timeHorizon === 'forecast_7d') {
        setForecastVisible(true);
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch deterministic oceanographic research package
        const marineResponse = await apiClient.getMarineResearch({
          lat,
          lon,
          radius_km: radiusKm,
          time_horizon: timeHorizon,
        });

        setResearchData(marineResponse);

        // 2. Concurrently create/link persisted investigation in Postgres
        try {
          const invResp = await apiClient.createInvestigation({
            workspace: 'marine_monitoring',
            query,
            latitude: lat,
            longitude: lon,
            radius_km: radiusKm,
          });

          const [invDetails, invEvidence] = await Promise.all([
            apiClient.getInvestigation(invResp.investigation_id),
            apiClient.getInvestigationEvidence(invResp.investigation_id),
          ]);

          setInvestigation(invDetails);

          // Combine evidence from research package & database investigation
          const combinedEvidence = [...(marineResponse.evidence || [])];
          for (const ev of invEvidence) {
            if (!combinedEvidence.some((e) => e.evidence_id === ev.evidence_id)) {
              combinedEvidence.push(ev);
            }
          }
          setEvidence(combinedEvidence);

          // Combine findings: strictly ensure oceanographic purity and filter out any coastal hazard contamination
          const isOceanClaim = (claim: string) => {
            const lower = (claim || '').toLowerCase();
            return !lower.includes('settlement') &&
              !lower.includes('healthcare') &&
              !lower.includes('hospital') &&
              !lower.includes('port/harbour facility') &&
              !lower.includes('hazard footprint') &&
              !lower.includes('residents across');
          };

          const combinedFindings = [...(marineResponse.findings || [])];
          for (const f of invDetails.findings || []) {
            if (isOceanClaim(f.claim) && !combinedFindings.some((existing) => (existing.finding_id && existing.finding_id === f.finding_id) || (existing.id && existing.id === f.id))) {
              combinedFindings.push(f);
            }
          }
          setFindings(combinedFindings);
        } catch {
          // If investigation creation has network glitch, use the direct marineResponse findings/evidence
          setEvidence(marineResponse.evidence || []);
          setFindings(marineResponse.findings || []);
        }

        setLastUpdated(new Date());
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to execute oceanographic research analysis.');
        }
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // Auto-run Karnataka coastal ocean research on initial page open
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    runOceanResearch(
      'Analyze sea surface temperature, wave dynamics, and ocean currents off Karnataka Coastal Shelf across 7-day forecast horizon against ERA5 climatological baseline.',
      13.85,
      74.50,
      160,
      'forecast_7d'
    );
  }, [runOceanResearch]);

  return (
    <div className="flex gap-4 min-h-full">
      {/* Main scientific analysis area */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Workspace Header */}
        <OceanWorkspaceHeader
          lastUpdated={lastUpdated}
          loading={loading}
          onRefresh={() => {
            runOceanResearch(
              activeParams.query,
              activeParams.lat,
              activeParams.lon,
              activeParams.radiusKm,
              activeParams.timeHorizon
            );
          }}
        />

        {/* Research Parameter Panel */}
        <ResearchControls
          onRunAnalysis={runOceanResearch}
          loading={loading}
        />

        {/* Error notification banner */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span className="text-red-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Map + Scientific Summary Area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <OceanMap
              stations={researchData?.stations || []}
              loading={loading}
              radiusKm={activeParams.radiusKm}
              center={[activeParams.lon, activeParams.lat]}
              selectedStationId={selectedStation?.id}
              onSelectStation={(st) => setSelectedStation(st)}
            />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <OceanSummaryCards
              summary={researchData?.summary || null}
              loading={loading}
            />
            <OceanConditionBadge
              status={researchData?.summary?.scientific_status || researchData?.summary?.thermal_regime || 'OPTIMAL'}
              regime={
                researchData?.summary?.active_regime ||
                researchData?.summary?.circulation_regime ||
                'Equatorward coastal jet (West India Coastal Current)'
              }
              description={
                researchData?.summary?.regime_description ||
                researchData?.summary?.anomaly_description ||
                'Sea surface temperature within ±0.3°C of 30-year ERA5 climatological baseline.'
              }
            />
          </div>
        </div>

        {/* Forward Marine Forecast & Operational Vessel Advisory - Displayed ONLY when '7-Day Marine Forecast' option is selected */}
        {activeParams.timeHorizon === 'forecast_7d' && forecastVisible && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <OceanForecastAdvisory
              lat={activeParams.lat}
              lon={activeParams.lon}
              timeRange={activeParams.timeHorizon}
              locationName={
                activeParams.sector === 'statewide'
                  ? 'Karnataka Coastal Shelf'
                  : activeParams.sector === 'uttara_kannada'
                  ? 'Uttara Kannada / Karwar Shelf'
                  : activeParams.sector === 'udupi'
                  ? 'Malpe / Udupi Central Shelf'
                  : activeParams.sector === 'dakshina_kannada'
                  ? 'Mangaluru / Dakshina Kannada Shelf'
                  : 'Karnataka Coastal Waters'
              }
              onClose={() => setForecastVisible(false)}
            />
          </div>
        )}

        {/* Analytics Row - Scientific Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SstAnalysisChart
            timeSeries={researchData?.time_series || []}
            loading={loading}
          />
          <SstAnomalyChart
            timeSeries={researchData?.time_series || []}
            loading={loading}
            baselineTemp={researchData?.summary?.baseline_sst ?? researchData?.summary?.baseline_sst_c ?? 29.2}
          />
          <OceanHydrodynamicsChart
            timeSeries={researchData?.time_series || []}
            loading={loading}
          />
        </div>

        {/* Detailed Oceanographic Results */}
        <OceanDetailedResults
          observations={researchData?.observations || []}
          findings={findings}
          evidence={evidence}
          limitations={researchData?.limitations || investigation?.limitations || []}
          loading={loading}
        />
      </div>

      {/* Right Intelligence Rail */}
      <div className="hidden xl:block w-[340px] flex-shrink-0 space-y-4">
        <OceanLiveDataStatus
          evidence={evidence}
          summary={researchData?.summary || null}
          onRefresh={() => {
            runOceanResearch(
              activeParams.query,
              activeParams.lat,
              activeParams.lon,
              activeParams.radiusKm,
              activeParams.timeHorizon
            );
          }}
          loading={loading}
        />
        <OceanRecentFindings
          findings={findings}
          evidence={evidence}
        />
        <OceanDataProvenance evidence={evidence} />
      </div>
    </div>
  );
};

export default OceanResearchWorkspace;
