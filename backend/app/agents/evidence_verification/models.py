from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class ClaimType(str, Enum):
    DIRECT_OBSERVATION = "direct_observation"
    OBSERVATION = "direct_observation"
    DERIVED_MEASUREMENT = "derived_measurement"
    CALCULATION = "derived_measurement"
    FORECAST = "forecast"
    HISTORICAL_RECORD = "historical_record"
    SPATIAL_EXPOSURE = "spatial_exposure"
    RISK_ASSESSMENT = "risk_assessment"
    SCIENTIFIC_INTERPRETATION = "scientific_interpretation"
    INTERPRETATION = "scientific_interpretation"
    CAUSAL_CLAIM = "causal_claim"
    CAUSAL = "causal_claim"
    RECOMMENDATION = "recommendation"
    UNSUPPORTED = "unsupported"


class VerificationStatus(str, Enum):
    """Claim-level standardized verification status vocabulary."""
    MATCHED = "matched"
    UNMET = "unmet"
    POTENTIAL_GAP = "potential_gap"
    UNVERIFIED = "unverified"
    CONFLICTING = "conflicting"
    NEEDS_REVIEW = "needs_review"


class CheckOutcome(str, Enum):
    """Deterministic individual check outcome."""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


class CheckCategory(str, Enum):
    PROVENANCE = "provenance"
    SCHEMA_QUALITY = "schema_quality"
    TEMPORAL = "temporal"
    UNITS = "units"
    CALCULATION = "calculation"
    SPATIAL = "spatial"
    CROSS_SOURCE = "cross_source"
    SCIENTIFIC_REASONING = "scientific_reasoning"
    UNCERTAINTY = "uncertainty"


class CheckResult(BaseModel):
    """Result of an individual deterministic check."""
    model_config = ConfigDict(extra="allow")

    check_code: str
    check_name: str
    category: CheckCategory
    outcome: CheckOutcome
    explanation: str
    details: Dict[str, Any] = Field(default_factory=dict)


class VerificationFinding(BaseModel):
    """Structured material finding or conflict identified during verification."""
    model_config = ConfigDict(extra="allow")

    finding_code: str
    severity: str = "medium"  # low, medium, high, critical
    claim_id: str
    evidence_ids: List[str] = Field(default_factory=list)
    explanation: str
    checks_performed: List[str] = Field(default_factory=list)
    recommended_action: str
    resolution_status: str = "open"
    competing_values: Optional[Dict[str, Any]] = None


class NormalizedClaim(BaseModel):
    """Normalized claim structure evaluated by the scientific verification engine."""
    model_config = ConfigDict(extra="allow")

    claim_id: str
    original_text: str
    claim_type: ClaimType = ClaimType.DIRECT_OBSERVATION
    producer_agent: str = "unknown"
    execution_id: Optional[str] = None
    evidence_ids: List[str] = Field(default_factory=list)
    numerical_value: Optional[float] = None
    unit: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    temporal_scope: Optional[str] = None
    status: VerificationStatus = VerificationStatus.UNVERIFIED
    reason: str = "Verification pending"
    check_results: List[CheckResult] = Field(default_factory=list)
    findings: List[VerificationFinding] = Field(default_factory=list)
    reproduced_calculation: Optional[Dict[str, Any]] = None
    uncertainty: Optional[str] = None
    verified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VerificationRun(BaseModel):
    """Execution record of a verification evaluation session."""
    model_config = ConfigDict(extra="allow")

    run_id: str
    investigation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    overall_status: str = "completed"
    overall_scientific_state: VerificationStatus = VerificationStatus.UNVERIFIED
    total_claims: int = 0
    matched_count: int = 0
    unverified_count: int = 0
    conflicting_count: int = 0
    needs_review_count: int = 0
    potential_gap_count: int = 0
    unmet_count: int = 0
    checks_completed: int = 0
    checks_failed: int = 0
    checks_skipped: int = 0
    claims: List[NormalizedClaim] = Field(default_factory=list)
    findings: List[VerificationFinding] = Field(default_factory=list)
    evidence_count: int = 0
    limitations: List[str] = Field(default_factory=list)
