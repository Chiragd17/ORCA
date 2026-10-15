from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.evidence.schemas import EvidenceRecord, VerificationState


class AgentStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"


class InvestigationTask(BaseModel):
    """Investigation task dispatched to a specialist agent."""
    investigation_id: str = Field(..., description="Unique investigation identifier")
    workspace: str = Field(..., description="Active workspace e.g. fisherman, marine_monitoring")
    query: str = Field(..., description="Query or sub-task prompt")
    latitude: Optional[float] = Field(None, description="Target WGS84 latitude")
    longitude: Optional[float] = Field(None, description="Target WGS84 longitude")
    radius_km: Optional[float] = Field(None, description="Target geographic radius in km")
    start_time: Optional[datetime] = Field(None, description="Start of temporal scope (UTC)")
    end_time: Optional[datetime] = Field(None, description="End of temporal scope (UTC)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Domain-specific parameters")


class Finding(BaseModel):
    """Atomic finding or measurement produced by an agent."""
    finding_id: str = Field(..., description="Stable unique finding identifier")
    claim: str = Field(..., description="Clear scientific or observational claim")
    value: Optional[float] = Field(None, description="Measurement value if applicable")
    unit: Optional[str] = Field(None, description="Physical unit e.g. °C, m, m/s, knots")
    evidence_ids: List[str] = Field(default_factory=list, description="List of supporting evidence record IDs")
    uncertainty: Optional[str] = Field(None, description="Uncertainty bounds or methodological limitations")
    is_forecast: bool = Field(False, description="Whether this finding is a forecast vs historical observation")
    verification_state: VerificationState = Field(VerificationState.UNVERIFIED, description="Verification status")


class AgentResult(BaseModel):
    """Standardized output returned by every specialist agent."""
    agent_id: str = Field(..., description="Specialist agent identifier")
    status: AgentStatus = Field(..., description="Execution status")
    findings: List[Finding] = Field(default_factory=list, description="List of generated findings")
    evidence: List[EvidenceRecord] = Field(default_factory=list, description="Evidence records collected")
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
