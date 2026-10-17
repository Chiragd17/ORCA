import asyncio
from fastapi import APIRouter
from sqlalchemy import text
from app.core.logging import logger
from app.schemas import HealthResponse
from app.core.config import settings
from app.db.session import engine

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health():
    """Health check verifying backend service status and database connectivity."""
    db_status = "disconnected"
    try:
        # Check database connectivity with a strict 1.5s timeout to prevent hanging
        async with asyncio.timeout(1.5):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                db_status = "connected"
    except Exception as e:
        logger.warning(f"Database health check failed: {type(e).__name__}: {e}")
        db_status = "disconnected"

    return HealthResponse(
        status="healthy",
        database=db_status,
        version=settings.VERSION,
    )
