export type VerificationStatus =
  | 'matched'
  | 'unmet'
  | 'potential_gap'
  | 'unverified'
  | 'conflicting'
  | 'needs_review';

export type CheckOutcome = 'passed' | 'failed' | 'skipped' | 'error';

export type CheckCategory =
  | 'provenance'
  | 'schema_quality'
  | 'temporal'
  | 'units'
  | 'calculation'
  | 'spatial'
  | 'cross_source'
  | 'scientific_reasoning'
  | 'uncertainty';

export interface CheckResult {
  check_code: string;
  check_name: string;
  category: CheckCategory;
  outcome: CheckOutcome;
  explanation: string;
  details?: Record<string, any>;
}

export interface VerificationFinding {
  finding_code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  claim_id: string;
  evidence_ids: string[];
  explanation: string;
  checks_performed: string[];
  recommended_action: string;
  resolution_status: string;
  competing_values?: Record<string, any>;
}

export interface NormalizedClaim {
  claim_id: string;
  original_text: string;
  claim_type: string;
  producer_agent: string;
  execution_id?: string;
  evidence_ids: string[];
  numerical_value?: number | null;
  unit?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  temporal_scope?: string | null;
  status: VerificationStatus;
  reason: string;
  check_results: CheckResult[];
  findings: VerificationFinding[];
  reproduced_calculation?: Record<string, any> | null;
  uncertainty?: string | null;
  verified_at: string;
}

export interface VerificationRun {
  run_id: string;
  investigation_id?: string | null;
  timestamp: string;
  overall_status: string;
  overall_scientific_state: VerificationStatus;
  total_claims: number;
  matched_count: number;
  unverified_count: number;
  conflicting_count: number;
  needs_review_count: number;
  potential_gap_count: number;
  unmet_count: number;
  checks_completed: number;
  checks_failed: number;
  checks_skipped: number;
  claims: NormalizedClaim[];
  findings: VerificationFinding[];
  evidence_count: number;
  limitations: string[];
}

export interface VerificationSummaryData {
  claims_assessed: number;
  supported_claims: number;
  unverified_claims: number;
  material_conflicts: number;
  findings_requiring_review: number;
  potential_gap_claims: number;
  unmet_claims: number;
  evidence_records_examined: number;
  checks_completed: number;
  checks_failed: number;
  checks_skipped: number;
  most_recent_execution?: {
    run_id?: string;
    timestamp?: string;
    overall_scientific_state: VerificationStatus;
    overall_status: string;
  };
  status_distribution: { name: string; value: number; color: string }[];
  checks_by_category: { category: string; checks: number; status: string; passed: boolean }[];
}

export interface EvidenceItem {
  evidence_id: string;
  id?: string;
  source_name: string;
  source_url?: string;
  source_identifier?: string;
  observation_time?: string;
  retrieval_time?: string;
  latitude?: number;
  longitude?: number;
  data_type: string;
  value?: any;
  unit?: string;
  raw_data?: Record<string, any>;
  hash?: string;
}
