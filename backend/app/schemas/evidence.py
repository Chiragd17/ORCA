from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field

class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    NEEDS_REVIEW = "needs_review"
    CONFLICTING = "conflicting"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"

class FindingCategory(str, Enum):
    OBSERVATION = "observation"
    FORECAST = "forecast"
    HISTORICAL_RECORD = "historical_record"
    DETERMINISTIC_CALCULATION = "deterministic_calculation"
    AI_INTERPRETATION = "ai_interpretation"

from app.evidence.schemas import EvidenceRecord

class Finding(BaseModel):
    id: Optional[str] = None
    claim: str = Field(..., description="Clear assertional statement or measurement claim")
    value: Optional[Any] = Field(None, description="Observed or derived numerical or categorical value")
    unit: Optional[str] = Field(None, description="Physical unit of value")
    category: FindingCategory = Field(default=FindingCategory.OBSERVATION)
    evidence_ids: List[str] = Field(default_factory=list, description="List of supporting EvidenceRecord IDs")
    uncertainty: Optional[str] = Field(None, description="Methodological or instrument uncertainty")
    verification_status: VerificationStatus = Field(default=VerificationStatus.UNVERIFIED)

    @property
    def verification_state(self) -> str:
        return str(self.verification_status.value if hasattr(self.verification_status, "value") else self.verification_status)

    @property
    def finding_id(self) -> str:
        return self.id or "fnd-unknown"
