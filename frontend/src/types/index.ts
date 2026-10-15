export type WorkspaceType =
  | 'fisherman'
  | 'marine-monitoring'
  | 'protected-areas'
  | 'coastal-authority'
  | 'disaster-management';

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
}

export interface Finding {
  finding_id: string;
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
  workspace: WorkspaceType;
  query: string;
  findings: Finding[];
  limitations: string[];
  verification_summary?: VerificationSummary;
}

export interface InvestigationCreateRequest {
  workspace: WorkspaceType;
  query: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  start_time?: string;
  end_time?: string;
}
