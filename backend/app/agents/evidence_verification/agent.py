from app.agents.base import BaseAgent, InvestigationTask, AgentResult, AgentStatus
from app.evidence.schemas import VerificationState, VerificationSummary
from app.evidence.verification import verify_evidence_linkages


class EvidenceVerificationAgent(BaseAgent):
    """
    Agent 4: Evidence & Scientific Verification Agent (Assigned: Person 3)
    Responsibilities:
    - Validate that findings reference existing evidence records
    - Check source metadata, freshness, units, coordinate bounds
    - Reproduce deterministic calculations
    - Assign explicit verification states: verified, unverified, needs_review, conflicting, insufficient_evidence
    """
    agent_id: str = "evidence_verification"
    name: str = "Evidence & Scientific Verification Agent"
    description: str = "Evaluates whether investigation findings are supported by available evidence."

    async def run(self, task: InvestigationTask) -> AgentResult:
        # Scaffold implementation to be expanded by Person 3
        return AgentResult(
            agent_id=self.agent_id,
            status=AgentStatus.COMPLETED,
            findings=[],
            evidence=[],
            limitations=["Evidence Verification Agent scaffold initialized."],
            errors=[],
            metadata={"task_id": task.investigation_id}
        )

    def verify(self, investigation_id: str, findings: list, evidence: list) -> VerificationSummary:
        return verify_evidence_linkages(investigation_id, findings, evidence)
