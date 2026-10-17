export interface AgentRegistryItem {
  agent_id: string;
  title: string;
  role: string;
  status: string;
  capabilities: string[];
  assigned_role: string;
  registered: boolean;
}

export interface OrchestratorStats {
  total_investigations: number;
  completed_count: number;
  partial_count: number;
  registered_agents_count: number;
  verification_pass_rate_percent: number;
  storage_tier_primary: string;
}

export interface PlanStep {
  step_id: string;
  agent_id: string;
  agent_name: string;
  phase: 'specialist_concurrent' | 'specialist_dependent' | 'scientific_auditor';
  dependencies: string[];
  description: string;
  timeout_seconds: number;
  max_retries: number;
}

export interface ExecutionPlan {
  plan_id: string;
  workspace: string;
  query: string;
  normalized_intent: string;
  target_coordinates: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };
  target_time_horizon: string;
  steps: PlanStep[];
  selected_agents: string[];
  verification_required: boolean;
}

export interface ExecutionEventItem {
  id?: string;
  event_id?: string;
  event_type: string;
  agent_id?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SpecialistFinding {
  id: string;
  finding_id?: string;
  claim: string;
  value?: number;
  unit?: string;
  category?: string;
  evidence_ids?: string[];
  verification_state: string;
  uncertainty?: string;
  is_forecast?: boolean;
  metadata?: Record<string, any>;
}

export interface EvidenceRecordItem {
  id?: string;
  evidence_id?: string;
  source_name: string;
  source_identifier?: string;
  source_url?: string;
  observation_time?: string;
  latitude?: number;
  longitude?: number;
  data_type: string;
  hash: string;
  raw_payload?: Record<string, any>;
}

export interface DiscrepancyItem {
  id: string;
  type: string;
  severity: string;
  description: string;
  action: string;
}

export interface EnrichedInvestigationDetail {
  investigation_id: string;
  status: string;
  workspace: string;
  query: string;
  findings: SpecialistFinding[];
  evidence: EvidenceRecordItem[];
  limitations: string[];
  verification_summary?: {
    overall_status: string;
    verified?: number;
    conflicting?: number;
    unverified?: number;
    insufficient_evidence?: number;
    total_claims?: number;
    [key: string]: any;
  };
  plan?: ExecutionPlan;
  events: ExecutionEventItem[];
  final_answer?: string;
  discrepancies: DiscrepancyItem[];
  storage_tier: string;
  created_at?: string;
  completed_at?: string;
}

export interface InvestigationListItem {
  investigation_id: string;
  status: string;
  workspace: string;
  query: string;
  created_at: string;
  completed_at?: string;
  planned_agents: string[];
  findings_count: number;
  storage_tier: string;
}
