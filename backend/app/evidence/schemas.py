from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class VerificationState(str, Enum):
    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    NEEDS_REVIEW = "needs_review"
    CONFLICTING = "conflicting"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class EvidenceRecord(BaseModel):
    """Pydantic model representing a verifiable evidence record."""
    evidence_id: str = Field(..., description="Unique deterministic identifier for the evidence")
    source_name: str = Field(..., description="Provider or dataset name, e.g. Open-Meteo Marine")
    source_url: Optional[str] = Field(None, description="Direct URL or provider endpoint used")
    source_identifier: str = Field(..., description="Unique record/variable identifier within source")
    observation_time: Optional[datetime] = Field(None, description="Observation or forecast valid time in UTC")
    retrieval_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Retrieval time in UTC")
    latitude: Optional[float] = Field(None, description="WGS84 latitude")
    longitude: Optional[float] = Field(None, description="WGS84 longitude")
    data_type: str = Field(..., description="Category: sst, wave_height, wind_speed, cyclone_track, population")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="Raw provider payload or subset")
    units: Dict[str, str] = Field(default_factory=dict, description="Measurement units mapping")
    dataset_metadata: Dict[str, Any] = Field(default_factory=dict, description="Dataset version, model, resolution")
    hash: Optional[str] = Field(None, description="SHA256 checksum of raw payload")


class FindingVerification(BaseModel):
    finding_id: str
    state: VerificationState
    supporting_evidence_ids: List[str]
    missing_evidence_ids: List[str] = Field(default_factory=list)
    reproduced_calculation: Optional[bool] = None
    notes: Optional[str] = None


class VerificationSummary(BaseModel):
    investigation_id: str
    overall_status: VerificationState
    verified_findings_count: int
    unverified_findings_count: int
    flagged_findings_count: int
    details: List[FindingVerification] = Field(default_factory=list)
    notes: Optional[str] = None
