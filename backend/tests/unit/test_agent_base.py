import pytest
from app.agents.base import BaseAgent, InvestigationTask, AgentResult, Finding, AgentStatus
from app.agents.ocean_research.agent import OceanResearchAgent
from app.agents.marine_hazard.agent import MarineHazardAgent
from app.agents.coastal_risk.agent import CoastalRiskAgent
from app.agents.evidence_verification.agent import EvidenceVerificationAgent
from app.evidence.schemas import EvidenceRecord, VerificationState
from app.evidence.verification import verify_evidence_linkages
from app.orchestrator.planner import InvestigationPlanner


def test_specialist_agents_inheritance():
    """Verify that all four specialist agents inherit from BaseAgent."""
    agents = [
        OceanResearchAgent(),
        MarineHazardAgent(),
        CoastalRiskAgent(),
        EvidenceVerificationAgent(),
    ]
    for agent in agents:
        assert isinstance(agent, BaseAgent)
        assert hasattr(agent, "agent_id")
        assert hasattr(agent, "run")


def test_agent_run_returns_agent_result():
    """Verify that agents return a valid AgentResult complying with the shared contract."""
    import asyncio
    agent = OceanResearchAgent()
    task = InvestigationTask(
        investigation_id="test_inv_001",
        workspace="fisherman",
        query="Check sea surface temperature near Mangaluru",
    )
    result = asyncio.run(agent.run(task))

    assert isinstance(result, AgentResult)
    assert result.agent_id == "ocean_research"
    assert result.status in [AgentStatus.COMPLETED, AgentStatus.PARTIAL, AgentStatus.UNAVAILABLE, AgentStatus.FAILED]
    assert isinstance(result.findings, list)
    assert isinstance(result.evidence, list)
    assert isinstance(result.limitations, list)


def test_investigation_planner_selection():
    """Verify deterministic agent planning per workspace."""
    agents_fisherman = InvestigationPlanner.plan("fisherman", "Wave forecast offshore")
    assert "ocean_research" in agents_fisherman
    assert "evidence_verification" in agents_fisherman
    assert agents_fisherman[-1] == "evidence_verification"

    agents_disaster = InvestigationPlanner.plan("disaster_management", "Track cyclone in Arabian Sea")
    assert "marine_hazard" in agents_disaster
    assert "evidence_verification" in agents_disaster


def test_evidence_verification_logic():
    """Verify that verification correctly detects presence and absence of evidence."""
    evidence = [
        EvidenceRecord(
            evidence_id="evi_test_1",
            source_name="Test Source",
            source_identifier="test:1",
            data_type="sst",
        )
    ]

    # Finding referencing existing evidence
    verified_finding = {
        "finding_id": "f_1",
        "claim": "SST is 29C",
        "evidence_ids": ["evi_test_1"]
    }
    summary = verify_evidence_linkages("inv_1", [verified_finding], evidence)
    assert summary.overall_status == VerificationState.VERIFIED
    assert summary.verified_findings_count == 1

    # Finding referencing missing evidence
    unverified_finding = {
        "finding_id": "f_2",
        "claim": "Wave height is 4m",
        "evidence_ids": ["evi_missing_999"]
    }
    summary_missing = verify_evidence_linkages("inv_2", [unverified_finding], evidence)
    assert summary_missing.overall_status == VerificationState.NEEDS_REVIEW
    assert summary_missing.flagged_findings_count == 1
