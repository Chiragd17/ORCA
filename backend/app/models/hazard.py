from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.hazard_base import HazardBase


class Hazard(HazardBase):
    __tablename__ = "hazards"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hazard_type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # cyclone, tsunami, storm_surge
    source: Mapped[str] = mapped_column(
        String(128), nullable=False
    )  # NOAA IBTrACS, GDACS, IMD
    basin: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # arabian_sea, bay_of_bengal
    status: Mapped[str] = mapped_column(
        String(32), default="active"
    )  # active, historical
    first_observed: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_observed: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    track_points: Mapped[list["HazardTrackPointModel"]] = relationship(
        "HazardTrackPointModel",
        back_populates="hazard",
        cascade="all, delete-orphan",
        order_by="HazardTrackPointModel.time",
    )


class HazardTrackPointModel(HazardBase):
    __tablename__ = "hazard_tracks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hazard_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("hazards.id"), nullable=False
    )
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    wind_speed_knots: Mapped[float | None] = mapped_column(Float, nullable=True)
    pressure_hpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_forecast: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)

    hazard: Mapped["Hazard"] = relationship("Hazard", back_populates="track_points")

    __table_args__ = (Index("ix_hazard_tracks_hazard_time", "hazard_id", "time"),)


# Backward-compatibility alias
HazardTrack = HazardTrackPointModel

