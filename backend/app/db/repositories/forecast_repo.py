from datetime import UTC, datetime
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.freshness import (
    FreshnessStatus,
    SyncOutcome,
    evaluate_freshness,
    reliability_tracker,
)
from app.core.logging import logger
from app.models.forecast import (
    CycloneForecastPosition,
    CycloneForecastRun,
    MarineForecast,
)
from app.providers.data.nhc import NOAAForecastClient
from app.providers.data.open_meteo_hazard import OpenMeteoMarineClient


class ForecastRepository:
    """Repository handling database persistence and queries for Marine Forecasts

    and official Cyclone Forecast runs/positions in PostgreSQL orca_db.
    """

    def __init__(
        self,
        marine_client: OpenMeteoMarineClient | None = None,
        nhc_client: NOAAForecastClient | None = None,
    ):
        self.marine_client = marine_client or OpenMeteoMarineClient()
        self.nhc_client = nhc_client or NOAAForecastClient()

    # =========================================================================
    # 1. MARINE WAVE FORECASTS (Open-Meteo Marine)
    # =========================================================================

    async def sync_marine_forecast(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        forecast_days: int = 3,
    ) -> dict[str, Any]:
        """Fetch, validate, and idempotently persist gridded marine wave forecasts."""
        lock = reliability_tracker.get_lock("open_meteo")
        async with lock:
            reliability_tracker.record_attempt_start("open_meteo")
            try:
                normalized_points = await self.marine_client.fetch_and_normalize(
                    latitude=latitude,
                    longitude=longitude,
                    forecast_days=forecast_days,
                )

                if not normalized_points:
                    reliability_tracker.record_attempt_success(
                        "open_meteo", retrieved_count=0
                    )
                    return {
                        "status": "success",
                        "message": f"Zero marine forecast points returned for ({latitude}, {longitude})",
                        "latitude": latitude,
                        "longitude": longitude,
                        "retrieved_points": 0,
                        "inserted_points": 0,
                        "updated_points": 0,
                        "retrieval_time_utc": datetime.now(UTC),
                    }

                retrieved_count = len(normalized_points)
                inserted_count = 0
                updated_count = 0

                # Execute safe transactional upsert using PostgreSQL ON CONFLICT DO UPDATE
                for pt in normalized_points:
                    stmt = (
                        insert(MarineForecast)
                        .values(
                            id=pt.id,
                            provider=pt.provider,
                            model=pt.model,
                            latitude=pt.latitude,
                            longitude=pt.longitude,
                            valid_time=pt.valid_time,
                            wave_height_m=pt.wave_height_m,
                            wave_period_s=pt.wave_period_s,
                            wave_direction_deg=pt.wave_direction_deg,
                            wind_wave_height_m=pt.wind_wave_height_m,
                            swell_wave_height_m=pt.swell_wave_height_m,
                            retrieval_time=pt.retrieval_time,
                            source_url=pt.source_url,
                            metadata_json=pt.metadata,
                        )
                        .on_conflict_do_update(
                            index_elements=["id"],
                            set_={
                                "provider": pt.provider,
                                "model": pt.model,
                                "latitude": pt.latitude,
                                "longitude": pt.longitude,
                                "valid_time": pt.valid_time,
                                "wave_height_m": pt.wave_height_m,
                                "wave_period_s": pt.wave_period_s,
                                "wave_direction_deg": pt.wave_direction_deg,
                                "wind_wave_height_m": pt.wind_wave_height_m,
                                "swell_wave_height_m": pt.swell_wave_height_m,
                                "retrieval_time": pt.retrieval_time,
                                "metadata": pt.metadata,
                                "updated_at": datetime.now(UTC),
                            },
                        )
                    )

                    # Check if this point exists to accurately count inserts vs updates
                    existing = db.execute(
                        select(MarineForecast.id).where(
                            MarineForecast.provider == pt.provider,
                            MarineForecast.latitude == pt.latitude,
                            MarineForecast.longitude == pt.longitude,
                            MarineForecast.valid_time == pt.valid_time,
                        )
                    ).scalar_one_or_none()

                    db.execute(stmt)
                    if existing:
                        updated_count += 1
                    else:
                        inserted_count += 1

                db.commit()
                reliability_tracker.record_attempt_success(
                    "open_meteo", retrieved_count=retrieved_count
                )
                logger.info(
                    f"Persisted marine forecast for ({latitude}, {longitude}): "
                    f"{inserted_count} inserted, {updated_count} updated (retrieved: {retrieved_count})"
                )

                return {
                    "status": "success",
                    "message": f"Successfully persisted {retrieved_count} hourly marine forecast points.",
                    "latitude": normalized_points[0].latitude,
                    "longitude": normalized_points[0].longitude,
                    "retrieved_points": retrieved_count,
                    "inserted_points": inserted_count,
                    "updated_points": updated_count,
                    "retrieval_time_utc": normalized_points[0].retrieval_time,
                }
            except Exception as exc:
                db.rollback()
                reliability_tracker.record_attempt_failure(
                    "open_meteo", error_message=str(exc)
                )
                raise

    def get_marine_sync_status(
        self,
        db: Session,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_deg: float = 0.5,
    ) -> dict[str, Any]:
        """Compute provider status, data freshness, and persisted fallback state for marine wave forecasts."""
        query_count = select(func.count(MarineForecast.id))
        query_latest = (
            select(MarineForecast.retrieval_time)
            .order_by(MarineForecast.retrieval_time.desc())
            .limit(1)
        )

        if latitude is not None and longitude is not None:
            query_count = query_count.where(
                MarineForecast.latitude.between(
                    latitude - radius_deg, latitude + radius_deg
                ),
                MarineForecast.longitude.between(
                    longitude - radius_deg, longitude + radius_deg
                ),
            )
            query_latest = query_latest.where(
                MarineForecast.latitude.between(
                    latitude - radius_deg, latitude + radius_deg
                ),
                MarineForecast.longitude.between(
                    longitude - radius_deg, longitude + radius_deg
                ),
            )

        total_points = db.scalar(query_count) or 0
        latest_retrieval = db.scalar(query_latest)

        if latest_retrieval:
            freshness = evaluate_freshness(
                latest_retrieval, settings.OPEN_METEO_FRESHNESS_HOURS
            )
        elif total_points == 0:
            freshness = FreshnessStatus.UNAVAILABLE
        else:
            freshness = FreshnessStatus.UNKNOWN

        track = reliability_tracker.get_record("open_meteo")
        is_fallback = (
            total_points > 0 and track.last_attempt_status == SyncOutcome.FAILED
        )
        is_healthy = track.consecutive_failures == 0

        if is_fallback:
            msg = (
                f"Open-Meteo Marine refresh failed ({track.last_attempt_message}). "
                f"Displaying {total_points} persisted fallback forecast points from PostgreSQL ({freshness.value})."
            )
        elif total_points > 0:
            msg = (
                f"Open-Meteo Marine operational. {total_points} gridded wave forecast points "
                f"tracked in PostgreSQL ({freshness.value})."
            )
        else:
            msg = "No marine wave forecast points persisted in PostgreSQL for this location."

        return {
            "provider": "open-meteo-marine",
            "is_healthy": is_healthy,
            "freshness": freshness.value,
            "last_sync_utc": latest_retrieval,
            "last_attempt_utc": track.last_attempt_utc,
            "last_attempt_status": track.last_attempt_status.value,
            "total_persisted_points": total_points,
            "is_fallback": is_fallback,
            "message": msg,
        }

    def get_marine_forecasts(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        provider: str | None = None,
        radius_deg: float = 0.5,
        limit: int = 168,
    ) -> list[MarineForecast]:
        """Query persisted hourly marine forecasts within a geographic window and time range."""
        query = (
            select(MarineForecast)
            .where(
                MarineForecast.latitude.between(
                    latitude - radius_deg, latitude + radius_deg
                ),
                MarineForecast.longitude.between(
                    longitude - radius_deg, longitude + radius_deg
                ),
            )
            .order_by(MarineForecast.valid_time.asc())
            .limit(limit)
        )

        if provider:
            query = query.where(MarineForecast.provider == provider)
        if start_time:
            query = query.where(MarineForecast.valid_time >= start_time)
        if end_time:
            query = query.where(MarineForecast.valid_time <= end_time)

        return list(db.execute(query).scalars().all())

    def get_latest_marine_forecast(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        radius_deg: float = 0.5,
    ) -> MarineForecast | None:
        """Fetch the most immediate upcoming forecast point for the given coordinates."""
        now = datetime.now(UTC)
        query = (
            select(MarineForecast)
            .where(
                MarineForecast.latitude.between(
                    latitude - radius_deg, latitude + radius_deg
                ),
                MarineForecast.longitude.between(
                    longitude - radius_deg, longitude + radius_deg
                ),
                MarineForecast.valid_time >= now,
            )
            .order_by(MarineForecast.valid_time.asc())
            .limit(1)
        )
        return db.execute(query).scalars().first()

    # =========================================================================
    # 2. CYCLONE FORECAST RUNS & POSITIONS (NOAA NHC)
    # =========================================================================

    async def sync_cyclone_forecasts(self, db: Session) -> dict[str, Any]:
        """Fetch, validate, and idempotently persist active cyclone forecast runs and future positions."""
        lock = reliability_tracker.get_lock("nhc")
        async with lock:
            reliability_tracker.record_attempt_start("nhc")
            try:
                runs = await self.nhc_client.fetch_and_normalize_forecasts()
                retrieval_now = datetime.now(UTC)

                runs_inserted = 0
                runs_updated = 0
                total_positions_persisted = 0

                for r in runs:
                    # Upsert run
                    run_stmt = (
                        insert(CycloneForecastRun)
                        .values(
                            id=r.id,
                            storm_id=r.storm_id,
                            storm_name=r.storm_name,
                            basin=r.basin,
                            provider=r.provider,
                            advisory_number=r.advisory_number,
                            issue_time=r.issue_time,
                            retrieval_time=r.retrieval_time,
                            source_url=r.source_url,
                            metadata_json=r.metadata,
                        )
                        .on_conflict_do_update(
                            index_elements=["id"],
                            set_={
                                "storm_name": r.storm_name,
                                "basin": r.basin,
                                "issue_time": r.issue_time,
                                "retrieval_time": r.retrieval_time,
                                "metadata": r.metadata,
                            },
                        )
                    )

                    existing_run = db.execute(
                        select(CycloneForecastRun.id).where(
                            CycloneForecastRun.id == r.id,
                        )
                    ).scalar_one_or_none()

                    db.execute(run_stmt)
                    if existing_run:
                        runs_updated += 1
                    else:
                        runs_inserted += 1

                    # Upsert positions
                    for pos in r.positions:
                        pos_stmt = (
                            insert(CycloneForecastPosition)
                            .values(
                                id=pos.id,
                                forecast_run_id=r.id,
                                lead_time_hours=pos.lead_time_hours,
                                valid_time=pos.valid_time,
                                latitude=pos.latitude,
                                longitude=pos.longitude,
                                max_wind_knots=pos.max_wind_knots,
                                wind_gusts_knots=pos.wind_gusts_knots,
                                min_pressure_hpa=pos.min_pressure_hpa,
                                classification=pos.classification,
                                stage_description=pos.stage_description,
                                metadata_json=pos.metadata,
                            )
                            .on_conflict_do_update(
                                index_elements=["id"],
                                set_={
                                    "valid_time": pos.valid_time,
                                    "latitude": pos.latitude,
                                    "longitude": pos.longitude,
                                    "max_wind_knots": pos.max_wind_knots,
                                    "wind_gusts_knots": pos.wind_gusts_knots,
                                    "min_pressure_hpa": pos.min_pressure_hpa,
                                    "classification": pos.classification,
                                    "stage_description": pos.stage_description,
                                    "metadata": pos.metadata,
                                },
                            )
                        )
                        db.execute(pos_stmt)
                        total_positions_persisted += 1

                db.commit()
                reliability_tracker.record_attempt_success(
                    "nhc", retrieved_count=len(runs)
                )
                logger.info(
                    f"Synced NOAA cyclone forecasts: {len(runs)} runs ({runs_inserted} new, {runs_updated} updated), "
                    f"{total_positions_persisted} waypoint positions persisted."
                )

                return {
                    "status": "success",
                    "message": f"Successfully persisted {len(runs)} forecast runs with {total_positions_persisted} waypoint positions.",
                    "runs_retrieved": len(runs),
                    "runs_inserted": runs_inserted,
                    "runs_updated": runs_updated,
                    "positions_persisted": total_positions_persisted,
                    "retrieval_time_utc": retrieval_now,
                }
            except Exception as exc:
                db.rollback()
                reliability_tracker.record_attempt_failure(
                    "nhc", error_message=str(exc)
                )
                raise

    def get_cyclone_sync_status(self, db: Session) -> dict[str, Any]:
        """Compute provider status, freshness, and fallback state for NOAA NHC cyclone forecasts."""
        runs_count = db.scalar(select(func.count(CycloneForecastRun.id))) or 0
        positions_count = db.scalar(select(func.count(CycloneForecastPosition.id))) or 0

        latest_run = db.scalars(
            select(CycloneForecastRun)
            .order_by(
                desc(CycloneForecastRun.issue_time),
                desc(CycloneForecastRun.retrieval_time),
            )
            .limit(1)
        ).first()

        last_sync_utc = latest_run.retrieval_time if latest_run else None

        if last_sync_utc:
            freshness = evaluate_freshness(
                last_sync_utc, settings.NOAA_NHC_FRESHNESS_HOURS
            )
        elif runs_count == 0:
            freshness = FreshnessStatus.UNAVAILABLE
        else:
            freshness = FreshnessStatus.UNKNOWN

        track = reliability_tracker.get_record("nhc")
        is_fallback = runs_count > 0 and track.last_attempt_status == SyncOutcome.FAILED
        is_healthy = track.consecutive_failures == 0

        if is_fallback:
            msg = (
                f"NOAA NHC sync failed ({track.last_attempt_message}). "
                f"Displaying {runs_count} persisted fallback advisory runs from PostgreSQL ({freshness.value})."
            )
        elif runs_count > 0:
            msg = (
                f"NOAA NHC pipeline active. {runs_count} advisory runs with {positions_count} positions "
                f"persisted in PostgreSQL ({freshness.value})."
            )
        else:
            msg = "Zero active cyclone forecast runs currently stored in PostgreSQL."

        return {
            "provider": "NOAA NHC",
            "is_healthy": is_healthy,
            "freshness": freshness.value,
            "last_sync_utc": last_sync_utc,
            "last_attempt_utc": track.last_attempt_utc,
            "last_attempt_status": track.last_attempt_status.value,
            "active_runs_count": runs_count,
            "total_positions_count": positions_count,
            "geographic_coverage": (
                "eastern_pacific, north_atlantic, central_pacific (Note: Does not cover Indian Ocean)"
            ),
            "is_fallback": is_fallback,
            "message": msg,
        }

    def get_cyclone_forecast_runs(
        self, db: Session, storm_id: str | None = None
    ) -> list[CycloneForecastRun]:
        """Fetch cyclone forecast runs ordered by issue time."""
        query = (
            select(CycloneForecastRun)
            .options(joinedload(CycloneForecastRun.positions))
            .order_by(desc(CycloneForecastRun.issue_time))
        )
        if storm_id:
            query = query.where(CycloneForecastRun.storm_id == storm_id)

        # Unique scalars because of joinedload
        return list(db.execute(query).unique().scalars().all())

    def get_cyclone_forecast_positions(
        self, db: Session, forecast_run_id: str
    ) -> list[CycloneForecastPosition]:
        """Fetch chronological forecast waypoint positions for a specific forecast run."""
        query = (
            select(CycloneForecastPosition)
            .where(CycloneForecastPosition.forecast_run_id == forecast_run_id)
            .order_by(CycloneForecastPosition.lead_time_hours.asc())
        )
        return list(db.execute(query).scalars().all())


forecast_repo = ForecastRepository()
