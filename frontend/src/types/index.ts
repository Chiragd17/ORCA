export type WorkspaceType =
  | 'fisherman'
  | 'marine-monitoring'
  | 'protected-areas'
  | 'coastal-authority'
  | 'disaster-management'
  | 'coastal-risk';

export type VerificationState =
  | 'verified'
  | 'unverified'
  | 'needs_review'
  | 'conflicting'
  | 'insufficient_evidence';

export interface EvidenceRecord {
  evidence_id: string;
  source_name: string;
  source_url?: string;
  source_identifier: string;
  observation_time?: string;
  retrieval_time: string;
  latitude?: number;
  longitude?: number;
  data_type: string;
  raw_data?: Record<string, any>;
  units?: Record<string, string>;
  dataset_metadata?: Record<string, any>;
  hash?: string;
  payload_hash?: string;
}

export interface Finding {
  finding_id: string;
  id?: string;
  claim: string;
  value?: number;
  unit?: string;
  evidence_ids: string[];
  uncertainty?: string;
  is_forecast: boolean;
  verification_state: VerificationState;
  confidence_score?: number;
}

export interface ExecutionEvent {
  event_id?: string;
  investigation_id: string;
  timestamp: string;
  event_type: string;
  agent_id?: string;
  details?: Record<string, any>;
}

export interface VerificationSummary {
  investigation_id: string;
  overall_status: VerificationState;
  verified_findings_count: number;
  unverified_findings_count: number;
  flagged_findings_count: number;
  notes?: string;
}

export interface Investigation {
  investigation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  workspace: string;
  query: string;
  findings: Finding[];
  limitations: string[];
  verification_summary?: VerificationSummary;
}

export interface InvestigationCreateRequest {
  workspace: string;
  query: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  start_time?: string;
  end_time?: string;
}

// Coastal risk specific types
export interface CoastalFeature {
  id: string;
  name: string;
  feature_type: 'settlement' | 'port' | 'hospital' | 'mangrove' | 'protected_area';
  latitude: number;
  longitude: number;
  estimated_population?: number | null;
  description?: string;
  census_year?: number | null;
  source_identifier?: string;
  geojson_geometry?: {
    type: string;
    coordinates: any;
  };
}

export interface LiveDataSource {
  name: string;
  category: string;
  status: 'connected' | 'stale' | 'failed' | 'not_configured' | 'unknown';
  lastUpdate?: string;
  details?: string;
}

export interface RiskSummary {
  affectedSettlements: number;
  estimatedPopulation: number;
  portFacilities: number;
  protectedAreas: number;
  healthcareFacilities: number;
  totalFeatures: number;
  riskLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  riskDescription: string;
}

export interface CoastalFinding {
  name: string;
  type: string;
  status: 'intersecting' | 'near_risk' | 'safe' | 'unknown';
  population?: number | null;
  distanceKm?: number;
  evidenceId?: string;
}

export interface OceanStation {
  id: string;
  name: string;
  sector: string;
  latitude: number;
  longitude: number;
  latest_sst: number;
  wave_height: number;
  current_speed: number;
  status: 'active' | 'nominal' | 'advisory';
  timestamp: string;
}

export interface OceanTimeSeriesPoint {
  time: string;
  sst: number;
  sst_c?: number;
  baseline_sst: number;
  baseline_sst_c?: number;
  sst_anomaly: number;
  sst_anomaly_c?: number;
  wave_height: number;
  wave_height_m?: number;
  wave_period: number;
  current_velocity: number;
  current_velocity_ms?: number;
  current_direction: number;
  current_direction_deg?: number;
  chlorophyll: number;
}

export interface OceanObservationRecord {
  id: string;
  variable: string;
  station_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  observation_time?: string;
  value: number;
  unit: string;
  units?: string;
  provider: string;
  quality_flag: string;
  evidence_id: string;
}

export interface OceanSummary {
  latest_sst: number;
  latest_sst_c?: number;
  baseline_sst: number;
  baseline_sst_c?: number;
  sst_anomaly: number;
  anomaly_classification: string;
  wave_height_mean: number;
  wave_height_peak: number;
  latest_wave_height_m?: number;
  swell_period_mean: number;
  current_velocity_mean: number;
  latest_current_velocity_ms?: number;
  current_direction_degrees: number;
  latest_current_direction_deg?: number;
  chlorophyll_proxy_mg_m3: number;
  active_regime: string;
  thermal_regime?: string;
  circulation_regime?: string;
  scientific_status: string;
  regime_description: string;
  anomaly_description?: string;
  total_observations: number;
  verified_evidence_count: number;
}

export interface OceanResearchData {
  summary: OceanSummary;
  stations: OceanStation[];
  time_series: OceanTimeSeriesPoint[];
  observations: OceanObservationRecord[];
  evidence: EvidenceRecord[];
  findings?: Finding[];
  limitations: string[];
  data_nature: string;
  source_info: Record<string, any>;
}

