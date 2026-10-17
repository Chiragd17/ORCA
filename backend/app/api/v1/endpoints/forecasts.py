from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.freshness import (
    FreshnessStatus,
    SyncOutcome,
    evaluate_freshness,
    reliability_tracker,
)
from app.db.repositories.forecast_repo import forecast_repo
from app.db.hazard_session import get_hazard_db as get_db
from app.schemas.forecast import (
    CycloneForecastPositionItem,
    CycloneForecastRunItem,
    CycloneForecastRunListResponse,
    CycloneForecastSyncResponse,
    CycloneProviderStatusResponse,
    MarineForecastItem,
    MarineForecastResponse,
    MarineForecastSyncRequest,
    MarineForecastSyncResponse,
    MarineProviderStatusResponse,
)

router = APIRouter(prefix="/forecasts", tags=["Marine & Cyclone Forecasts"])


# =============================================================================
# 1. MARINE WAVE FORECASTS (Open-Meteo Marine)
# =============================================================================


@router.post(
    "/marine/sync",
    response_model=MarineForecastSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest gridded marine forecast from Open-Meteo Marine",
)
async def sync_marine_forecast(
    payload: MarineForecastSyncRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MarineForecastSyncResponse:
    """Ingest, validate, and persist hourly marine wave forecasts for specified coordinates."""
    try:
        result = await forecast_repo.sync_marine_forecast(
            db=db,
            latitude=payload.latitude,
            longitude=payload.longitude,
            forecast_days=payload.forecast_days,
        )
        return MarineForecastSyncResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Open-Meteo Marine ingestion failed: {exc!s}",
        ) from exc


@router.get(
    "/marine/status",
    response_model=MarineProviderStatusResponse,
    summary="Get Open-Meteo Marine provider health, freshness, and fallback state",
)
def get_marine_provider_status(
    db: Annotated[Session, Depends(get_db)],
    latitude: Annotated[
        float | None, Query(ge=-90.0, le=90.0, description="Optional center latitude")
    ] = None,
    longitude: Annotated[
        float | None,
        Query(ge=-180.0, le=180.0, description="Optional center longitude"),
    ] = None,
) -> MarineProviderStatusResponse:
    """Report Open-Meteo Marine provider status, data freshness, and persisted fallback state."""
    status_data = forecast_repo.get_marine_sync_status(
        db=db, latitude=latitude, longitude=longitude
    )
    return MarineProviderStatusResponse(**status_data)


@router.get(
    "/marine",
    response_model=MarineForecastResponse,
    summary="Query persisted hourly marine wave forecasts",
)
def get_marine_forecasts(
    db: Annotated[Session, Depends(get_db)],
    latitude: Annotated[float, Query(ge=-90.0, le=90.0, description="Center latitude")],
    longitude: Annotated[
        float, Query(ge=-180.0, le=180.0, description="Center longitude")
    ],
    radius_deg: Annotated[
        float, Query(ge=0.01, le=5.0, description="Bounding search radius")
    ] = 0.5,
    start_time: Annotated[
        datetime | None, Query(description="Start UTC timestamp")
    ] = None,
    end_time: Annotated[datetime | None, Query(description="End UTC timestamp")] = None,
    limit: Annotated[
        int, Query(ge=1, le=500, description="Maximum hourly points")
    ] = 168,
) -> MarineForecastResponse:
    """Retrieve database-persisted marine wave forecasts filtered by coordinate radius and time."""
    records = forecast_repo.get_marine_forecasts(
        db=db,
        latitude=latitude,
        longitude=longitude,
        start_time=start_time,
        end_time=end_time,
        radius_deg=radius_deg,
        limit=limit,
    )

    items = [
        MarineForecastItem(
            id=r.id,
            provider=r.provider,
            model=r.model,
            latitude=r.latitude,
            longitude=r.longitude,
            valid_time=r.valid_time,
            wave_height_m=r.wave_height_m,
            wave_period_s=r.wave_period_s,
            wave_direction_deg=r.wave_direction_deg,
            wind_wave_height_m=r.wind_wave_height_m,
            swell_wave_height_m=r.swell_wave_height_m,
            retrieval_time=r.retrieval_time,
            source_url=r.source_url,
            metadata=r.metadata_json,
        )
        for r in records
    ]

    latest_retrieved: datetime | None = None
    if items:
        latest_retrieved = max(item.retrieval_time for item in items)
        freshness = evaluate_freshness(
            latest_retrieved, settings.OPEN_METEO_FRESHNESS_HOURS
        ).value
    else:
        freshness = FreshnessStatus.UNAVAILABLE.value

    track = reliability_tracker.get_record("open_meteo")
    is_fallback = len(items) > 0 and track.last_attempt_status == SyncOutcome.FAILED

    return MarineForecastResponse(
        count=len(items),
        latitude=latitude,
        longitude=longitude,
        provider="open-meteo-marine",
        model="standard",
        freshness=freshness,
        is_fallback=is_fallback,
        last_retrieved_utc=latest_retrieved,
        items=items,
    )


@router.get(
    "/marine/latest",
    response_model=MarineForecastItem,
    summary="Get latest immediate upcoming marine forecast point",
)
def get_latest_marine_forecast(
    db: Annotated[Session, Depends(get_db)],
    latitude: Annotated[float, Query(ge=-90.0, le=90.0, description="Latitude")],
    longitude: Annotated[float, Query(ge=-180.0, le=180.0, description="Longitude")],
    radius_deg: Annotated[
        float, Query(ge=0.01, le=5.0, description="Radius deg")
    ] = 0.5,
) -> MarineForecastItem:
    """Fetch the next upcoming hourly wave forecast point for the given coordinates."""
    r = forecast_repo.get_latest_marine_forecast(
        db=db, latitude=latitude, longitude=longitude, radius_deg=radius_deg
    )
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No upcoming marine forecast found near ({latitude}, {longitude}). Ingest data first.",
        )

    return MarineForecastItem(
        id=r.id,
        provider=r.provider,
        model=r.model,
        latitude=r.latitude,
        longitude=r.longitude,
        valid_time=r.valid_time,
        wave_height_m=r.wave_height_m,
        wave_period_s=r.wave_period_s,
        wave_direction_deg=r.wave_direction_deg,
        wind_wave_height_m=r.wind_wave_height_m,
        swell_wave_height_m=r.swell_wave_height_m,
        retrieval_time=r.retrieval_time,
        source_url=r.source_url,
        metadata=r.metadata_json,
    )


# =============================================================================
# 2. CYCLONE FORECAST RUNS & POSITIONS (NOAA NHC)
# =============================================================================


@router.post(
    "/cyclones/sync",
    response_model=CycloneForecastSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest active cyclone forecast runs from NOAA NHC",
)
async def sync_cyclone_forecasts(
    db: Annotated[Session, Depends(get_db)],
) -> CycloneForecastSyncResponse:
    """Retrieve and persist official 5-day future cyclone forecast positions from NOAA NHC."""
    try:
        result = await forecast_repo.sync_cyclone_forecasts(db=db)
        return CycloneForecastSyncResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NOAA NHC cyclone forecast sync failed: {exc!s}",
        ) from exc


@router.get(
    "/cyclones/status",
    response_model=CycloneProviderStatusResponse,
    summary="Get NOAA NHC provider health, freshness, and fallback status",
)
def get_cyclone_provider_status(
    db: Annotated[Session, Depends(get_db)],
) -> CycloneProviderStatusResponse:
    """Report NOAA NHC cyclone forecast pipeline status, data freshness, and coverage."""
    status_data = forecast_repo.get_cyclone_sync_status(db=db)
    return CycloneProviderStatusResponse(**status_data)


@router.get(
    "/cyclones/runs",
    response_model=CycloneForecastRunListResponse,
    summary="List available cyclone forecast runs",
)
def get_cyclone_forecast_runs(
    db: Annotated[Session, Depends(get_db)],
    storm_id: Annotated[
        str | None, Query(description="Optional filter by storm id")
    ] = None,
) -> CycloneForecastRunListResponse:
    """Retrieve persisted official cyclone forecast advisory runs."""
    runs = forecast_repo.get_cyclone_forecast_runs(db=db, storm_id=storm_id)
    items = []
    for r in runs:
        positions = [
            CycloneForecastPositionItem(
                id=p.id,
                lead_time_hours=p.lead_time_hours,
                valid_time=p.valid_time,
                latitude=p.latitude,
                longitude=p.longitude,
                max_wind_knots=p.max_wind_knots,
                wind_gusts_knots=p.wind_gusts_knots,
                min_pressure_hpa=p.min_pressure_hpa,
                classification=p.classification,
                stage_description=p.stage_description,
            )
            for p in r.positions
        ]
        items.append(
            CycloneForecastRunItem(
                id=r.id,
                storm_id=r.storm_id,
                storm_name=r.storm_name,
                basin=r.basin,
                provider=r.provider,
                advisory_number=r.advisory_number,
                issue_time=r.issue_time,
                retrieval_time=r.retrieval_time,
                source_url=r.source_url,
                positions_count=len(positions),
                positions=positions,
            )
        )

    latest_time: datetime | None = None
    if items:
        latest_time = max(r.retrieval_time for r in items)
        freshness = evaluate_freshness(
            latest_time, settings.NOAA_NHC_FRESHNESS_HOURS
        ).value
    else:
        freshness = FreshnessStatus.UNAVAILABLE.value

    track = reliability_tracker.get_record("nhc")
    is_fallback = len(items) > 0 and track.last_attempt_status == SyncOutcome.FAILED

    return CycloneForecastRunListResponse(
        count=len(items),
        freshness=freshness,
        is_fallback=is_fallback,
        geographic_coverage=(
            "eastern_pacific, north_atlantic, central_pacific (Note: Does not cover Indian Ocean)"
        ),
        items=items,
    )


@router.get(
    "/cyclones/runs/{run_id}/positions",
    response_model=list[CycloneForecastPositionItem],
    summary="Get future waypoint positions for a forecast run",
)
def get_cyclone_forecast_positions(
    run_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> list[CycloneForecastPositionItem]:
    """Retrieve chronological predicted future positions along a cyclone advisory run."""
    positions = forecast_repo.get_cyclone_forecast_positions(
        db=db, forecast_run_id=run_id
    )
    return [
        CycloneForecastPositionItem(
            id=p.id,
            lead_time_hours=p.lead_time_hours,
            valid_time=p.valid_time,
            latitude=p.latitude,
            longitude=p.longitude,
            max_wind_knots=p.max_wind_knots,
            wind_gusts_knots=p.wind_gusts_knots,
            min_pressure_hpa=p.min_pressure_hpa,
            classification=p.classification,
            stage_description=p.stage_description,
        )
        for p in positions
    ]
