from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.evidence import EvidenceRecord, Finding


class HazardTrackPoint(BaseModel):
    time: datetime
    latitude: float
    longitude: float
    wind_speed_knots: float | None = None
    pressure_hpa: float | None = None
    category: str | None = None
    is_forecast: bool = False


class HazardRead(BaseModel):
    hazard_id: str
    name: str
    type: str
    source: str
    basin: str | None = None
    status: str
    first_observed: datetime | None = None
    last_observed: datetime | None = None
    track_points: list[HazardTrackPoint] = Field(default_factory=list)
    metadata_json: dict | None = Field(default_factory=dict)


class HazardListResponse(BaseModel):
    count: int
    items: list[HazardRead]
    total: int | None = None
    page: int = 1
    limit: int = 20
    pages: int = 1


class HazardTrackResponse(BaseModel):
    hazard_id: str
    name: str
    count: int
    track_points: list[HazardTrackPoint]


class HazardQueryFilter(BaseModel):
    hazard_type: str | None = None
    basin: str | None = None
    active_only: bool = False
    limit: int = Field(20, ge=1, le=100)
    page: int = Field(1, ge=1)
    search: str | None = None
    sort_by: str = "last_observed"
    sort_order: str = "desc"


class GDACSSyncResponse(BaseModel):
    status: str  # success, partial, failed, empty
    retrieved_count: int
    validated_count: int
    inserted_count: int
    updated_count: int
    unchanged_count: int
    rejected_count: int
    retrieval_timestamp_utc: datetime
    message: str


class GDACSStatusResponse(BaseModel):
    provider: str = "GDACS"
    is_healthy: bool
    freshness: str = "unknown"
    last_sync_utc: datetime | None = None
    last_sync_status: str | None = None
    last_attempt_utc: datetime | None = None
    last_attempt_status: str | None = None
    active_alerts_count: int = 0
    is_fallback: bool = False
    message: str | None = None


class HazardAgentAnalysisRequest(BaseModel):
    query: str = Field(
        ..., min_length=2, description="Natural language question or analysis request"
    )
    latitude: float | None = Field(
        None, ge=-90.0, le=90.0, description="Optional target latitude"
    )
    longitude: float | None = Field(
        None, ge=-180.0, le=180.0, description="Optional target longitude"
    )
    location_name: str | None = Field(
        None, description="Optional regional location name e.g. Mumbai, Mangaluru"
    )
    location: str | None = Field(None, description="Optional alias for location_name")
    radius_km: float | None = Field(
        50.0, ge=1.0, le=1000.0, description="Analysis search radius in km"
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional execution parameters or intent overrides",
    )


class HazardAgentAnalysisResponse(BaseModel):
    investigation_id: str
    agent_id: str = "marine_hazard"
    status: str
    executive_summary: str
    target_location: dict[str, Any]
    findings: list[Finding]
    evidence: list[EvidenceRecord]
    limitations: list[str]
    errors: list[str]
    generated_at_utc: datetime


class ChatMessage(BaseModel):
    role: str = Field(..., description="user, assistant, system, or tool")
    content: str
    timestamp: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    provider: str | None = None
    model: str | None = None


class HazardAgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt or follow-up question")
    conversation_id: str | None = Field(
        None, description="Existing conversation session ID for follow-up turns"
    )
    location: str | None = Field(None, description="Target location name e.g. Mangaluru, Mumbai")
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)
    radius_km: float | None = Field(50.0, ge=1.0, le=1000.0)
    force_live_refresh: bool = Field(
        False, description="Whether to trigger on-demand live provider sync"
    )
    use_custom_coordinates: bool = Field(
        False, description="Whether explicit custom latitude/longitude should override regional geocoding"
    )


class DecisionResult(BaseModel):
    intent: str = Field(
        ...,
        description="Classified intent: current_conditions, forecast, active_hazards, historical_event, historical_trend, comparison, data_freshness, or ambiguous",
    )
    requested_location: str | None = Field(
        None, description="Location explicitly extracted from the current message, if any"
    )
    resolved_location: str = Field(
        ..., description="Normalized location name used for data queries"
    )
    coordinates: list[float] = Field(
        ..., description="Target coordinates [latitude, longitude]"
    )
    time_range: str = Field(
        ..., description="Applicable temporal horizon (e.g. current, next_24h, next_72h, historical_archive)"
    )
    required_sources: list[str] = Field(
        default_factory=list,
        description="List of required data provider/archive sources for this intent",
    )
    cache_policy: str = Field(
        ..., description="Cache permission and freshness rule (e.g. allow_fresh_cache_12h, require_historical_archive)"
    )
    refresh_required: bool = Field(
        False, description="Whether an external API refresh is required"
    )
    freshness_requirements: dict[str, str] = Field(
        default_factory=dict,
        description="Source-specific maximum permissible data age thresholds",
    )
    reasoning_summary: str = Field(
        ..., description="Concise, user-safe explanation of the selected data strategy"
    )


class HazardAgentChatResponse(BaseModel):
    conversation_id: str
    message: str
    provider_used: str
    model_used: str
    is_fallback: bool
    provider_attempted: str | None = None
    fallback_reason: str | None = None
    synthesis_source: str = "llm"
    trace_id: str | None = None
    target_location: dict[str, Any]
    decision: DecisionResult | None = None
    tool_executions: list[dict[str, Any]] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    evidence: list[EvidenceRecord] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    created_at_utc: datetime
