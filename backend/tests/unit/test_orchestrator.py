import asyncio
import pytest
from app.orchestrator.service import orchestrator_service
from app.orchestrator.events import ExecutionEventType
from app.evidence.schemas import VerificationState


def test_orchestrator_execution_pipeline():
    """Verify that orchestrator executes planned agents and produces genuine execution events."""
    result = asyncio.run(orchestrator_service.execute_investigation(
        investigation_id="inv_test_orch_001",
        workspace="fisherman",
        query="Check waves offshore near Mangaluru",
    ))

    assert result.investigation_id == "inv_test_orch_001"
    assert result.status == "completed"
    assert len(result.events) > 0

    event_types = [e.event_type for e in result.events]
    assert ExecutionEventType.INVESTIGATION_STARTED in event_types
    assert ExecutionEventType.AGENT_STARTED in event_types
    assert ExecutionEventType.INVESTIGATION_COMPLETED in event_types
    assert result.verification_summary is not None
