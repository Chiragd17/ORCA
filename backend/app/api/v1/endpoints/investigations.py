import uuid
from datetime import datetime, timezone
from typing import List, Dict
from fastapi import APIRouter, HTTPException, Path, status
from app.schemas import (
    InvestigationCreateRequest,
    InvestigationCreateResponse,
    InvestigationDetailResponse,
)
from app.orchestrator.service import orchestrator_service, OrchestrationResult
from app.orchestrator.planner import InvestigationPlanner
from app.orchestrator.events import ExecutionEvent
from app.evidence.schemas import EvidenceRecord

router = APIRouter()

# In-memory storage for prototype investigations (can be backed by DB repository)
_INVESTIGATION_CACHE: Dict[str, OrchestrationResult] = {}


@router.get("", response_model=List[InvestigationCreateResponse], tags=["Investigations"])
async def list_investigations():
    """List all cached or executed investigations."""
    return [
        InvestigationCreateResponse(
            investigation_id=k,
            status=v.status,
            workspace=v.workspace,
            created_at=datetime.now(timezone.utc),
            planned_agents=InvestigationPlanner.plan(v.workspace, v.query),
        )
        for k, v in _INVESTIGATION_CACHE.items()
    ]


@router.post("", response_model=InvestigationCreateResponse, status_code=status.HTTP_201_CREATED, tags=["Investigations"])
async def create_investigation(payload: InvestigationCreateRequest):
    """Create and immediately execute an investigation through the Orchestrator."""
    inv_id = f"inv_{uuid.uuid4().hex[:8]}"
    planned_agents = InvestigationPlanner.plan(payload.workspace, payload.query)

    # Execute orchestrator pipeline
    result = await orchestrator_service.execute_investigation(
        investigation_id=inv_id,
        workspace=payload.workspace,
        query=payload.query,
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_km=payload.radius_km,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    _INVESTIGATION_CACHE[inv_id] = result

    return InvestigationCreateResponse(
        investigation_id=inv_id,
        status=result.status,
        workspace=payload.workspace,
        created_at=datetime.now(timezone.utc),
        planned_agents=planned_agents,
    )


@router.get("/{investigation_id}", response_model=InvestigationDetailResponse, tags=["Investigations"])
async def get_investigation(investigation_id: str = Path(...)):
    """Retrieve details and findings of a specific investigation."""
    res = _INVESTIGATION_CACHE.get(investigation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return InvestigationDetailResponse(
        investigation_id=res.investigation_id,
        status=res.status,
        workspace=res.workspace,
        query=res.query,
        findings=res.findings,
        limitations=res.limitations,
        verification_summary=res.verification_summary,
    )


@router.get("/{investigation_id}/events", response_model=List[ExecutionEvent], tags=["Investigations"])
async def get_investigation_events(investigation_id: str = Path(...)):
    """Retrieve chronological execution events for an investigation."""
    res = _INVESTIGATION_CACHE.get(investigation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return res.events


@router.get("/{investigation_id}/evidence", response_model=List[EvidenceRecord], tags=["Investigations"])
async def get_investigation_evidence(investigation_id: str = Path(...)):
    """Retrieve all evidence records collected during an investigation."""
    res = _INVESTIGATION_CACHE.get(investigation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return res.evidence
