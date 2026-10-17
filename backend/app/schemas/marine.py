from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.evidence import EvidenceRecord, Finding


class MarineObservationPoint(BaseModel):
    time: datetime
    latitude: float
    longitude: float
    sea_surface_temperature_celsius: float | None = None
    wave_height_meters: float | None = None
    wave_period_seconds: float | None = None
    wave_direction_degrees: float | None = None
    ocean_current_velocity_mps: float | None = None
    ocean_current_direction_degrees: float | None = None
    wind_speed_knots: float | None = None
    wind_direction_degrees: float | None = None
    chlorophyll_mg_m3: float | None = None

class MarineObservationResponse(BaseModel):
    latitude: float
    longitude: float
    source: str
    observations: list[MarineObservationPoint]
    evidence: list[EvidenceRecord] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class OceanStation(BaseModel):
    id: str
    name: str
    sector: str
    latitude: float
    longitude: float
    latest_sst: float
    wave_height: float
    current_speed: float
    status: str = "active"
    timestamp: str


class OceanTimeSeriesPoint(BaseModel):
    time: str
    sst: float
    baseline_sst: float
    sst_anomaly: float
    wave_height: float
    wave_period: float
    current_velocity: float
    current_direction: float
    chlorophyll: float


class OceanObservationRecord(BaseModel):
    id: str
    variable: str
    station_name: str
    latitude: float
    longitude: float
    timestamp: str
    value: float
    unit: str
    provider: str
    quality_flag: str = "GOOD"
    evidence_id: str


class OceanSummary(BaseModel):
    latest_sst: float
    baseline_sst: float
    sst_anomaly: float
    anomaly_classification: str
    wave_height_mean: float
    wave_height_peak: float
    swell_period_mean: float
    current_velocity_mean: float
    current_direction_degrees: float
    chlorophyll_proxy_mg_m3: float
    active_regime: str
    scientific_status: str
    regime_description: str
    total_observations: int
    verified_evidence_count: int


class OceanResearchResponse(BaseModel):
    summary: OceanSummary
    stations: list[OceanStation]
    time_series: list[OceanTimeSeriesPoint]
    observations: list[OceanObservationRecord]
    findings: list[Finding] = Field(default_factory=list)
    evidence: list[EvidenceRecord] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    data_nature: str
    source_info: dict = Field(default_factory=dict)

