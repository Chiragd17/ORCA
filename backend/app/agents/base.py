from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.evidence.schemas import EvidenceRecord, VerificationState


class AgentStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"


class InvestigationTask(BaseModel):
    """Investigation task dispatched to a specialist agent."""
    investigation_id: str = Field(..., description="Unique investigation identifier")
    workspace: Any = Field(..., description="Active workspace e.g. fisherman, marine_monitoring")
    query: Optional[str] = Field(None, description="Query or sub-task prompt")
    prompt: Optional[str] = Field(None, description="Alternative alias for query")
    latitude: Optional[float] = Field(None, description="Target WGS84 latitude")
    longitude: Optional[float] = Field(None, description="Target WGS84 longitude")
    radius_km: Optional[float] = Field(None, description="Target geographic radius in km")
    start_time: Optional[datetime] = Field(None, description="Start of temporal scope (UTC)")
    end_time: Optional[datetime] = Field(None, description="End of temporal scope (UTC)")
    target_time: Optional[datetime] = Field(None, description="Target timestamp (UTC)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Domain-specific parameters")
    context: Dict[str, Any] = Field(default_factory=dict, description="Alternative alias for parameters/context")

    def __init__(self, **data: Any):
        # Sync prompt and query
        if "prompt" in data and ("query" not in data or data["query"] is None):
            data["query"] = data["prompt"]
        elif "query" in data and ("prompt" not in data or data["prompt"] is None):
            data["prompt"] = data["query"]
        elif "query" not in data and "prompt" not in data:
            data["query"] = ""
            data["prompt"] = ""

        # Sync context and parameters
        if "context" in data and ("parameters" not in data or not data["parameters"]):
            data["parameters"] = data["context"]
        elif "parameters" in data and ("context" not in data or not data["context"]):
            data["context"] = data["parameters"]

        super().__init__(**data)


class Finding(BaseModel):
    """Atomic finding or measurement produced by an agent."""
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    finding_id: Optional[str] = Field(None, description="Stable unique finding identifier")
    id: Optional[str] = Field(None, description="Alternative alias for finding_id")
    claim: str = Field(..., description="Clear scientific or observational claim")
    value: Optional[float] = Field(None, description="Measurement value if applicable")
    unit: Optional[str] = Field(None, description="Physical unit e.g. °C, m, m/s, knots")
    category: Optional[Any] = Field(None, description="Category of finding")
    evidence_ids: List[str] = Field(default_factory=list, description="List of supporting evidence record IDs")
    uncertainty: Optional[str] = Field(None, description="Uncertainty bounds or methodological limitations")
    is_forecast: bool = Field(False, description="Whether this finding is a forecast vs historical observation")
    verification_state: VerificationState = Field(VerificationState.UNVERIFIED, description="Verification status")
    verification_status: Optional[Any] = Field(None, description="Alternative alias for verification_state")

    @model_validator(mode="before")
    @classmethod
    def _unify_ids(cls, data: Any) -> Any:
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
            return cls._unify_ids(d)
        return data


class AgentResult(BaseModel):
    """Standardized output returned by every specialist agent."""
    agent_id: str = Field(..., description="Specialist agent identifier")
    status: AgentStatus = Field(..., description="Execution status")
    findings: List[Any] = Field(default_factory=list, description="List of generated findings")
    evidence: List[Any] = Field(default_factory=list, description="Evidence records collected")
    limitations: List[str] = Field(default_factory=list, description="Documented data gaps or limitations")
    errors: List[str] = Field(default_factory=list, description="Errors or provider failure notices")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional agent runtime metadata")


class BaseAgent(ABC):
    """Mandatory shared base class for all four ORCA specialist agents."""
    agent_id: str
    name: str
    description: str

    @abstractmethod
    async def run(self, task: InvestigationTask) -> AgentResult:
        """Execute agent analysis for the given investigation task."""
        pass
