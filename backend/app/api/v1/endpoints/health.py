import asyncio
from fastapi import APIRouter, Response
from sqlalchemy import text
from app.core.logging import logger
from app.schemas import HealthResponse
from app.core.config import settings
from app.db.session import engine

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health(response: Response):
    """Health check verifying backend service status and database connectivity."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    db_status = "disconnected"
    try:
        # Check database connectivity with a 3.0s timeout to allow for transient startup delay
        async with asyncio.timeout(3.0):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                db_status = "connected"
    except Exception as e:
        # Fallback to synchronous engine check in a thread (handles Windows event loop compatibility)
        try:
            from app.db.hazard_session import hazard_engine
            def _check_sync():
                with hazard_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
            await asyncio.to_thread(_check_sync)
            db_status = "connected"
        except Exception as sync_e:
            logger.warning(f"Database health check failed: {type(sync_e).__name__}: {sync_e}")
            db_status = "disconnected"

    return HealthResponse(
        status="healthy",
        database=db_status,
        version=settings.VERSION,
    )
