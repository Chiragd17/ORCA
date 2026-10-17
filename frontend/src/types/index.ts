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
