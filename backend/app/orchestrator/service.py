import uuid
from typing import Dict, List, Optional, Any
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
        workspace: Any,
        query: str,
        status: Any,
        findings: List[Any],
        evidence: List[Any],
        limitations: List[str],
        events: List[Any],
        verification_summary: Optional[Any] = None,
        created_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
    ):
        self.investigation_id = investigation_id
        self.workspace = workspace
        self.query = query
        self.prompt = query
        self.status = status
        self.findings = findings
        self.evidence = evidence
        self.limitations = limitations
        self.events = events
        self.verification_summary = verification_summary
        self.created_at = created_at or datetime.now(timezone.utc)
        self.completed_at = completed_at or datetime.now(timezone.utc)

    @property
    def id(self) -> str:
        return self.investigation_id


class OrchestratorService:
    """Shared Orchestrator coordinating all 4 specialist agents."""

    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {
            "ocean_research": OceanResearchAgent(),
            "marine_hazard": MarineHazardAgent(),
            "coastal_risk": CoastalRiskAgent(),
            "evidence_verification": EvidenceVerificationAgent(),
        }
        self._agents = self.agents
        self._event_buses: Dict[str, Any] = {}
        self._evidence_registries: Dict[str, Any] = {}

    def get_event_bus(self, investigation_id: str) -> Any:
        if investigation_id not in self._event_buses:
            from app.orchestrator.events import EventBus
            self._event_buses[investigation_id] = EventBus(investigation_id)
        return self._event_buses[investigation_id]

    def get_evidence_registry(self, investigation_id: str) -> Any:
        if investigation_id not in self._evidence_registries:
            from app.evidence.registry import EvidenceRegistry
            self._evidence_registries[investigation_id] = EvidenceRegistry()
        return self._evidence_registries[investigation_id]

    async def execute_investigation(
        self,
        investigation_id: Any = None,
        workspace: Optional[str] = None,
        query: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: Optional[float] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        *args,
        **kwargs
    ) -> Any:
        # Determine whether called with a request object (Person 1) or keyword/positional params (Person 3)
        if hasattr(investigation_id, "workspace"):
            req = investigation_id
            inv_id = str(workspace) if workspace else kwargs.get("investigation_id", f"inv_{uuid.uuid4().hex[:8]}")
            ws = req.workspace
            ws_str = req.workspace.value if hasattr(req.workspace, "value") else str(req.workspace)
            q = getattr(req, "prompt", None) or getattr(req, "query", "")
            lat = getattr(req, "latitude", None)
            lon = getattr(req, "longitude", None)
            rad = getattr(req, "radius_km", None)
            st = getattr(req, "start_time", None)
            et = getattr(req, "end_time", None) or getattr(req, "target_time", None)
            context = getattr(req, "parameters", {}) or {}
            is_request_obj = True
        else:
            inv_id = str(investigation_id or kwargs.get("investigation_id") or f"inv_{uuid.uuid4().hex[:8]}")
            ws = str(workspace or kwargs.get("workspace"))
            ws_str = str(workspace or kwargs.get("workspace"))
            q = str(query or kwargs.get("query", ""))
            lat = latitude or kwargs.get("latitude")
            lon = longitude or kwargs.get("longitude")
            rad = radius_km or kwargs.get("radius_km")
            st = start_time or kwargs.get("start_time")
            et = end_time or kwargs.get("end_time")
            context = kwargs.get("parameters", {})
            is_request_obj = False

        event_bus = self.get_event_bus(inv_id)
        evidence_reg = self.get_evidence_registry(inv_id)
        events: List[ExecutionEvent] = []

        # 1. Start investigation
        evt_start = event_bus.emit(
            ExecutionEventType.INVESTIGATION_STARTED,
            details={"workspace": ws_str, "query": q, "prompt": q}
        )
        events.append(evt_start)

        # 2. Plan agent execution
        planned_agent_ids = InvestigationPlanner.plan(ws_str, q)
        evt_plan = event_bus.emit(
            ExecutionEventType.TOOL_COMPLETED,
            details={"tool": "planner", "selected_agents": planned_agent_ids}
        )
        events.append(evt_plan)

        task = InvestigationTask(
            investigation_id=inv_id,
            workspace=ws_str,
            query=q,
            prompt=q,
            latitude=lat,
            longitude=lon,
            radius_km=rad,
            start_time=st,
            end_time=et,
            target_time=et,
            parameters=context,
            context=context,
        )

        all_findings: List[Any] = []
        all_evidence: List[Any] = []
        all_limitations: List[str] = []

        # 3. Execute specialist agents (except verification)
        for agent_id in planned_agent_ids:
            if agent_id == "evidence_verification":
                continue

            agent = self.agents.get(agent_id)
            if not agent:
                continue

            evt_agent_start = event_bus.emit(
                ExecutionEventType.AGENT_STARTED,
                agent_id=agent_id,
            )
            events.append(evt_agent_start)

            try:
                res: AgentResult = await agent.run(task)
                all_findings.extend(res.findings)
                all_evidence.extend(res.evidence)
                all_limitations.extend(res.limitations)
                if res.evidence:
                    evidence_reg.register_many(res.evidence)
                    evt_ev = event_bus.emit(
                        ExecutionEventType.EVIDENCE_ADDED,
                        agent_id=agent_id,
                        details={"evidence_count": len(res.evidence)}
                    )
                    events.append(evt_ev)

                evt_agent_done = event_bus.emit(
                    ExecutionEventType.AGENT_COMPLETED,
                    agent_id=agent_id,
                    details={"status": res.status.value, "findings_count": len(res.findings)}
                )
                events.append(evt_agent_done)
            except Exception as e:
                evt_err = event_bus.emit(
                    ExecutionEventType.AGENT_COMPLETED,
                    agent_id=agent_id,
                    details={"status": "failed", "error": str(e)}
                )
                events.append(evt_err)
                all_limitations.append(f"Agent {agent_id} failed: {str(e)}")

        # 4. Execute Verification Agent
        evt_verif_start = event_bus.emit(
            ExecutionEventType.AGENT_STARTED,
            agent_id="evidence_verification",
        )
        events.append(evt_verif_start)

        verification_agent: EvidenceVerificationAgent = self.agents["evidence_verification"]
        findings_dicts = [f.model_dump() if hasattr(f, "model_dump") else (f.__dict__ if hasattr(f, "__dict__") else f) for f in all_findings]
        verification_summary = verification_agent.verify(inv_id, findings_dicts, all_evidence)

        passed = False
        if hasattr(verification_summary, "overall_status"):
            passed = verification_summary.overall_status in (VerificationState.VERIFIED,)
        elif isinstance(verification_summary, dict):
            passed = verification_summary.get("verified", 0) > 0 and verification_summary.get("insufficient_evidence", 0) == 0

        if passed:
            evt_verif_res = event_bus.emit(
                ExecutionEventType.VERIFICATION_PASSED,
                agent_id="evidence_verification",
                details={"status": "verified"}
            )
        else:
            evt_verif_res = event_bus.emit(
                ExecutionEventType.VERIFICATION_FAILED,
                agent_id="evidence_verification",
                details={"status": "needs_review"}
            )
        events.append(evt_verif_res)

        evt_verif_done = event_bus.emit(
            ExecutionEventType.AGENT_COMPLETED,
            agent_id="evidence_verification",
            details={"status": "completed"}
        )
        events.append(evt_verif_done)

        # 5. Complete investigation
        evt_inv_done = event_bus.emit(
            ExecutionEventType.INVESTIGATION_COMPLETED,
            details={"findings_count": len(all_findings), "evidence_count": len(all_evidence)}
        )
        events.append(evt_inv_done)

        status_val = "completed"
        if is_request_obj:
            from app.schemas.investigations import InvestigationStatus
            status_val = InvestigationStatus.COMPLETED

        return OrchestrationResult(
            investigation_id=inv_id,
            workspace=ws,
            query=q,
            status=status_val,
            findings=all_findings,
            evidence=all_evidence,
            limitations=all_limitations,
            events=events,
            verification_summary=verification_summary,
        )


orchestrator_service = OrchestratorService()
