from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, noload, selectinload

from app.core.config import settings
from app.core.freshness import (
    FreshnessStatus,
    SyncOutcome,
    evaluate_freshness,
    reliability_tracker,
)
from app.models.hazard import Hazard, HazardTrack
from app.schemas.hazard import HazardRead, HazardTrackPoint


class HazardRepository:
    """Repository for querying and persisting Hazard and HazardTrack database records."""

    def __init__(self, session: Session):
        self.session = session

    def count_hazards(self, basin: str | None = None) -> int:
        """Count total hazard events matching criteria."""
        stmt = select(func.count(Hazard.id))
        if basin:
            stmt = stmt.where(Hazard.basin == basin.lower().strip())
        return self.session.scalar(stmt) or 0

    def count_hazard_tracks(self) -> int:
        """Count total hazard track points in the database."""
        stmt = select(func.count(HazardTrack.id))
        return self.session.scalar(stmt) or 0

    def list_hazards(
        self,
        hazard_type: str | None = None,
        basin: str | None = None,
        active_only: bool = False,
        limit: int = 20,
    ) -> list[HazardRead]:
        """Backward-compatible method returning hazards with full track points."""
        items, _ = self.list_hazards_paginated(
            hazard_type=hazard_type,
            basin=basin,
            status="active" if active_only else None,
            limit=limit,
            page=1,
            include_tracks=True,
        )
        return items

    def list_hazards_paginated(
        self,
        search: str | None = None,
        hazard_type: str | None = None,
        basin: str | None = None,
        status: str | None = None,
        source: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        min_wind: float | None = None,
        category: str | None = None,
        sort_by: str = "last_observed",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 20,
        include_tracks: bool = True,
    ) -> tuple[list[HazardRead], int]:
        """
        Query hazards with search, flexible filters, safe deterministic sorting, and pagination.
        Returns a tuple of (items_list, total_count).
        """
        page = max(1, page)
        limit = max(1, min(100, limit))

        # Base filter conditions
        filters = []
        if hazard_type:
            filters.append(Hazard.hazard_type == hazard_type.lower().strip())
        if basin and basin.lower().strip() != "all":
            filters.append(Hazard.basin == basin.lower().strip())
        if status:
            filters.append(Hazard.status == status.lower().strip())
        if source and source.lower().strip() != "all":
            filters.append(Hazard.source == source.strip())
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(Hazard.name).like(term), func.lower(Hazard.id).like(term)
                )
            )
        if start_date:
            filters.append(Hazard.first_observed >= start_date)
        if end_date:
            filters.append(Hazard.last_observed <= end_date)

        # Intensity / track point filters
        if min_wind is not None or category:
            track_filter_subq = select(HazardTrack.hazard_id).distinct()
            if min_wind is not None:
                track_filter_subq = track_filter_subq.where(
                    HazardTrack.wind_speed_knots >= min_wind
                )
            if category:
                track_filter_subq = track_filter_subq.where(
                    func.lower(HazardTrack.category) == category.lower().strip()
                )
            filters.append(Hazard.id.in_(track_filter_subq))

        # 1. Total matching count query
        count_stmt = select(func.count(Hazard.id))
        if filters:
            count_stmt = count_stmt.where(*filters)
        total_count = self.session.scalar(count_stmt) or 0

        # 2. Main data query with strict sort allowlist
        data_stmt = select(Hazard)
        if include_tracks:
            data_stmt = data_stmt.options(selectinload(Hazard.track_points))
        else:
            data_stmt = data_stmt.options(noload(Hazard.track_points))

        if filters:
            data_stmt = data_stmt.where(*filters)

        # Sort field allowlist
        sort_column_map = {
            "last_observed": Hazard.last_observed,
            "first_observed": Hazard.first_observed,
            "name": Hazard.name,
            "id": Hazard.id,
            "created_at": Hazard.created_at,
        }
        target_col = sort_column_map.get(sort_by, Hazard.last_observed)
        is_asc = sort_order.lower().strip() == "asc"

        order_expr = (
            target_col.asc().nullslast() if is_asc else target_col.desc().nullslast()
        )
        # Stable deterministic tie-breaker
        data_stmt = data_stmt.order_by(order_expr, Hazard.id.asc())

        # Pagination
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

        records = self.session.scalars(data_stmt).all()
        return [
            self._to_schema(h, include_tracks=include_tracks) for h in records
        ], total_count

    def get_by_id(self, hazard_id: str) -> HazardRead | None:
        """Fetch a single hazard with complete track points by its unique identifier."""
        stmt = (
            select(Hazard)
            .options(selectinload(Hazard.track_points))
            .where(Hazard.id == hazard_id)
        )
        hazard = self.session.scalars(stmt).first()
        return self._to_schema(hazard, include_tracks=True) if hazard else None

    def get_track_points(self, hazard_id: str) -> list[HazardTrackPoint]:
        """Fetch ordered track points for a hazard ordered chronologically with stable tie-breaker."""
        stmt = (
            select(HazardTrack)
            .where(HazardTrack.hazard_id == hazard_id)
            .order_by(HazardTrack.time.asc(), HazardTrack.id.asc())
        )
        records = self.session.scalars(stmt).all()
        return [
            HazardTrackPoint(
                time=tp.time,
                latitude=tp.latitude,
                longitude=tp.longitude,
                wind_speed_knots=tp.wind_speed_knots,
                pressure_hpa=tp.pressure_hpa,
                category=tp.category,
                is_forecast=tp.is_forecast,
            )
            for tp in records
        ]

    def get_hazard_stats(self, hazard_id: str) -> dict[str, Any] | None:
        """Calculate derived aggregate statistics for a given hazard strictly from valid observations."""
        hazard = self.session.get(Hazard, hazard_id)
        if not hazard:
            return None

        tracks = self.get_track_points(hazard_id)
        valid_winds = [
            t.wind_speed_knots for t in tracks if t.wind_speed_knots is not None
        ]
        valid_pressures = [t.pressure_hpa for t in tracks if t.pressure_hpa is not None]
        categories = sorted({t.category for t in tracks if t.category})

        return {
            "hazard_id": hazard.id,
            "name": hazard.name,
            "basin": hazard.basin,
            "source": hazard.source,
            "status": hazard.status,
            "track_points_count": len(tracks),
            "max_wind_knots": max(valid_winds) if valid_winds else None,
            "min_pressure_hpa": min(valid_pressures) if valid_pressures else None,
            "categories_observed": categories,
            "first_observed": tracks[0].time if tracks else hazard.first_observed,
            "last_observed": tracks[-1].time if tracks else hazard.last_observed,
        }

    def upsert_hazard(
        self,
        hazard_read: HazardRead,
        metadata_json: dict | None = None,
        commit: bool = True,
        dry_run: bool = False,
    ) -> tuple[Hazard, dict[str, int]]:
        """
        Idempotently create or update a Hazard and its HazardTracks.
        Uses deterministic, timestamp-based track identifiers (independent of list index/row order).
        Returns a tuple of (Hazard, stats_dict).
        """
        stats = {
            "event_inserted": 0,
            "event_updated": 0,
            "event_unchanged": 0,
            "points_inserted": 0,
            "points_updated": 0,
            "points_unchanged": 0,
        }

        stmt = (
            select(Hazard)
            .options(selectinload(Hazard.track_points))
            .where(Hazard.id == hazard_read.hazard_id)
        )
        existing = self.session.scalars(stmt).first()

        if not existing:
            stats["event_inserted"] = 1
            if not dry_run:
                existing = Hazard(
                    id=hazard_read.hazard_id,
                    name=hazard_read.name,
                    hazard_type=hazard_read.type,
                    source=hazard_read.source,
                    basin=hazard_read.basin,
                    status=hazard_read.status,
                    first_observed=hazard_read.first_observed,
                    last_observed=hazard_read.last_observed,
                    metadata_json=metadata_json or {},
                )
                self.session.add(existing)
                self.session.flush()
            else:
                existing = Hazard(
                    id=hazard_read.hazard_id,
                    name=hazard_read.name,
                    hazard_type=hazard_read.type,
                    source=hazard_read.source,
                    basin=hazard_read.basin,
                    status=hazard_read.status,
                    first_observed=hazard_read.first_observed,
                    last_observed=hazard_read.last_observed,
                    metadata_json=metadata_json or {},
                )
        else:
            changed = False
            if existing.name != hazard_read.name:
                existing.name = hazard_read.name
                changed = True
            if existing.status != hazard_read.status:
                existing.status = hazard_read.status
                changed = True
            if existing.basin != hazard_read.basin:
                existing.basin = hazard_read.basin
                changed = True

            def _dt_differs(d1: datetime | None, d2: datetime | None) -> bool:
                if d1 is None and d2 is None:
                    return False
                if d1 is None or d2 is None:
                    return True
                return int(d1.timestamp()) != int(d2.timestamp())

            if _dt_differs(existing.first_observed, hazard_read.first_observed):
                existing.first_observed = hazard_read.first_observed
                changed = True
            if _dt_differs(existing.last_observed, hazard_read.last_observed):
                existing.last_observed = hazard_read.last_observed
                changed = True
            if metadata_json:
                existing_meta_comp = {
                    k: v
                    for k, v in (existing.metadata_json or {}).items()
                    if k not in {"ingestion_timestamp_utc", "retrieval_timestamp_utc"}
                }
                new_meta_comp = {
                    k: v
                    for k, v in metadata_json.items()
                    if k not in {"ingestion_timestamp_utc", "retrieval_timestamp_utc"}
                }
                if existing_meta_comp != new_meta_comp:
                    existing.metadata_json = metadata_json
                    changed = True

            if changed:
                stats["event_updated"] = 1
            else:
                stats["event_unchanged"] = 1

        # Track point processing with stable deterministic IDs
        existing_tracks = (
            {tp.id: tp for tp in existing.track_points} if existing else {}
        )

        for pt in hazard_read.track_points:
            pt_time = pt.time if pt.time.tzinfo else pt.time.replace(tzinfo=UTC)
            # Stable deterministic ID derived strictly from storm identifier + UTC timestamp
            track_id = f"{hazard_read.hazard_id}-{int(pt_time.timestamp())}"

            if track_id not in existing_tracks:
                stats["points_inserted"] += 1
                if not dry_run:
                    track_record = HazardTrack(
                        id=track_id,
                        hazard_id=hazard_read.hazard_id,
                        time=pt_time,
                        latitude=pt.latitude,
                        longitude=pt.longitude,
                        wind_speed_knots=pt.wind_speed_knots,
                        pressure_hpa=pt.pressure_hpa,
                        category=pt.category,
                        is_forecast=False,
                    )
                    self.session.add(track_record)
                    existing_tracks[track_id] = track_record
            else:
                existing_tp = existing_tracks[track_id]
                pt_changed = False
                if (
                    abs(existing_tp.latitude - pt.latitude) > 1e-5
                    or abs(existing_tp.longitude - pt.longitude) > 1e-5
                ):
                    existing_tp.latitude = pt.latitude
                    existing_tp.longitude = pt.longitude
                    pt_changed = True
                if existing_tp.wind_speed_knots != pt.wind_speed_knots:
                    existing_tp.wind_speed_knots = pt.wind_speed_knots
                    pt_changed = True
                if existing_tp.pressure_hpa != pt.pressure_hpa:
                    existing_tp.pressure_hpa = pt.pressure_hpa
                    pt_changed = True
                if existing_tp.category != pt.category:
                    existing_tp.category = pt.category
                    pt_changed = True

                if pt_changed:
                    stats["points_updated"] += 1
                else:
                    stats["points_unchanged"] += 1

        if commit and not dry_run:
            self.session.commit()

        return existing, stats

    def upsert_hazards_batch(
        self,
        hazards: list[HazardRead],
        batch_size: int = 50,
        dry_run: bool = False,
        default_metadata: dict | None = None,
    ) -> dict[str, Any]:
        """
        Batch-processes a list of HazardRead objects with transactional checkpoints.
        Supports dry_run (returns statistics without writing).
        """
        summary: dict[str, Any] = {
            "total_storms": len(hazards),
            "events_inserted": 0,
            "events_updated": 0,
            "events_unchanged": 0,
            "points_inserted": 0,
            "points_updated": 0,
            "points_unchanged": 0,
        }

        try:
            for i, hazard in enumerate(hazards):
                meta = dict(default_metadata or {})
                meta.update(
                    {
                        "source": hazard.source,
                        "basin": hazard.basin,
                        "first_observed": (
                            hazard.first_observed.isoformat()
                            if hazard.first_observed
                            else None
                        ),
                        "last_observed": (
                            hazard.last_observed.isoformat()
                            if hazard.last_observed
                            else None
                        ),
                        "track_points_count": len(hazard.track_points),
                    }
                )

                _, stats = self.upsert_hazard(
                    hazard_read=hazard,
                    metadata_json=meta,
                    commit=False,
                    dry_run=dry_run,
                )

                summary["events_inserted"] += stats["event_inserted"]
                summary["events_updated"] += stats["event_updated"]
                summary["events_unchanged"] += stats["event_unchanged"]
                summary["points_inserted"] += stats["points_inserted"]
                summary["points_updated"] += stats["points_updated"]
                summary["points_unchanged"] += stats["points_unchanged"]

                # Commit batch if not dry_run
                if not dry_run and (i + 1) % batch_size == 0:
                    self.session.commit()

            if not dry_run:
                self.session.commit()
            else:
                self.session.rollback()

        except Exception:
            self.session.rollback()
            raise

        return summary

    def _to_schema(self, hazard: Hazard, include_tracks: bool = True) -> HazardRead:
        """Map SQLAlchemy Hazard model to HazardRead schema, optionally including track points."""
        track_points_schema = []
        if include_tracks and hazard.track_points:
            sorted_points = sorted(hazard.track_points, key=lambda p: p.time)
            track_points_schema = [
                HazardTrackPoint(
                    time=tp.time,
                    latitude=tp.latitude,
                    longitude=tp.longitude,
                    wind_speed_knots=tp.wind_speed_knots,
                    pressure_hpa=tp.pressure_hpa,
                    category=tp.category,
                    is_forecast=tp.is_forecast,
                )
                for tp in sorted_points
            ]

        return HazardRead(
            hazard_id=hazard.id,
            name=hazard.name,
            type=hazard.hazard_type,
            source=hazard.source,
            basin=hazard.basin,
            status=hazard.status,
            first_observed=hazard.first_observed,
            last_observed=hazard.last_observed,
            track_points=track_points_schema,
            metadata_json=hazard.metadata_json or {},
        )

    def sync_live_gdacs_alerts(
        self,
        alerts: list[HazardRead],
        sync_meta: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Persist normalized GDACS live alerts idempotently into PostgreSQL orca_db.
        Preserves historical IBTrACS records completely intact.
        Returns auditable summary counts.
        """
        summary: dict[str, Any] = {
            "retrieved_count": len(alerts),
            "validated_count": len(alerts),
            "inserted_count": 0,
            "updated_count": 0,
            "unchanged_count": 0,
            "rejected_count": 0,
            "points_inserted": 0,
            "points_updated": 0,
            "points_unchanged": 0,
        }

        try:
            for alert in alerts:
                alert.status = "active"
                alert.source = "GDACS"

                _, stats = self.upsert_hazard(
                    hazard_read=alert,
                    metadata_json=alert.metadata_json,
                    commit=False,
                )
                summary["inserted_count"] += stats["event_inserted"]
                summary["updated_count"] += stats["event_updated"]
                summary["unchanged_count"] += stats["event_unchanged"]
                summary["points_inserted"] += stats["points_inserted"]
                summary["points_updated"] += stats["points_updated"]
                summary["points_unchanged"] += stats["points_unchanged"]

            self.session.commit()
        except Exception:
            self.session.rollback()
            raise

        return summary

    def get_gdacs_sync_status(self) -> dict[str, Any]:
        """Query current status of persisted GDACS alerts in PostgreSQL orca_db.

        Returns active count, latest retrieval timestamp, freshness evaluation,
        and fallback indicators.
        """
        count_stmt = select(func.count(Hazard.id)).where(
            Hazard.source == "GDACS",
            Hazard.status == "active",
        )
        active_count = self.session.scalar(count_stmt) or 0

        latest_stmt = (
            select(Hazard)
            .where(Hazard.source == "GDACS")
            .order_by(Hazard.created_at.desc(), Hazard.last_observed.desc())
            .limit(1)
        )
        latest_hazard = self.session.scalars(latest_stmt).first()

        last_sync_utc: datetime | None = None
        if latest_hazard and latest_hazard.metadata_json:
            retrieval_str = latest_hazard.metadata_json.get("retrieval_timestamp_utc")
            if retrieval_str:
                try:
                    last_sync_utc = datetime.fromisoformat(retrieval_str)
                except ValueError:
                    pass
        if last_sync_utc is None and latest_hazard:
            last_sync_utc = latest_hazard.created_at

        # Evaluate freshness deterministically
        if last_sync_utc is not None:
            freshness = evaluate_freshness(
                last_sync_utc, settings.GDACS_FRESHNESS_HOURS
            )
        elif active_count == 0:
            freshness = FreshnessStatus.UNAVAILABLE
        else:
            freshness = FreshnessStatus.UNKNOWN

        track = reliability_tracker.get_record("gdacs")
        is_fallback = (
            active_count > 0 and track.last_attempt_status == SyncOutcome.FAILED
        )
        is_healthy = track.consecutive_failures == 0

        if is_fallback:
            msg = (
                f"GDACS live refresh failed ({track.last_attempt_message}). "
                f"Displaying {active_count} persisted fallback alerts from PostgreSQL ({freshness.value})."
            )
        elif active_count > 0:
            msg = (
                f"Live feed monitored. {active_count} active alerts currently tracked in PostgreSQL "
                f"(status: {freshness.value})."
            )
        else:
            msg = "Live feed monitored. Zero active tropical cyclone alerts currently reported."

        return {
            "provider": "GDACS",
            "is_healthy": is_healthy,
            "freshness": freshness.value,
            "last_sync_utc": last_sync_utc,
            "last_attempt_utc": track.last_attempt_utc,
            "last_attempt_status": track.last_attempt_status.value,
            "active_alerts_count": active_count,
            "is_fallback": is_fallback,
            "latest_event_id": latest_hazard.id if latest_hazard else None,
            "latest_event_name": latest_hazard.name if latest_hazard else None,
            "message": msg,
        }
