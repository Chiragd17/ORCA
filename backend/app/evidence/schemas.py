from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, model_validator


class VerificationState(str, Enum):
    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    NEEDS_REVIEW = "needs_review"
    CONFLICTING = "conflicting"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class EvidenceRecord(BaseModel):
    """Pydantic model representing a verifiable evidence record."""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra="allow",
    )

    evidence_id: str = Field(..., alias="id", description="Unique deterministic identifier for the evidence")
    source_name: str = Field(..., description="Provider or dataset name, e.g. Open-Meteo Marine")
    source_url: Optional[str] = Field(None, alias="source_uri", description="Direct URL or provider endpoint used")
    source_identifier: str = Field(default="", description="Unique record/variable identifier within source")
    observation_time: Optional[datetime] = Field(None, description="Observation or forecast valid time in UTC")
    retrieval_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Retrieval time in UTC")
    latitude: Optional[float] = Field(None, description="WGS84 latitude")
    longitude: Optional[float] = Field(None, description="WGS84 longitude")
    data_type: str = Field(..., description="Category: sst, wave_height, wind_speed, cyclone_track, population")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="Raw provider payload or subset")
    units: Dict[str, str] = Field(default_factory=dict, description="Measurement units mapping")
    dataset_metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata", description="Dataset version, model, resolution")
    hash: Optional[str] = Field(None, description="SHA256 checksum of raw payload")

    # Person 1 compatibility fields
    value: Optional[Any] = Field(None, description="Raw observation or structured measurement value")
    unit: Optional[str] = Field(None, description="Unit of measurement (e.g. °C, m, m/s, knots)")

    @model_validator(mode="before")
    @classmethod
    def _unify_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map id -> evidence_id
            if "id" in data and "evidence_id" not in data:
                data["evidence_id"] = data["id"]
            elif "evidence_id" in data and "id" not in data:
                data["id"] = data["evidence_id"]

            # Map source_uri -> source_url and source_identifier
            if "source_uri" in data:
                if "source_url" not in data or not data["source_url"]:
                    data["source_url"] = data["source_uri"]
                if "source_identifier" not in data or not data["source_identifier"]:
                    data["source_identifier"] = str(data["source_uri"])
            elif "source_identifier" not in data:
                data["source_identifier"] = data.get("source_url") or data.get("source_name") or "unknown"

            # Map metadata -> dataset_metadata
            if "metadata" in data and "dataset_metadata" not in data:
                data["dataset_metadata"] = data["metadata"]
            elif "dataset_metadata" in data and "metadata" not in data:
                data["metadata"] = data["dataset_metadata"]

            # Synchronize value and unit with raw_data and units
            raw_data = data.setdefault("raw_data", {})
            if "value" in data and data["value"] is not None and "value" not in raw_data:
                raw_data["value"] = data["value"]
            if "unit" in data and data["unit"] is not None:
                units = data.setdefault("units", {})
                if data.get("data_type") and data["data_type"] not in units:
                    units[data["data_type"]] = str(data["unit"])
        elif hasattr(data, "__dict__"):
            d = dict(data.__dict__)
            return cls._unify_fields(d)
        return data

    @property
    def id(self) -> str:
        return self.evidence_id

    @property
    def source_uri(self) -> str:
        return self.source_url or self.source_identifier

    @property
    def metadata(self) -> Dict[str, Any]:
        return self.dataset_metadata


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
