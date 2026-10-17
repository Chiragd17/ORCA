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

from pydantic import BaseModel, Field, ConfigDict, model_validator

class Finding(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    id: Optional[str] = None
    finding_id: Optional[str] = None
    claim: str = Field(..., description="Clear assertional statement or measurement claim")
    value: Optional[Any] = Field(None, description="Observed or derived numerical or categorical value")
    unit: Optional[str] = Field(None, description="Physical unit of value")
    category: FindingCategory = Field(default=FindingCategory.OBSERVATION)
    evidence_ids: List[str] = Field(default_factory=list, description="List of supporting EvidenceRecord IDs")
    uncertainty: Optional[str] = Field(None, description="Methodological or instrument uncertainty")
    verification_status: VerificationStatus = Field(default=VerificationStatus.UNVERIFIED)

    @model_validator(mode="before")
    @classmethod
    def _unify_finding(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "id" in data and ("finding_id" not in data or not data["finding_id"]):
                data["finding_id"] = data["id"]
            elif "finding_id" in data and ("id" not in data or not data["id"]):
                data["id"] = data["finding_id"]
            if not data.get("finding_id"):
                data["finding_id"] = "fnd-unknown"
                data["id"] = "fnd-unknown"
        elif hasattr(data, "__dict__"):
            d = dict(data.__dict__)
            return cls._unify_finding(d)
        return data

    @property
    def verification_state(self) -> str:
        return str(self.verification_status.value if hasattr(self.verification_status, "value") else self.verification_status)
