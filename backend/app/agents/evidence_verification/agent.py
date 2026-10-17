import uuid
from typing import List, Dict, Any, Optional

from app.agents.base import BaseAgent, InvestigationTask, AgentResult, AgentStatus
from app.evidence.schemas import VerificationState, VerificationSummary, FindingVerification
from app.agents.evidence_verification.models import (
    VerificationStatus,
    VerificationRun,
    NormalizedClaim,
    VerificationFinding,
)
from app.agents.evidence_verification.engine import verification_engine


class EvidenceVerificationAgent(BaseAgent):
    """
    Agent 4: Evidence & Scientific Verification Agent (Assigned: Person 3/4)
    Responsibilities:
    - Validate that findings reference existing evidence records
    - Check source provenance, metadata, cryptographic SHA-256 integrity
    - Check temporal scope, observation vs forecast separation, and physical units
    - Reproduce deterministic arithmetic calculations (anomalies, wind conversions, distances)
    - Detect and quantify cross-source conflicts between competing feeds
    - Assign standardized scientific verification states: matched, unmet, potential_gap, unverified, conflicting, needs_review
    """
    agent_id: str = "evidence_verification"
    name: str = "Evidence & Scientific Verification Agent"
    description: str = "Independently verifies scientific claims, evidence provenance, data quality, calculations, source conflicts, and uncertainty."

    def __init__(self):
        self.engine = verification_engine

    async def run(self, task: InvestigationTask) -> AgentResult:
        """Execute scientific verification analysis for an investigation task."""
        # 1. Extract findings/claims from task parameters or context
        raw_claims = task.parameters.get("claims") or task.parameters.get("findings") or []
        evidence_list = task.parameters.get("evidence") or []

        # If empty, attempt to check if findings are in context
        if not raw_claims and task.context:
            raw_claims = task.context.get("claims") or task.context.get("findings") or []
        if not evidence_list and task.context:
            evidence_list = task.context.get("evidence") or []

        normalized_claims = self.engine.normalize_claims(
            raw_findings=raw_claims,
            producer_agent=task.parameters.get("producer_agent", "upstream_agent"),
            execution_id=task.investigation_id,
        )

        run_record: VerificationRun = self.engine.verify_claims(
            claims=normalized_claims,
            evidence_records=evidence_list,
            investigation_id=task.investigation_id,
            target_time=task.target_time or task.end_time,
        )

        # Convert findings into AgentResult format
        emitted_findings = []
        for f in run_record.findings:
            emitted_findings.append({
                "id": f"vfind_{f.finding_code.lower()}_{uuid.uuid4().hex[:6]}",
                "finding_id": f"vfind_{f.finding_code.lower()}_{uuid.uuid4().hex[:6]}",
                "claim": f.explanation,
                "category": "scientific_interpretation",
                "evidence_ids": f.evidence_ids,
                "severity": f.severity,
                "verification_status": run_record.overall_scientific_state.value,
                "verification_state": run_record.overall_scientific_state.value,
                "metadata": {
                    "finding_code": f.finding_code,
                    "recommended_action": f.recommended_action,
                    "competing_values": f.competing_values,
                }
            })

        status = AgentStatus.COMPLETED
        if run_record.overall_scientific_state in (VerificationStatus.CONFLICTING, VerificationStatus.UNMET):
            status = AgentStatus.PARTIAL

        return AgentResult(
            agent_id=self.agent_id,
            status=status,
            findings=emitted_findings,
            evidence=evidence_list,
            limitations=run_record.limitations,
            errors=[],
            metadata={
                "run_id": run_record.run_id,
                "investigation_id": task.investigation_id,
                "overall_scientific_state": run_record.overall_scientific_state.value,
                "total_claims": run_record.total_claims,
                "matched_count": run_record.matched_count,
                "unverified_count": run_record.unverified_count,
                "conflicting_count": run_record.conflicting_count,
                "needs_review_count": run_record.needs_review_count,
                "checks_completed": run_record.checks_completed,
                "checks_failed": run_record.checks_failed,
                "checks_skipped": run_record.checks_skipped,
            }
        )

    def verify(self, investigation_id: str, findings: list, evidence: list) -> VerificationSummary:
        """
        Orchestrator-compatible verification hook.
        Executes full deterministic check suite and returns backwards-compatible VerificationSummary.
        """
        normalized = self.engine.normalize_claims(findings, execution_id=investigation_id)
        run_record = self.engine.verify_claims(normalized, evidence, investigation_id=investigation_id)

        details: List[FindingVerification] = []
        for clm in run_record.claims:
            state_map = {
                VerificationStatus.MATCHED: VerificationState.VERIFIED,
                VerificationStatus.UNVERIFIED: VerificationState.UNVERIFIED,
                VerificationStatus.CONFLICTING: VerificationState.CONFLICTING,
                VerificationStatus.NEEDS_REVIEW: VerificationState.NEEDS_REVIEW,
                VerificationStatus.POTENTIAL_GAP: VerificationState.NEEDS_REVIEW,
                VerificationStatus.UNMET: VerificationState.NEEDS_REVIEW,
            }
            v_state = state_map.get(clm.status, VerificationState.UNVERIFIED)

            missing_eids = [
                eid for eid in clm.evidence_ids
                if not any(
                    (getattr(e, "evidence_id", None) or getattr(e, "id", None)) == eid
                    for e in evidence
                )
            ]
            supporting_eids = [eid for eid in clm.evidence_ids if eid not in missing_eids]

            reproduced = None
            if clm.reproduced_calculation and "recomputed_value" in clm.reproduced_calculation:
                reproduced = True

            details.append(FindingVerification(
                finding_id=clm.claim_id,
                state=v_state,
                supporting_evidence_ids=supporting_eids,
                missing_evidence_ids=missing_eids,
                reproduced_calculation=reproduced,
                notes=clm.reason
            ))

        overall_map = {
            VerificationStatus.MATCHED: VerificationState.VERIFIED,
            VerificationStatus.UNVERIFIED: VerificationState.UNVERIFIED,
            VerificationStatus.CONFLICTING: VerificationState.CONFLICTING,
            VerificationStatus.NEEDS_REVIEW: VerificationState.NEEDS_REVIEW,
            VerificationStatus.POTENTIAL_GAP: VerificationState.NEEDS_REVIEW,
            VerificationStatus.UNMET: VerificationState.NEEDS_REVIEW,
        }
        overall_state = overall_map.get(run_record.overall_scientific_state, VerificationState.UNVERIFIED)

        # Backwards compatibility layer for orchestrator contract:
        # If claims have valid evidence resolution and no material conflicts, unmet constraints, or missing evidence,
        # the overall investigation verification state is VERIFIED, while preserving granular findings in details.
        if (
            run_record.matched_count > 0
            and run_record.conflicting_count == 0
            and run_record.unmet_count == 0
            and run_record.unverified_count == 0
        ):
            overall_state = VerificationState.VERIFIED

        return VerificationSummary(
            investigation_id=investigation_id,
            overall_status=overall_state,
            verified_findings_count=run_record.matched_count,
            unverified_findings_count=run_record.unverified_count,
            flagged_findings_count=run_record.conflicting_count + run_record.needs_review_count + run_record.unmet_count,
            details=details,
            notes=f"Scientific verification run {run_record.run_id}: {run_record.matched_count}/{run_record.total_claims} claims matched, {run_record.checks_completed} checks passed."
        )
