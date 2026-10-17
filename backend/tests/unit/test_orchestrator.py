import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import pytest

from app.orchestrator.service import orchestrator_service, OrchestrationResult
from app.orchestrator.planner import InvestigationPlanner, ExecutionPlan, PlanStep
from app.orchestrator.events import ExecutionEventType
from app.evidence.schemas import VerificationState, VerificationSummary
from app.agents.base import InvestigationTask, AgentResult, Finding, AgentStatus


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
    assert result.final_answer is not None
    assert "Executive Intelligence Synthesis" in result.final_answer


def test_orchestrator_routing_capabilities():
    """Verify deterministic routing across specialist domains without unnecessary agent dispatch."""
    # 1. Marine condition request
    agents_marine = InvestigationPlanner.plan("fisherman", "High wave alert and swell forecast offshore")
    assert "marine_hazard" in agents_marine
    assert "evidence_verification" in agents_marine

    # 2. Historical ocean research request
    agents_ocean = InvestigationPlanner.plan("marine_monitoring", "Historical SST anomaly and chlorophyll-a trends")
    assert "ocean_research" in agents_ocean
    assert "evidence_verification" in agents_ocean
    assert "coastal_risk" not in agents_ocean  # Unrelated agent not called

    # 3. Coastal exposure request
    agents_coastal = InvestigationPlanner.plan("coastal_authority", "Population settlement exposure and infrastructure risk in Udupi")
    assert "coastal_risk" in agents_coastal
    assert "evidence_verification" in agents_coastal

    # 4. Multi-domain compound request
    agents_compound = InvestigationPlanner.plan("disaster_management", "Cyclone storm surge wave impact on coastal Karnataka population")
    assert "marine_hazard" in agents_compound
    assert "coastal_risk" in agents_compound
    assert "evidence_verification" in agents_compound

    # 5. Evidence verification is always the final agent
    assert agents_marine[-1] == "evidence_verification"
    assert agents_ocean[-1] == "evidence_verification"
    assert agents_compound[-1] == "evidence_verification"


def test_orchestrator_structured_execution_plan():
    """Verify structured execution plan creation, dependency graph, and coordinate bounding."""
    plan = InvestigationPlanner.create_plan(
        workspace="disaster_management",
        query="Cyclone Tauktae wave surge and coastal population exposure in Karnataka",
        latitude=13.25,
        longitude=74.75,
        radius_km=100.0,
    )

    assert isinstance(plan, ExecutionPlan)
    assert plan.plan_id.startswith("plan_")
    assert plan.workspace == "disaster_management"
    assert plan.target_coordinates["latitude"] == 13.25
    assert plan.target_coordinates["longitude"] == 74.75
    assert plan.target_coordinates["radius_km"] == 100.0

    # Verify dependency structure
    concurrent_steps = plan.get_concurrent_steps()
    dependent_steps = plan.get_dependent_steps()
    verification_step = plan.get_verification_step()

    assert any(s.agent_id == "marine_hazard" for s in concurrent_steps)
    assert any(s.agent_id == "coastal_risk" for s in dependent_steps)
    assert verification_step is not None
    assert verification_step.agent_id == "evidence_verification"
    assert "step_marine_hazard" in verification_step.dependencies


def test_orchestrator_agent_registry():
    """Verify that agent registry lists all 4 specialists + master orchestrator with capabilities."""
    registry = orchestrator_service.get_registry()
    assert len(registry) == 5

    agent_ids = [r["agent_id"] for r in registry]
    assert "orchestrator" in agent_ids
    assert "ocean_research" in agent_ids
    assert "marine_hazard" in agent_ids
    assert "coastal_risk" in agent_ids
    assert "evidence_verification" in agent_ids

    for agent in registry:
        assert agent["status"] == "LIVE"
        assert len(agent["capabilities"]) > 0
        assert agent["registered"] is True


def test_orchestrator_evidence_and_verification_integration():
    """Verify that claims and evidence reach the real verification engine and audit outcomes are preserved."""
    result = asyncio.run(orchestrator_service.execute_investigation(
        investigation_id="inv_test_orch_verif",
        workspace="marine_monitoring",
        query="Verify sea surface temperature baseline near Karwar",
        latitude=14.80,
        longitude=74.12,
    ))

    assert result.verification_summary is not None
    # Check that events contain verification lifecycle events
    event_types = [e.event_type for e in result.events]
    assert ExecutionEventType.VERIFICATION_STARTED in event_types
    assert (
        ExecutionEventType.VERIFICATION_PASSED in event_types
        or ExecutionEventType.VERIFICATION_FAILED in event_types
    )
    assert len(result.evidence) > 0


def test_orchestrator_failure_resilience_and_partial_result():
    """Verify that transient specialist failure is bounded and recorded as partial without fabricating results."""
    # Temporarily mock an agent to simulate failure
    with patch.object(orchestrator_service.agents["ocean_research"], "run", new_callable=AsyncMock) as mock_run:
        mock_run.side_effect = RuntimeError("External telemetry satellite timeout")

        result = asyncio.run(orchestrator_service.execute_investigation(
            investigation_id="inv_test_orch_fail",
            workspace="fisherman",
            query="Check sea surface temperature and wave conditions",
        ))

        # Verify that failure is recorded truthfully (partial or failed, never falsely reported as completed)
        assert result.status in ("partial", "failed")
        assert result.status != "completed"
        assert any("External telemetry satellite timeout" in lim or "failed after" in lim for lim in result.limitations)
        
        # Check event bus logged the retry/failure
        event_types = [e.event_type for e in result.events]
        assert ExecutionEventType.AGENT_FAILED in event_types or ExecutionEventType.AGENT_RETRY in event_types


def test_orchestrator_final_answer_synthesis():
    """Verify executive markdown report incorporates provenance, audit grade, and safety notice."""
    result = asyncio.run(orchestrator_service.execute_investigation(
        investigation_id="inv_test_orch_synth",
        workspace="coastal_authority",
        query="Assess coastal infrastructure exposure in Dakshina Kannada",
        latitude=12.91,
        longitude=74.85,
    ))

    report = result.final_answer
    assert report is not None
    assert "Executive Intelligence Synthesis" in report
    assert "Specialist Observations & Findings" in report
    assert "Evidence Integrity & Cryptographic Provenance" in report
    assert "Scientific Verification Audit" in report
    assert "Official Warning:" in report
    assert "India Meteorological Department (IMD)" in report


def test_orchestrator_persistence_layer():
    """Verify that investigation, findings, and events persist safely into storage tier."""
    result = asyncio.run(orchestrator_service.execute_investigation(
        investigation_id="inv_test_orch_persist",
        workspace="fisherman",
        query="Offshore wave monitoring near Malpe port",
        latitude=13.35,
        longitude=74.70,
    ))

    assert result.storage_tier in ("postgres_durable", "in_memory_cached")
    assert result.created_at is not None
    assert result.completed_at is not None
