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
    verification_state: Optional[str] = Field(default="unverified", description="String-serialized verification state for orchestrator compatibility")

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
            
            # Sync verification_state and verification_status
            if "verification_state" in data and ("verification_status" not in data or not data["verification_status"]):
                raw = str(data["verification_state"]).lower()
                data["verification_status"] = VerificationStatus(raw) if raw in VerificationStatus._value2member_map_ else VerificationStatus.UNVERIFIED
                data["verification_state"] = raw
            elif "verification_status" in data and ("verification_state" not in data or not data["verification_state"]):
                raw = data["verification_status"]
                val = raw.value if hasattr(raw, "value") else str(raw)
                data["verification_state"] = str(val).lower()
                if isinstance(raw, str) and raw in VerificationStatus._value2member_map_:
                    data["verification_status"] = VerificationStatus(raw)
            elif not data.get("verification_state"):
                data["verification_state"] = "unverified"
        elif hasattr(data, "__dict__"):
            d = dict(data.__dict__)
            return cls._unify_finding(d)
        return data
