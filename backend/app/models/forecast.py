from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.hazard_base import HazardBase


class MarineForecast(HazardBase):
    """Hourly wave and sea condition forecasts from Open-Meteo Marine API."""

    __tablename__ = "marine_forecasts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(
        String(64), nullable=False, default="open-meteo-marine"
    )
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="standard")
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    valid_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Core Wave & Sea Physics
    wave_height_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    wave_period_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    wave_direction_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_wave_height_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    swell_wave_height_m: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Provenance & Metadata
    retrieval_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    source_url: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "latitude",
            "longitude",
            "valid_time",
            name="uq_marine_forecast_loc_time",
        ),
        Index("ix_marine_forecast_loc_time", "latitude", "longitude", "valid_time"),
        Index("ix_marine_forecast_valid_time", "valid_time"),
    )


class CycloneForecastRun(HazardBase):
    """An official cyclone forecast advisory run issued by an authoritative warning center (e.g. NOAA NHC/JTWC)."""

    __tablename__ = "cyclone_forecast_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    storm_id: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # e.g. ep212026 or cross-linked GDACS id
    storm_name: Mapped[str] = mapped_column(String(128), nullable=False)
    basin: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str] = mapped_column(
        String(64), nullable=False, default="NOAA NHC"
    )
    advisory_number: Mapped[str] = mapped_column(String(32), nullable=False)
    issue_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    retrieval_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    source_url: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    positions: Mapped[list["CycloneForecastPosition"]] = relationship(
        "CycloneForecastPosition",
        back_populates="forecast_run",
        cascade="all, delete-orphan",
        order_by="CycloneForecastPosition.lead_time_hours",
    )

    __table_args__ = (
        UniqueConstraint(
            "provider", "storm_id", "advisory_number", name="uq_cyclone_fcst_run"
        ),
        Index("ix_cyclone_fcst_run_storm", "storm_id", "issue_time"),
    )


class CycloneForecastPosition(HazardBase):
    """Deterministic future forecast waypoint positions along a cyclone forecast advisory run."""

    __tablename__ = "cyclone_forecast_positions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    forecast_run_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("cyclone_forecast_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    lead_time_hours: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # 0, 12, 24, 36, 48, 72, 96, 120
    valid_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Forecast Intensity & Stage
    max_wind_knots: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_gusts_knots: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_pressure_hpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    classification: Mapped[str | None] = mapped_column(
        String(32), nullable=True
    )  # HU, MH, TS, TD
    stage_description: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)

    forecast_run: Mapped["CycloneForecastRun"] = relationship(
        "CycloneForecastRun", back_populates="positions"
    )

    __table_args__ = (
        UniqueConstraint(
            "forecast_run_id", "lead_time_hours", name="uq_cyclone_fcst_pos"
        ),
        Index("ix_cyclone_fcst_pos_run_lead", "forecast_run_id", "lead_time_hours"),
        Index("ix_cyclone_fcst_pos_valid_time", "valid_time"),
    )
