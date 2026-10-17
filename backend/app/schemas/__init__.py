from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.agents.base import Finding
from app.evidence.schemas import EvidenceRecord, VerificationSummary


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str


class ObservationItem(BaseModel):
    timestamp: datetime
    variable: str
    value: float
    unit: str
    source: str
    evidence_id: Optional[str] = None


class MarineObservationsResponse(BaseModel):
    location: Dict[str, float]
    temporal_coverage: Dict[str, Optional[datetime]]
    observations: List[ObservationItem]


class HazardTrackPoint(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    wind_speed_kts: Optional[float] = None
    pressure_mb: Optional[float] = None


class HazardItem(BaseModel):
    hazard_id: str
    name: str
    hazard_type: str
    basin: Optional[str] = None
    status: str
    first_detected: Optional[datetime] = None
    last_detected: Optional[datetime] = None
    tracks: List[HazardTrackPoint] = Field(default_factory=list)


class HazardsListResponse(BaseModel):
    count: int
    hazards: List[HazardItem]


class InvestigationCreateRequest(BaseModel):
    workspace: str = Field(..., description="Active workspace: fisherman, marine_monitoring, etc.")
    query: str = Field(..., description="Investigation prompt or question")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class InvestigationCreateResponse(BaseModel):
    investigation_id: str
    status: str
    workspace: str
    created_at: datetime
    planned_agents: List[str]


class InvestigationDetailResponse(BaseModel):
    investigation_id: str
    status: str
    workspace: str
    query: str
    findings: List[Any] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    verification_summary: Optional[VerificationSummary] = None
