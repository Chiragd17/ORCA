from datetime import datetime

from pydantic import BaseModel, Field


class MarineForecastItem(BaseModel):
    id: str
    provider: str
    model: str
    latitude: float
    longitude: float
    valid_time: datetime
    wave_height_m: float | None = None
    wave_period_s: float | None = None
    wave_direction_deg: float | None = None
    wind_wave_height_m: float | None = None
    swell_wave_height_m: float | None = None
    retrieval_time: datetime
    source_url: str
    metadata: dict | None = None


class MarineForecastResponse(BaseModel):
    count: int
    latitude: float
    longitude: float
    provider: str
    model: str
    freshness: str = "unknown"
    is_fallback: bool = False
    last_retrieved_utc: datetime | None = None
    items: list[MarineForecastItem]


class MarineProviderStatusResponse(BaseModel):
    provider: str = "open-meteo-marine"
    is_healthy: bool
    freshness: str = "unknown"
    last_sync_utc: datetime | None = None
    last_attempt_utc: datetime | None = None
    last_attempt_status: str | None = None
    total_persisted_points: int = 0
    is_fallback: bool = False
    message: str | None = None


class MarineForecastSyncRequest(BaseModel):
    latitude: float = Field(
        ..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"
    )
    longitude: float = Field(
        ..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"
    )
    forecast_days: int = Field(
        3, ge=1, le=7, description="Forecast horizon in days (1 to 7)"
    )


class MarineForecastSyncResponse(BaseModel):
    status: str
    message: str
    latitude: float
    longitude: float
    retrieved_points: int
    inserted_points: int
    updated_points: int
    retrieval_time_utc: datetime


class CycloneForecastPositionItem(BaseModel):
    id: str
    lead_time_hours: int
    valid_time: datetime
    latitude: float
    longitude: float
    max_wind_knots: float | None = None
    wind_gusts_knots: float | None = None
    min_pressure_hpa: float | None = None
    classification: str | None = None
    stage_description: str | None = None


class CycloneForecastRunItem(BaseModel):
    id: str
    storm_id: str
    storm_name: str
    basin: str
    provider: str
    advisory_number: str
    issue_time: datetime
    retrieval_time: datetime
    source_url: str
    positions_count: int = 0
    positions: list[CycloneForecastPositionItem] = []


class CycloneForecastRunListResponse(BaseModel):
    count: int
    freshness: str = "unknown"
    is_fallback: bool = False
    geographic_coverage: str = "eastern_pacific, north_atlantic, central_pacific (Note: Does not cover Indian Ocean)"
    items: list[CycloneForecastRunItem]


class CycloneProviderStatusResponse(BaseModel):
    provider: str = "NOAA NHC"
    is_healthy: bool
    freshness: str = "unknown"
    last_sync_utc: datetime | None = None
    last_attempt_utc: datetime | None = None
    last_attempt_status: str | None = None
    active_runs_count: int = 0
    total_positions_count: int = 0
    geographic_coverage: str = "eastern_pacific, north_atlantic, central_pacific (Note: Does not cover Indian Ocean)"
    is_fallback: bool = False
    message: str | None = None


class CycloneForecastSyncResponse(BaseModel):
    status: str
    message: str
    runs_retrieved: int
    runs_inserted: int
    runs_updated: int
    positions_persisted: int
    retrieval_time_utc: datetime
