import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any
from sqlalchemy import (
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class DataSource(Base, TimestampMixin):
    """External or curated data source catalog."""
    __tablename__ = "data_sources"
    __table_args__ = ({"extend_existing": True},)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(128), default="Open-Meteo", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    base_url: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    license: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    license_info: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    update_frequency: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    observations: Mapped[List["MarineObservation"]] = relationship(back_populates="source", cascade="all, delete-orphan")
    hazard_events: Mapped[List["HazardEvent"]] = relationship(back_populates="source", cascade="all, delete-orphan")
    evidence_records: Mapped[List["EvidenceRecordModel"]] = relationship(back_populates="source", cascade="all, delete-orphan")


class MarineObservation(Base, TimestampMixin):
    """Physical or oceanographic observation/forecast points."""
    __tablename__ = "marine_observations"
    __table_args__ = (
        Index("idx_marine_obs_loc_time", "latitude", "longitude", "observation_time"),
        Index("idx_marine_obs_var_time", "variable", "observation_time"),
        UniqueConstraint(
            "source_id",
            "observation_time",
            "latitude",
            "longitude",
            name="uq_marine_obs_source_time_lat_lon",
        ),
        {"extend_existing": True},
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(ForeignKey("data_sources.id"), index=True, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    observation_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    retrieval_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    variable: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    quality_flag: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_forecast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Wide physical oceanographic variables with explicit physical units
    sea_surface_temperature_celsius: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wave_height_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wave_period_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wave_direction_degrees: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ocean_current_velocity_mps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ocean_current_direction_degrees: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_speed_knots: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_direction_degrees: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    chlorophyll_mg_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    source: Mapped["DataSource"] = relationship(back_populates="observations")


class HazardEvent(Base, TimestampMixin):
    """Cyclones, tsunamis, storm surges, or coastal flooding events."""
    __tablename__ = "hazard_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(ForeignKey("data_sources.id"), index=True, nullable=False)
    external_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    hazard_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    basin: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="historical", nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    source: Mapped["DataSource"] = relationship(back_populates="hazard_events")
    tracks: Mapped[List["HazardTrack"]] = relationship(back_populates="hazard_event", cascade="all, delete-orphan")


class HazardTrack(Base):
    """Point along a cyclone or hazard track."""
    __tablename__ = "hazard_tracks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    hazard_event_id: Mapped[str] = mapped_column(ForeignKey("hazard_events.id"), index=True, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    wind_speed_kts: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    central_pressure_mb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_forecast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    hazard_event: Mapped["HazardEvent"] = relationship(back_populates="tracks")

    __table_args__ = (
        Index("idx_hazard_track_event_time", "hazard_event_id", "timestamp"),
    )


class CoastalFeature(Base, TimestampMixin):
    """Coastal settlements, critical infrastructure, boundaries, and protected areas."""
    __tablename__ = "coastal_features"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    feature_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    geojson_geometry: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    estimated_population: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source_id: Mapped[Optional[str]] = mapped_column(ForeignKey("data_sources.id"), nullable=True)


class EvidenceRecordModel(Base, TimestampMixin):
    """Fine-grained records of evidence supporting agent findings."""
    __tablename__ = "evidence_records"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    source_id: Mapped[Optional[str]] = mapped_column(ForeignKey("data_sources.id"), nullable=True)
    source_identifier: Mapped[str] = mapped_column(String(256), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    observation_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieval_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    data_type: Mapped[str] = mapped_column(String(64), nullable=False)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)

    source: Mapped[Optional["DataSource"]] = relationship(back_populates="evidence_records")


class Investigation(Base, TimestampMixin):
    """Multi-agent investigation request lifecycle."""
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True, nullable=False)
    plan: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    findings: Mapped[List["InvestigationFinding"]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    events: Mapped[List["InvestigationEvent"]] = relationship(back_populates="investigation", cascade="all, delete-orphan")


class InvestigationFinding(Base, TimestampMixin):
    """Findings/claims produced by agents linked to an investigation."""
    __tablename__ = "investigation_findings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True, nullable=False)
    agent_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    claim: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    evidence_ids: Mapped[List[str]] = mapped_column(JSON, default=list)
    verification_state: Mapped[str] = mapped_column(String(32), default="unverified", nullable=False)
    uncertainty_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    investigation: Mapped["Investigation"] = relationship(back_populates="findings")


class InvestigationEvent(Base):
    """Traceable execution events emitted by the orchestrator."""
    __tablename__ = "investigation_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    agent_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    investigation: Mapped["Investigation"] = relationship(back_populates="events")

    __table_args__ = (
        Index("idx_investigation_events_order", "investigation_id", "timestamp"),
    )
