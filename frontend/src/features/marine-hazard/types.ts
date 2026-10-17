export interface HazardTrackPoint {
  time: string;
  latitude: number;
  longitude: number;
  wind_speed_knots: number | null;
  pressure_hpa: number | null;
  category: string | null;
  is_forecast: boolean;
}

export interface HazardEvent {
  hazard_id: string;
  name: string;
  type: string;
  source: string;
  basin: string | null;
  status: string;
  first_observed: string | null;
  last_observed: string | null;
  track_points: HazardTrackPoint[];
  metadata_json?: {
    alert_level?: string;
    alert_score?: number;
    country?: string;
    gdacs_event_id?: string;
    severity_kmh?: number;
    severity_knots?: number;
    severity_text?: string;
    report_url?: string;
    source_updated_at?: string;
    retrieval_timestamp_utc?: string;
    [key: string]: any;
  };
}

export interface GDACSSyncResponse {
  status: "success" | "partial" | "failed" | "empty";
  retrieved_count: number;
  validated_count: number;
  inserted_count: number;
  updated_count: number;
  unchanged_count: number;
  rejected_count: number;
  retrieval_timestamp_utc: string;
  message: string;
}

export interface GDACSStatusResponse {
  provider: string;
  is_healthy: boolean;
  freshness: "fresh" | "stale" | "unavailable" | "unknown";
  last_sync_utc: string | null;
  last_attempt_utc?: string | null;
  last_attempt_status?: string | null;
  active_alerts_count: number;
  is_fallback: boolean;
  latest_event_id?: string | null;
  latest_event_name?: string | null;
  message: string | null;
}

export interface MarineProviderStatusResponse {
  provider: string;
  is_healthy: boolean;
  freshness: "fresh" | "stale" | "unavailable" | "unknown";
  last_sync_utc: string | null;
  last_attempt_utc: string | null;
  last_attempt_status: string | null;
  total_persisted_points: number;
  is_fallback: boolean;
  message: string | null;
}

export interface CycloneProviderStatusResponse {
  provider: string;
  is_healthy: boolean;
  freshness: "fresh" | "stale" | "unavailable" | "unknown";
  last_sync_utc: string | null;
  last_attempt_utc: string | null;
  last_attempt_status: string | null;
  active_runs_count: number;
  total_positions_count: number;
  geographic_coverage: string;
  is_fallback: boolean;
  message: string | null;
}

export interface HazardListResponse {
  count: number;
  items: HazardEvent[];
  total?: number;
  page: number;
  limit: number;
  pages: number;
}

export interface HazardTrackResponse {
  hazard_id: string;
  name: string;
  count: number;
  track_points: HazardTrackPoint[];
}

export interface HazardStatsResponse {
  hazard_id: string;
  name: string;
  basin: string | null;
  source: string;
  status: string;
  track_points_count: number;
  max_wind_knots: number | null;
  min_pressure_hpa: number | null;
  categories_observed: string[];
  first_observed: string | null;
  last_observed: string | null;
}

export interface HazardFilterState {
  search: string;
  basin: string;
  category: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

export interface MarineForecastItem {
  id: string;
  provider: string;
  model: string;
  latitude: number;
  longitude: number;
  valid_time: string;
  wave_height_m: number | null;
  wave_period_s: number | null;
  wave_direction_deg: number | null;
  wind_wave_height_m: number | null;
  swell_wave_height_m: number | null;
  retrieval_time: string;
  source_url: string;
  metadata?: Record<string, any>;
}

export interface MarineForecastResponse {
  count: number;
  latitude: number;
  longitude: number;
  provider: string;
  model: string;
  freshness?: "fresh" | "stale" | "unavailable" | "unknown";
  is_fallback?: boolean;
  last_retrieved_utc?: string | null;
  items: MarineForecastItem[];
}

export interface MarineForecastSyncRequest {
  latitude: number;
  longitude: number;
  forecast_days?: number;
}

export interface MarineForecastSyncResponse {
  status: "success" | "partial" | "failed";
  provider: string;
  latitude: number;
  longitude: number;
  retrieved_count: number;
  inserted_count: number;
  updated_count: number;
  unchanged_count: number;
  failed_count: number;
  message: string;
}

export interface CycloneForecastPositionItem {
  id: string;
  lead_time_hours: number;
  valid_time: string;
  latitude: number;
  longitude: number;
  max_wind_knots: number | null;
  wind_gusts_knots: number | null;
  min_pressure_hpa: number | null;
  classification: string | null;
  stage_description: string | null;
}

export interface CycloneForecastRunItem {
  id: string;
  storm_id: string;
  storm_name: string;
  basin: string;
  provider: string;
  advisory_number: string;
  issue_time: string;
  retrieval_time: string;
  source_url: string;
  positions_count: number;
  positions: CycloneForecastPositionItem[];
}

export interface CycloneForecastRunListResponse {
  count: number;
  freshness?: "fresh" | "stale" | "unavailable" | "unknown";
  is_fallback?: boolean;
  geographic_coverage?: string;
  items: CycloneForecastRunItem[];
}

export interface CycloneForecastSyncResponse {
  status: "success" | "partial" | "failed";
  provider: string;
  retrieved_runs_count: number;
  inserted_runs_count: number;
  updated_runs_count: number;
  inserted_positions_count: number;
  updated_positions_count: number;
  failed_count: number;
  message: string;
}

export interface EvidenceRecordItem {
  id: string;
  dataset_id: string;
  source_name: string;
  source_url?: string | null;
  retrieval_time: string;
  observation_time?: string | null;
  valid_until_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverage_area?: string | null;
  variable: string;
  value: any;
  unit: string;
  quality_flag?: string | null;
  license?: string | null;
  metadata?: Record<string, any>;
}

export interface FindingItem {
  id: string;
  claim: string;
  value?: any;
  unit?: string | null;
  evidence_ids: string[];
  uncertainty?: string | null;
  is_forecast: boolean;
  observation_time?: string | null;
  metadata?: Record<string, any>;
}

export interface HazardAgentAnalysisRequest {
  query: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  location_name?: string;
  radius_km?: number;
  intent?: string;
  parameters?: Record<string, any>;
}

export interface HazardAgentAnalysisResponse {
  investigation_id: string;
  agent_id: string;
  status: "completed" | "partial" | "unavailable" | "failed";
  executive_summary: string;
  target_location: {
    latitude: number | null;
    longitude: number | null;
    name: string | null;
    radius_km?: number | null;
  };
  findings: FindingItem[];
  evidence: EvidenceRecordItem[];
  limitations: string[];
  errors: string[];
  generated_at_utc: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  evidence_ids?: string[];
  provider?: string | null;
  model?: string | null;
}

export interface HazardAgentChatRequest {
  message: string;
  conversation_id?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_km?: number | null;
  force_live_refresh?: boolean;
  use_custom_coordinates?: boolean;
}

export interface DecisionResult {
  intent: string;
  requested_location?: string | null;
  resolved_location: string;
  coordinates: number[];
  time_range: string;
  required_sources: string[];
  cache_policy: string;
  refresh_required: boolean;
  freshness_requirements: Record<string, string>;
  reasoning_summary: string;
}

export interface HazardAgentChatResponse {
  conversation_id: string;
  message: string;
  provider_used: string;
  model_used: string;
  is_fallback: boolean;
  provider_attempted?: string | null;
  fallback_reason?: string | null;
  synthesis_source?: "llm" | "deterministic_rule_engine";
  trace_id?: string | null;
  target_location: {
    latitude: number | null;
    longitude: number | null;
    name: string | null;
    radius_km?: number | null;
  };
  decision?: DecisionResult;
  tool_executions: Array<{
    tool: string;
    arguments: Record<string, any>;
    status: string;
    summary?: any;
    findings_count?: number;
    evidence_count?: number;
  }>;
  findings: FindingItem[];
  evidence: EvidenceRecordItem[];
  limitations: string[];
  created_at_utc: string;
}
