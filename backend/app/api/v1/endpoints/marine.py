from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query
from app.schemas import MarineObservationsResponse

router = APIRouter()


@router.get("/observations", response_model=MarineObservationsResponse, tags=["Marine"])
async def get_marine_observations(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    start_time: Optional[datetime] = Query(None, description="Start time UTC"),
    end_time: Optional[datetime] = Query(None, description="End time UTC"),
    variables: Optional[str] = Query(None, description="Comma-separated variables, e.g. sst,wave_height"),
):
    """Retrieve marine observations for a specific coordinate and time window."""
    # Scaffold endpoint to be wired up with real database/provider queries by Person 1
    return MarineObservationsResponse(
        location={"latitude": lat, "longitude": lon},
        temporal_coverage={"start": start_time, "end": end_time},
        observations=[],
    )
