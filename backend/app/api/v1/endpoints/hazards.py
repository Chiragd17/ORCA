from typing import Optional
from fastapi import APIRouter, Query
from app.schemas import HazardsListResponse

router = APIRouter()


@router.get("", response_model=HazardsListResponse, tags=["Hazards"])
async def get_hazards(
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    min_lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    max_lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    hazard_type: Optional[str] = Query(None, description="e.g. cyclone, tsunami, surge"),
    status: str = Query("all", description="active, historical, or all"),
):
    """Retrieve hazard events and track records."""
    # Scaffold endpoint to be wired up with real IBTrACS/GDACS database records by Person 2
    return HazardsListResponse(
        count=0,
        hazards=[],
    )
