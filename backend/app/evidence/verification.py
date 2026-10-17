from typing import List
from app.evidence.schemas import (
    EvidenceRecord,
    FindingVerification,
    VerificationState,
    VerificationSummary,
)


def verify_evidence_linkages(
    investigation_id: str,
    findings: List[dict],
    evidence_records: List[EvidenceRecord],
) -> VerificationSummary:
    """Deterministic verification function checking if findings link to valid evidence records."""
    available_ids = {
        (getattr(e, "evidence_id", None) or getattr(e, "id", None))
        for e in evidence_records
        if (getattr(e, "evidence_id", None) or getattr(e, "id", None))
    }
    details: List[FindingVerification] = []

    verified_count = 0
    unverified_count = 0
    flagged_count = 0

    for f in findings:
        finding_id = f.get("finding_id") or f.get("id") or "unknown"
        evidence_ids = f.get("evidence_ids", [])

        if not evidence_ids:
            state = VerificationState.UNVERIFIED
            unverified_count += 1
            details.append(FindingVerification(
                finding_id=finding_id,
                state=state,
                supporting_evidence_ids=[],
                missing_evidence_ids=[],
                notes="No evidence IDs referenced by finding"
            ))
            continue

        missing = [eid for eid in evidence_ids if eid not in available_ids]
        supporting = [eid for eid in evidence_ids if eid in available_ids]

        if missing:
            state = VerificationState.INSUFFICIENT_EVIDENCE
            flagged_count += 1
            details.append(FindingVerification(
                finding_id=finding_id,
                state=state,
                supporting_evidence_ids=supporting,
                missing_evidence_ids=missing,
                notes=f"Missing referenced evidence IDs: {missing}"
            ))
        else:
            state = VerificationState.VERIFIED
            verified_count += 1
            details.append(FindingVerification(
                finding_id=finding_id,
                state=state,
                supporting_evidence_ids=supporting,
                missing_evidence_ids=[],
                notes="All supporting evidence records confirmed present"
            ))

    if flagged_count > 0:
        overall = VerificationState.NEEDS_REVIEW
    elif unverified_count > 0 and verified_count == 0:
        overall = VerificationState.UNVERIFIED
    elif unverified_count > 0:
        overall = VerificationState.NEEDS_REVIEW
    else:
        overall = VerificationState.VERIFIED

    return VerificationSummary(
        investigation_id=investigation_id,
        overall_status=overall,
        verified_findings_count=verified_count,
        unverified_findings_count=unverified_count,
        flagged_findings_count=flagged_count,
        details=details,
        notes=f"Verified {verified_count} findings against {len(evidence_records)} evidence records."
    )


def verify_findings(findings: list, registry: any) -> dict:
    """
    Deterministically evaluates a list of findings against the evidence registry.
    Returns verification summary metrics and updates finding verification statuses.
    """
    from app.schemas.evidence import VerificationStatus

    total = len(findings)
    verified_count = 0
    unverified_count = 0
    insufficient_count = 0

    for finding in findings:
        if not finding.evidence_ids:
            finding.verification_status = VerificationStatus.INSUFFICIENT_EVIDENCE
            insufficient_count += 1
            continue

        # Check if all referenced evidence records exist
        missing_ids = [eid for eid in finding.evidence_ids if not registry.get(eid)]
        if missing_ids:
            finding.verification_status = VerificationStatus.INSUFFICIENT_EVIDENCE
            insufficient_count += 1
        else:
            finding.verification_status = VerificationStatus.VERIFIED
            verified_count += 1

    return {
        "total_findings": total,
        "verified": verified_count,
        "unverified": unverified_count,
        "insufficient_evidence": insufficient_count,
        "verification_rate": (verified_count / total) if total > 0 else 0.0,
    }
