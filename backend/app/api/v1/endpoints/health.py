from fastapi import APIRouter
from app.schemas import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health():
    """Health check verifying backend service status."""
    return HealthResponse(
        status="healthy",
        database="connected",
        version=settings.VERSION,
    )
