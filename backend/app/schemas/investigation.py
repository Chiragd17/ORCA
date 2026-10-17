from datetime import datetime
from enum import Enum
from typing import Any

from app.schemas.evidence import EvidenceRecord, Finding
from pydantic import BaseModel, Field


class AgentExecutionStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"


class EventType(str, Enum):
    INVESTIGATION_STARTED = "investigation_started"
    AGENT_STARTED = "agent_started"
    TOOL_COMPLETED = "tool_completed"
    EVIDENCE_ADDED = "evidence_added"
    AGENT_COMPLETED = "agent_completed"
    VERIFICATION_FAILED = "verification_failed"
    VERIFICATION_PASSED = "verification_passed"
    INVESTIGATION_COMPLETED = "investigation_completed"


class LocationContext(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    name: str | None = None
    radius_km: float | None = 50.0


class TimeWindow(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None


class InvestigationTask(BaseModel):
    investigation_id: str
    workspace: str
    query: str
    location: LocationContext | None = None
    time_window: TimeWindow | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    agent_id: str
    status: AgentExecutionStatus
    findings: list[Finding] = Field(default_factory=list)
    evidence: list[EvidenceRecord] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class InvestigationCreate(BaseModel):
    workspace: str = Field(
        ...,
        description="Target workspace: fisherman, marine_monitoring, protected_areas, coastal_authority, disaster_management",
    )
    query: str = Field(..., min_length=3, description="User investigation question")
    location: LocationContext | None = None
    time_window: TimeWindow | None = None
    preferred_agents: list[str] | None = None


class InvestigationCreateResponse(BaseModel):
    investigation_id: str
    status: str
    workspace: str
    created_at: datetime
    message: str


class ExecutionEvent(BaseModel):
    id: str
    investigation_id: str
    agent_id: str | None = None
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime
