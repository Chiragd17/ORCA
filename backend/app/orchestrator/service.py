import uuid
from typing import Dict, List, Optional
from datetime import datetime, timezone

from app.agents.base import BaseAgent, InvestigationTask, AgentResult, Finding, AgentStatus
from app.agents.ocean_research.agent import OceanResearchAgent
from app.agents.marine_hazard.agent import MarineHazardAgent
from app.agents.coastal_risk.agent import CoastalRiskAgent
from app.agents.evidence_verification.agent import EvidenceVerificationAgent
from app.evidence.schemas import EvidenceRecord, VerificationSummary, VerificationState
from app.orchestrator.events import ExecutionEvent, ExecutionEventType
from app.orchestrator.planner import InvestigationPlanner


class OrchestrationResult:
    def __init__(
        self,
        investigation_id: str,
        workspace: str,
        query: str,
        status: str,
        findings: List[Finding],
        evidence: List[EvidenceRecord],
        limitations: List[str],
        events: List[ExecutionEvent],
        verification_summary: Optional[VerificationSummary] = None,
    ):
        self.investigation_id = investigation_id
        self.workspace = workspace
        self.query = query
        self.status = status
        self.findings = findings
        self.evidence = evidence
        self.limitations = limitations
        self.events = events
        self.verification_summary = verification_summary


class OrchestratorService:
    """Shared Orchestrator coordinating all 4 specialist agents."""

    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {
            "ocean_research": OceanResearchAgent(),
            "marine_hazard": MarineHazardAgent(),
            "coastal_risk": CoastalRiskAgent(),
            "evidence_verification": EvidenceVerificationAgent(),
        }

    async def execute_investigation(
        self,
        investigation_id: str,
        workspace: str,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: Optional[float] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> OrchestrationResult:
        events: List[ExecutionEvent] = []

        # 1. Start investigation
        events.append(ExecutionEvent(
            investigation_id=investigation_id,
            event_type=ExecutionEventType.INVESTIGATION_STARTED,
            details={"workspace": workspace, "query": query}
        ))

        # 2. Plan agent execution
        planned_agent_ids = InvestigationPlanner.plan(workspace, query)

        task = InvestigationTask(
            investigation_id=investigation_id,
            workspace=workspace,
            query=query,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            start_time=start_time,
            end_time=end_time,
        )

        all_findings: List[Finding] = []
        all_evidence: List[EvidenceRecord] = []
        all_limitations: List[str] = []

        # 3. Execute specialist agents (except verification)
        for agent_id in planned_agent_ids:
            if agent_id == "evidence_verification":
                continue

            agent = self.agents.get(agent_id)
            if not agent:
                continue

            events.append(ExecutionEvent(
                investigation_id=investigation_id,
                event_type=ExecutionEventType.AGENT_STARTED,
                agent_id=agent_id,
            ))

            try:
                res: AgentResult = await agent.run(task)
                all_findings.extend(res.findings)
                all_evidence.extend(res.evidence)
                all_limitations.extend(res.limitations)

                if res.evidence:
                    events.append(ExecutionEvent(
                        investigation_id=investigation_id,
                        event_type=ExecutionEventType.EVIDENCE_ADDED,
                        agent_id=agent_id,
                        details={"evidence_count": len(res.evidence)}
                    ))

                events.append(ExecutionEvent(
                    investigation_id=investigation_id,
                    event_type=ExecutionEventType.AGENT_COMPLETED,
                    agent_id=agent_id,
                    details={"status": res.status.value, "findings_count": len(res.findings)}
                ))
            except Exception as e:
                events.append(ExecutionEvent(
                    investigation_id=investigation_id,
                    event_type=ExecutionEventType.AGENT_COMPLETED,
                    agent_id=agent_id,
                    details={"status": "failed", "error": str(e)}
                ))
                all_limitations.append(f"Agent {agent_id} failed: {str(e)}")

        # 4. Execute Verification Agent
        verification_agent: EvidenceVerificationAgent = self.agents["evidence_verification"]
        events.append(ExecutionEvent(
            investigation_id=investigation_id,
            event_type=ExecutionEventType.AGENT_STARTED,
            agent_id="evidence_verification",
        ))

        findings_dicts = [f.model_dump() for f in all_findings]
        verification_summary = verification_agent.verify(investigation_id, findings_dicts, all_evidence)

        if verification_summary.overall_status in (VerificationState.VERIFIED,):
            events.append(ExecutionEvent(
                investigation_id=investigation_id,
                event_type=ExecutionEventType.VERIFICATION_PASSED,
                agent_id="evidence_verification",
                details={"status": verification_summary.overall_status.value}
            ))
        else:
            events.append(ExecutionEvent(
                investigation_id=investigation_id,
                event_type=ExecutionEventType.VERIFICATION_FAILED,
                agent_id="evidence_verification",
                details={"status": verification_summary.overall_status.value, "notes": verification_summary.notes}
            ))

        events.append(ExecutionEvent(
            investigation_id=investigation_id,
            event_type=ExecutionEventType.AGENT_COMPLETED,
            agent_id="evidence_verification",
            details={"status": "completed"}
        ))

        # 5. Complete investigation
        events.append(ExecutionEvent(
            investigation_id=investigation_id,
            event_type=ExecutionEventType.INVESTIGATION_COMPLETED,
            details={"findings_count": len(all_findings), "evidence_count": len(all_evidence)}
        ))

        return OrchestrationResult(
            investigation_id=investigation_id,
            workspace=workspace,
            query=query,
            status="completed",
            findings=all_findings,
            evidence=all_evidence,
            limitations=all_limitations,
            events=events,
            verification_summary=verification_summary,
        )


orchestrator_service = OrchestratorService()
