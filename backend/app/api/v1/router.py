from fastapi import APIRouter
from app.api.v1.endpoints import marine, hazards, forecasts, investigations, reports

api_router = APIRouter()

api_router.include_router(marine.router, prefix="/marine", tags=["Marine"])
api_router.include_router(hazards.router)
api_router.include_router(forecasts.router)
api_router.include_router(investigations.router, prefix="/investigations", tags=["Investigations"])
api_router.include_router(reports.router, prefix="/investigations", tags=["Reports"])
