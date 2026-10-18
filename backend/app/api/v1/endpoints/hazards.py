import asyncio
import logging
import math
import uuid
from datetime import UTC, datetime
from typing import Annotated

from app.agents.marine_hazard.agent import (
    REGIONAL_COASTAL_COORDINATES,
    MarineHazardAgent,
)
from app.core.freshness import SyncOutcome, reliability_tracker
from app.db.repositories.forecast_repo import ForecastRepository
from app.db.repositories.hazard_repo import HazardRepository
from app.db.hazard_session import get_hazard_db as get_db
from app.providers.data.gdacs import GDACSClient
from app.schemas.hazard import (
    GDACSStatusResponse,
    GDACSSyncResponse,
    HazardAgentAnalysisRequest,
    HazardAgentAnalysisResponse,
    HazardAgentChatRequest,
    HazardAgentChatResponse,
    HazardListResponse,
    HazardRead,
    HazardTrackResponse,
)
from app.schemas.investigation import InvestigationTask, LocationContext
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hazards", tags=["Hazards"])

ALLOWED_SORT_FIELDS = {"last_observed", "first_observed", "name", "id", "created_at"}
ALLOWED_SORT_ORDERS = {"asc", "desc"}
_gdacs_sync_lock = asyncio.Lock()


@router.get("", response_model=HazardListResponse)
def list_hazards(
    db: Annotated[Session, Depends(get_db)],
    search: Annotated[
        str | None, Query(description="Search by cyclone name or storm ID")
    ] = None,
    hazard_type: Annotated[
        str | None, Query(description="e.g. cyclone, storm_surge")
    ] = None,
    basin: Annotated[
        str | None, Query(description="e.g. arabian_sea, bay_of_bengal, or all")
    ] = None,
    status_filter: Annotated[
        str | None,
        Query(alias="status", description="Filter by status (historical, active)"),
    ] = None,
    source: Annotated[
        str | None,
        Query(description="Filter by data source (e.g. GDACS, NOAA IBTrACS)"),
    ] = None,
    active_only: Annotated[
        bool, Query(description="Filter for only active alerts")
    ] = False,
    start_date: Annotated[
        datetime | None, Query(description="Observation start date (UTC)")
    ] = None,
    end_date: Annotated[
        datetime | None, Query(description="Observation end date (UTC)")
    ] = None,
    min_wind: Annotated[
        float | None,
        Query(description="Filter for storms reaching minimum wind speed in knots"),
    ] = None,
    category: Annotated[
        str | None, Query(description="Filter by Saffir-Simpson category")
    ] = None,
    sort_by: Annotated[
        str, Query(description="Sort field (last_observed, first_observed, name, id)")
    ] = "last_observed",
    sort_order: Annotated[str, Query(description="Sort order (asc, desc)")] = "desc",
    page: Annotated[int, Query(ge=1, description="Page number (1-indexed)")] = 1,
    limit: Annotated[
        int, Query(ge=1, le=100, description="Items per page (max 100)")
    ] = 20,
    include_tracks: Annotated[
        bool, Query(description="Whether to include track points in the listing")
    ] = True,
):
    """
    Retrieve real marine hazard records and chronological cyclone tracks with search,
    spatial filtering, intensity thresholds, and pagination.
    Backed by PostgreSQL orca_db.
    """
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by field '{sort_by}'. Allowed fields: {sorted(ALLOWED_SORT_FIELDS)}",
        )
    if sort_order.lower() not in ALLOWED_SORT_ORDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_order '{sort_order}'. Allowed: 'asc', 'desc'",
        )

    # Resolve active_only parameter
    effective_status = "active" if active_only else status_filter

    try:
        repo = HazardRepository(db)
        items, total = repo.list_hazards_paginated(
            search=search,
            hazard_type=hazard_type,
            basin=basin,
            status=effective_status,
            source=source,
            start_date=start_date,
            end_date=end_date,
            min_wind=min_wind,
            category=category,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            limit=limit,
            include_tracks=include_tracks,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error querying hazard database")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while querying hazards.",
        ) from e

    pages = math.ceil(total / limit) if total > 0 else 1

    return HazardListResponse(
        count=len(items),
        items=items,
        hazards=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("/sync/gdacs", response_model=GDACSSyncResponse)
async def sync_gdacs_live_hazards(
    db: Annotated[Session, Depends(get_db)],
):
    """
    Trigger a controlled ingestion operation from the live GDACS API.
    Normalizes coordinates and metrics, validates records, and idempotently persists into PostgreSQL orca_db.
    """
    lock = reliability_tracker.get_lock("gdacs")
    if lock.locked():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A GDACS synchronization operation is already in progress. Please wait for it to complete.",
        )

    async with lock:
        reliability_tracker.record_attempt_start("gdacs")
        client = GDACSClient()
        now_utc = datetime.now(UTC)

        try:
            hazards, report = await client.fetch_and_validate_active_cyclones()
        except TimeoutError as e:
            logger.warning("GDACS live sync timed out: %s", e)
            reliability_tracker.record_attempt_failure(
                "gdacs", f"GDACS service request timed out: {e!s}", "timeout"
            )
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"GDACS service request timed out: {e!s}",
            ) from e
        except Exception as e:
            logger.exception("GDACS live sync connection failed")
            reliability_tracker.record_attempt_failure(
                "gdacs",
                f"Unable to retrieve live data from GDACS: {e!s}",
                "connection_error",
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to retrieve live data from GDACS: {e!s}",
            ) from e

        try:
            repo = HazardRepository(db)
            persist_stats = repo.sync_live_gdacs_alerts(hazards)
        except Exception as e:
            logger.exception("Database error persisting GDACS alerts")
            reliability_tracker.record_attempt_failure(
                "gdacs", f"Database persistence error: {e!s}", "persistence_error"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred while persisting live alerts.",
            ) from e

        sync_status = "success"
        outcome = SyncOutcome.SUCCESS
        if not hazards:
            sync_status = "empty"
            outcome = SyncOutcome.EMPTY
        elif report.rejected_count > 0:
            sync_status = "partial"
            outcome = SyncOutcome.PARTIAL

        msg = (
            f"Successfully processed {report.retrieved_count} features: "
            f"{persist_stats['inserted_count']} alerts inserted, "
            f"{persist_stats['updated_count']} updated, "
            f"{persist_stats['unchanged_count']} unchanged, "
            f"{report.rejected_count} rejected."
        )
        reliability_tracker.record_attempt_success("gdacs", msg, now_utc, outcome)

        return GDACSSyncResponse(
            status=sync_status,
            retrieved_count=report.retrieved_count,
            validated_count=report.validated_count,
            inserted_count=persist_stats["inserted_count"],
            updated_count=persist_stats["updated_count"],
            unchanged_count=persist_stats["unchanged_count"],
            rejected_count=report.rejected_count,
            retrieval_timestamp_utc=now_utc,
            message=msg,
        )


@router.get("/sync/gdacs/status", response_model=GDACSStatusResponse)
def get_gdacs_provider_status(
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve provider status, health, deterministic freshness, and latest synchronization metadata for GDACS."""
    try:
        repo = HazardRepository(db)
        sync_info = repo.get_gdacs_sync_status()
        return GDACSStatusResponse(
            provider=sync_info["provider"],
            is_healthy=sync_info["is_healthy"],
            freshness=sync_info["freshness"],
            last_sync_utc=sync_info["last_sync_utc"],
            last_sync_status=sync_info["last_attempt_status"],
            last_attempt_utc=sync_info["last_attempt_utc"],
            last_attempt_status=sync_info["last_attempt_status"],
            active_alerts_count=sync_info["active_alerts_count"],
            is_fallback=sync_info["is_fallback"],
            message=sync_info["message"],
        )
    except Exception as e:
        logger.exception("Error checking GDACS provider status")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving provider status from database.",
        ) from e


@router.get("/{hazard_id}", response_model=HazardRead)
def get_hazard(
    hazard_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve detailed information and full track progression for a specific cyclone or hazard event."""
    try:
        repo = HazardRepository(db)
        hazard = repo.get_by_id(hazard_id)
    except Exception as e:
        logger.exception("Error querying hazard by id '%s'", hazard_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred while fetching hazard '{hazard_id}'.",
        ) from e

    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard event '{hazard_id}' was not found.",
        )

    return hazard


@router.get("/{hazard_id}/track", response_model=HazardTrackResponse)
def get_hazard_track(
    hazard_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve chronologically ordered track points for a specific cyclone."""
    try:
        repo = HazardRepository(db)
        hazard = repo.get_by_id(hazard_id)
        if not hazard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hazard event '{hazard_id}' was not found.",
            )

        points = repo.get_track_points(hazard_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching track points for '%s'", hazard_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred while fetching track for '{hazard_id}'.",
        ) from e

    return HazardTrackResponse(
        hazard_id=hazard.hazard_id,
        name=hazard.name,
        count=len(points),
        track_points=points,
    )


@router.get("/{hazard_id}/stats")
def get_hazard_statistics(
    hazard_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve derived summary statistics (peak wind, minimum pressure, duration) strictly from valid observations."""
    try:
        repo = HazardRepository(db)
        stats_data = repo.get_hazard_stats(hazard_id)
    except Exception as e:
        logger.exception("Error computing stats for '%s'", hazard_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred while computing statistics for '{hazard_id}'.",
        ) from e

    if not stats_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard event '{hazard_id}' was not found.",
        )

    return stats_data


@router.post(
    "/agent/analyze",
    response_model=HazardAgentAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Invoke the Marine Hazard & Forecast Agent with natural language or structured parameters",
)
async def analyze_marine_hazards(
    request: HazardAgentAnalysisRequest,
    db: Annotated[Session, Depends(get_db)],
) -> HazardAgentAnalysisResponse:
    """Execute real-time evidence-grounded hazard and forecast analysis using MarineHazardAgent."""
    inv_id = f"inv-hz-{uuid.uuid4().hex[:8]}"
    target_loc_name = request.location_name or request.location
    location = None
    if request.latitude is not None and request.longitude is not None:
        location = LocationContext(
            latitude=request.latitude,
            longitude=request.longitude,
            name=target_loc_name,
            radius_km=request.radius_km or 50.0,
        )
    elif (
        target_loc_name
        and target_loc_name.lower().strip() in REGIONAL_COASTAL_COORDINATES
    ):
        c_lat, c_lon, _ = REGIONAL_COASTAL_COORDINATES[target_loc_name.lower().strip()]
        location = LocationContext(
            latitude=c_lat,
            longitude=c_lon,
            name=target_loc_name,
            radius_km=request.radius_km or 50.0,
        )

    task = InvestigationTask(
        investigation_id=inv_id,
        workspace="marine_monitoring",
        query=request.query,
        location=location,
        parameters={**request.parameters, "db_session": db},
    )

    agent = MarineHazardAgent(
        hazard_repo=HazardRepository(db),
        forecast_repo=ForecastRepository(),
    )

    try:
        agent_result = await agent.run(task)
    except Exception as exc:
        logger.exception(
            "MarineHazardAgent execution encountered an unhandled exception"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MarineHazardAgent execution failure: {exc!s}",
        ) from exc

    # Extract executive summary from primary finding if present
    exec_summary = "Hazard analysis completed based on verified PostgreSQL evidence."
    if agent_result.findings and agent_result.findings[0].id.startswith(
        "f-exec-summary-"
    ):
        exec_summary = agent_result.findings[0].claim

    # Extract resolved coordinates and location name from findings metadata if not explicitly provided
    first_finding = agent_result.findings[0] if agent_result.findings else None
    first_meta = getattr(first_finding, "metadata", {}) or {} if first_finding else {}

    resolved_lat = (
        request.latitude if request.latitude is not None else first_meta.get("latitude")
    )
    resolved_lon = (
        request.longitude
        if request.longitude is not None
        else first_meta.get("longitude")
    )
    resolved_name = target_loc_name or first_meta.get("location")

    return HazardAgentAnalysisResponse(
        investigation_id=inv_id,
        agent_id=agent_result.agent_id,
        status=agent_result.status.value,
        executive_summary=exec_summary,
        target_location={
            "latitude": resolved_lat,
            "longitude": resolved_lon,
            "name": resolved_name,
            "radius_km": request.radius_km or 50.0,
        },
        findings=agent_result.findings,
        evidence=agent_result.evidence,
        limitations=agent_result.limitations,
        errors=agent_result.errors,
        generated_at_utc=datetime.now(UTC),
    )


@router.post("/agent/chat", response_model=HazardAgentChatResponse)
async def chat_with_marine_hazard_agent(
    request: HazardAgentChatRequest,
    db: Annotated[Session, Depends(get_db)],
) -> HazardAgentChatResponse:
    """
    Multi-turn conversational interface for MarineHazardAgent with dynamic tool calling,
    honest LLM execution / deterministic fallback, and session state retention.
    """
    agent = MarineHazardAgent(
        hazard_repo=HazardRepository(db),
        forecast_repo=ForecastRepository(),
    )
    try:
        response = await agent.chat(
            message=request.message,
            conversation_id=request.conversation_id,
            location=request.location,
            latitude=request.latitude,
            longitude=request.longitude,
            radius_km=request.radius_km or 50.0,
            db=db,
            force_live_refresh=request.force_live_refresh,
            use_custom_coordinates=request.use_custom_coordinates,
            workspace=request.workspace,
            persona=request.persona,
        )
        return response
    except Exception as exc:
        logger.exception("MarineHazardAgent chat encountered an unhandled exception")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MarineHazardAgent chat failure: {exc!s}",
        ) from exc

