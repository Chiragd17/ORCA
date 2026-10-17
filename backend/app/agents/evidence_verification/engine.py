import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union

from app.agents.evidence_verification.models import (
    ClaimType,
    VerificationStatus,
    CheckOutcome,
    CheckCategory,
    CheckResult,
    VerificationFinding,
    NormalizedClaim,
    VerificationRun,
)
from app.agents.evidence_verification.checks import VerificationCheckSuite


class ScientificVerificationEngine:
    """
    Central deterministic scientific verification engine.
    Audits claims, resolves evidence provenance, reproduces deterministic calculations,
    and detects cross-source conflicts according to ORCA scientific standards.
    """

    def __init__(self):
        # In-memory history of verification runs (can be complemented by DB storage)
        self._runs_history: Dict[str, VerificationRun] = {}

    def normalize_claims(
        self,
        raw_findings: List[Union[Dict[str, Any], Any]],
        producer_agent: str = "specialist_agent",
        execution_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[NormalizedClaim]:
        """Normalize upstream findings/claims into standardized claim objects."""
        normalized: List[NormalizedClaim] = []

        for idx, item in enumerate(raw_findings):
            # Extract attributes from dict or Pydantic model
            if hasattr(item, "model_dump"):
                data = item.model_dump()
            elif hasattr(item, "__dict__"):
                data = dict(item.__dict__)
            elif isinstance(item, dict):
                data = item
            else:
                data = {"claim": str(item)}

            claim_id = (
                data.get("claim_id") or
                data.get("finding_id") or
                data.get("id") or
                f"clm_{uuid.uuid4().hex[:8]}"
            )
            claim_text = data.get("claim") or data.get("text") or data.get("statement") or ""
            evidence_ids = data.get("evidence_ids") or []
            val = data.get("value")
            numeric_val = None
            if val is not None:
                try:
                    numeric_val = float(val)
                except (ValueError, TypeError):
                    numeric_val = None

            unit = data.get("unit")
            lat = data.get("latitude")
            lon = data.get("longitude")
            uncertainty = data.get("uncertainty") or data.get("uncertainty_notes")

            # Determine claim type
            cat = str(data.get("category", "")).lower()
            text_lower = claim_text.lower()

            if "forecast" in cat or data.get("is_forecast") is True or "forecast" in text_lower:
                c_type = ClaimType.FORECAST
            elif "anomaly" in text_lower or "derived" in cat:
                c_type = ClaimType.DERIVED_MEASUREMENT
            elif "exposure" in text_lower or "population" in text_lower:
                c_type = ClaimType.SPATIAL_EXPOSURE
            elif "risk" in text_lower or "vulnerability" in text_lower:
                c_type = ClaimType.RISK_ASSESSMENT
            elif "historical" in text_lower or "precedent" in text_lower:
                c_type = ClaimType.HISTORICAL_RECORD
            elif any(k in text_lower for k in ["because of", "caused by", "due to"]):
                c_type = ClaimType.CAUSAL_CLAIM
            elif "recommend" in text_lower or "advisory" in text_lower:
                c_type = ClaimType.RECOMMENDATION
            elif "observation" in cat or "observed" in text_lower:
                c_type = ClaimType.DIRECT_OBSERVATION
            else:
                c_type = ClaimType.DIRECT_OBSERVATION

            agent_name = data.get("agent_id") or producer_agent

            normalized.append(NormalizedClaim(
                claim_id=claim_id,
                original_text=claim_text,
                claim_type=c_type,
                producer_agent=agent_name,
                execution_id=execution_id,
                evidence_ids=evidence_ids,
                numerical_value=numeric_val,
                unit=unit,
                latitude=lat,
                longitude=lon,
                temporal_scope=data.get("observation_time"),
                uncertainty=uncertainty,
                status=VerificationStatus.UNVERIFIED,
                reason="Verification pending evaluation."
            ))

        return normalized

    def verify_claims(
        self,
        claims: List[NormalizedClaim],
        evidence_records: Optional[List[Any]] = None,
        run_id: Optional[str] = None,
        investigation_id: Optional[str] = None,
        target_time: Optional[datetime] = None
    ) -> VerificationRun:
        """
        Execute deterministic verification on normalized claims against evidence records.
        Evaluates source provenance, data quality, temporal windows, units, calculations,
        and cross-source conflicts.
        """
        if evidence_records is None:
            evidence_records = []
        active_run_id = run_id or f"vrun_{uuid.uuid4().hex[:10]}"

        # Map available evidence by both evidence_id and id
        evidence_map: Dict[str, Any] = {}
        for ev in evidence_records:
            eid = getattr(ev, "evidence_id", None) or getattr(ev, "id", None)
            if eid:
                evidence_map[str(eid)] = ev
            if hasattr(ev, "id") and ev.id:
                evidence_map[str(ev.id)] = ev

        all_findings: List[VerificationFinding] = []
        verified_claims: List[NormalizedClaim] = []

        total_checks_completed = 0
        total_checks_failed = 0
        total_checks_skipped = 0

        matched_count = 0
        unverified_count = 0
        conflicting_count = 0
        needs_review_count = 0
        potential_gap_count = 0
        unmet_count = 0

        for claim in claims:
            claim_checks: List[CheckResult] = []
            claim_findings: List[VerificationFinding] = []

            # 1. Evidence Resolution
            res_chk, res_find = VerificationCheckSuite.check_evidence_resolution(
                claim.claim_id, claim.evidence_ids, evidence_map
            )
            claim_checks.append(res_chk)
            if res_find:
                claim_findings.append(res_find)

            # Retrieve resolved evidence objects
            linked_evidence = [evidence_map[eid] for eid in claim.evidence_ids if eid in evidence_map]

            # 2. Source Provenance & Hash Check
            prov_chk, prov_find = VerificationCheckSuite.check_source_provenance(
                claim.claim_id, linked_evidence
            )
            claim_checks.append(prov_chk)
            if prov_find:
                claim_findings.append(prov_find)

            # 3. Data Quality & Boundaries
            qual_chk, qual_find = VerificationCheckSuite.check_data_quality(
                claim.claim_id, claim.numerical_value, linked_evidence
            )
            claim_checks.append(qual_chk)
            if qual_find:
                claim_findings.append(qual_find)

            # 4. Temporal Validity
            temp_chk, temp_find = VerificationCheckSuite.check_temporal_validity(
                claim.claim_id, claim.claim_type, claim.original_text, linked_evidence, target_time=target_time
            )
            claim_checks.append(temp_chk)
            if temp_find:
                claim_findings.append(temp_find)

            # 5. Units & Numerical Consistency
            unit_chk, unit_find = VerificationCheckSuite.check_unit_consistency(
                claim.claim_id, claim.unit, claim.numerical_value, linked_evidence
            )
            claim_checks.append(unit_chk)
            if unit_find:
                claim_findings.append(unit_find)

            # 6. Deterministic Calculation Verification
            calc_chk, calc_meta, calc_find = VerificationCheckSuite.verify_deterministic_calculation(
                claim.claim_id, claim.original_text, claim.numerical_value, linked_evidence
            )
            claim_checks.append(calc_chk)
            if calc_meta:
                claim.reproduced_calculation = calc_meta
            if calc_find:
                claim_findings.append(calc_find)

            # 7. Cross-Source Conflict Assessment
            conf_chk, conf_find = VerificationCheckSuite.check_cross_source_conflicts(
                claim.claim_id, claim.numerical_value, linked_evidence
            )
            claim_checks.append(conf_chk)
            if conf_find:
                claim_findings.append(conf_find)

            # 8. Scientific Reasoning & Causal Attribution
            sci_chk, sci_find = VerificationCheckSuite.check_scientific_reasoning(
                claim.claim_id, claim.claim_type, claim.original_text, linked_evidence
            )
            claim_checks.append(sci_chk)
            if sci_find:
                claim_findings.append(sci_find)

            # 9. Uncertainty Bounds
            unc_chk = VerificationCheckSuite.check_uncertainty_bounds(
                claim.claim_id, claim.original_text, linked_evidence, claim.uncertainty
            )
            claim_checks.append(unc_chk)

            # Tally check outcomes
            for chk in claim_checks:
                if chk.outcome == CheckOutcome.PASSED:
                    total_checks_completed += 1
                elif chk.outcome == CheckOutcome.FAILED:
                    total_checks_failed += 1
                elif chk.outcome == CheckOutcome.SKIPPED:
                    total_checks_skipped += 1

            # Map check outcomes to standardized claim-level verification status
            failed_codes = [c.check_code for c in claim_checks if c.outcome == CheckOutcome.FAILED]
            has_conflict = any(f.finding_code == "VFD_MATERIAL_SOURCE_CONFLICT" for f in claim_findings)
            has_missing_evidence = any(f.finding_code in ("VFD_MISSING_REF", "VFD_UNRESOLVED_EVIDENCE") for f in claim_findings)
            has_math_error = any(f.finding_code == "VFD_CALCULATION_ERROR" for f in claim_findings)
            has_unit_mismatch = any(f.finding_code == "VFD_INCOMPATIBLE_UNITS" for f in claim_findings)
            has_missing_calc_inputs = any(f.finding_code == "VFD_MISSING_CALCULATION_INPUTS" for f in claim_findings)

            if has_conflict:
                status = VerificationStatus.CONFLICTING
                reason = "Comparable source feeds disagree beyond acceptable scientific tolerance."
                conflicting_count += 1
            elif has_math_error or has_unit_mismatch:
                status = VerificationStatus.UNMET
                reason = "Assertion fails deterministic arithmetic verification or physical unit compatibility."
                unmet_count += 1
            elif has_missing_evidence:
                status = VerificationStatus.UNVERIFIED
                reason = "Adequate supporting evidence records could not be resolved from data feeds."
                unverified_count += 1
            elif has_missing_calc_inputs:
                status = VerificationStatus.POTENTIAL_GAP
                reason = "Derived calculation cannot be reproduced due to missing baseline or observation parameters."
                potential_gap_count += 1
            elif claim_findings:
                status = VerificationStatus.NEEDS_REVIEW
                reason = f"Verification completed with {len(claim_findings)} advisory audit findings."
                needs_review_count += 1
            else:
                status = VerificationStatus.MATCHED
                reason = "All applicable deterministic checks passed against verified source evidence."
                matched_count += 1

            claim.status = status
            claim.reason = reason
            claim.check_results = claim_checks
            claim.findings = claim_findings
            claim.verified_at = datetime.now(timezone.utc)

            verified_claims.append(claim)
            all_findings.extend(claim_findings)

        # Aggregate overall scientific state
        if conflicting_count > 0:
            overall_scientific_state = VerificationStatus.CONFLICTING
        elif unmet_count > 0:
            overall_scientific_state = VerificationStatus.UNMET
        elif needs_review_count > 0 or potential_gap_count > 0:
            overall_scientific_state = VerificationStatus.NEEDS_REVIEW
        elif unverified_count > 0:
            overall_scientific_state = (
                VerificationStatus.NEEDS_REVIEW if matched_count > 0 else VerificationStatus.UNVERIFIED
            )
        elif matched_count > 0:
            overall_scientific_state = VerificationStatus.MATCHED
        else:
            overall_scientific_state = VerificationStatus.UNVERIFIED

        run_record = VerificationRun(
            run_id=active_run_id,
            investigation_id=investigation_id,
            timestamp=datetime.now(timezone.utc),
            overall_status="completed",
            overall_scientific_state=overall_scientific_state,
            total_claims=len(claims),
            matched_count=matched_count,
            unverified_count=unverified_count,
            conflicting_count=conflicting_count,
            needs_review_count=needs_review_count,
            potential_gap_count=potential_gap_count,
            unmet_count=unmet_count,
            checks_completed=total_checks_completed,
            checks_failed=total_checks_failed,
            checks_skipped=total_checks_skipped,
            claims=verified_claims,
            findings=all_findings,
            evidence_count=len(evidence_records),
            limitations=[
                "Cross-source checks restricted to datasets providing calibrated numeric values.",
                "Uncertainty retained as qualitative limitation when provider does not specify explicit variance."
            ]
        )

        self._runs_history[active_run_id] = run_record
        return run_record

    def get_run(self, run_id: str) -> Optional[VerificationRun]:
        return self._runs_history.get(run_id)

    def list_runs(self, limit: int = 50) -> List[VerificationRun]:
        return sorted(self._runs_history.values(), key=lambda r: r.timestamp, reverse=True)[:limit]

    def get_run_history(self) -> List[VerificationRun]:
        return list(self._runs_history.values())

    def get_latest_run(self) -> Optional[VerificationRun]:
        runs = self.list_runs(limit=1)
        return runs[0] if runs else None


# Global singleton verification engine instance
verification_engine = ScientificVerificationEngine()
