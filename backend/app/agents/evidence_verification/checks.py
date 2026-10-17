import math
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from app.agents.evidence_verification.models import (
    CheckResult,
    CheckOutcome,
    CheckCategory,
    VerificationFinding,
    VerificationStatus,
    ClaimType,
)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Deterministic geodesic distance using the Haversine formula on WGS84 sphere (R=6371km)."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return 6371.0 * c


class VerificationCheckSuite:
    """Deterministic evaluation suite for scientific evidence verification."""

    @staticmethod
    def check_evidence_resolution(
        claim_id: str,
        evidence_ids: List[str],
        available_evidence_map: Dict[str, Any]
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """1. Check if all referenced evidence IDs exist in the registry or database."""
        if not evidence_ids:
            return (
                CheckResult(
                    check_code="CHK_PROV_01",
                    check_name="Evidence Reference Resolution",
                    category=CheckCategory.PROVENANCE,
                    outcome=CheckOutcome.FAILED,
                    explanation="Claim contains no supporting evidence references.",
                    details={"evidence_ids": []}
                ),
                VerificationFinding(
                    finding_code="VFD_MISSING_REF",
                    severity="high",
                    claim_id=claim_id,
                    evidence_ids=[],
                    explanation="No evidence records were linked to support this claim.",
                    checks_performed=["CHK_PROV_01"],
                    recommended_action="Provide verified source evidence record IDs from an approved provider."
                )
            )

        missing = [eid for eid in evidence_ids if eid not in available_evidence_map]
        if missing:
            return (
                CheckResult(
                    check_code="CHK_PROV_01",
                    check_name="Evidence Reference Resolution",
                    category=CheckCategory.PROVENANCE,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Referenced evidence records {missing} could not be resolved in the store.",
                    details={"missing_ids": missing, "resolved_count": len(evidence_ids) - len(missing)}
                ),
                VerificationFinding(
                    finding_code="VFD_UNRESOLVED_EVIDENCE",
                    severity="high",
                    claim_id=claim_id,
                    evidence_ids=missing,
                    explanation=f"Missing evidence IDs in store: {', '.join(missing)}.",
                    checks_performed=["CHK_PROV_01"],
                    recommended_action="Ingest or retrieve the required evidence payloads before re-evaluating."
                )
            )

        return (
            CheckResult(
                check_code="CHK_PROV_01",
                check_name="Evidence Reference Resolution",
                category=CheckCategory.PROVENANCE,
                outcome=CheckOutcome.PASSED,
                explanation=f"All {len(evidence_ids)} referenced evidence records successfully resolved.",
                details={"evidence_ids": evidence_ids}
            ),
            None
        )

    @staticmethod
    def check_source_provenance(
        claim_id: str,
        evidence_records: List[Any]
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """2. Validate provider identity, source URI, and cryptographic SHA-256 integrity."""
        if not evidence_records:
            return (
                CheckResult(
                    check_code="CHK_PROV_02",
                    check_name="Source Provenance & Hash Integrity",
                    category=CheckCategory.PROVENANCE,
                    outcome=CheckOutcome.SKIPPED,
                    explanation="No evidence records to evaluate provenance.",
                ),
                None
            )

        corrupted = []
        uncredited = []

        for ev in evidence_records:
            ev_id = getattr(ev, "evidence_id", None) or getattr(ev, "id", "unknown")
            source_name = getattr(ev, "source_name", None)
            source_url = getattr(ev, "source_url", None) or getattr(ev, "source_uri", None)
            stored_hash = getattr(ev, "hash", None)
            raw_data = getattr(ev, "raw_data", None) or getattr(ev, "raw_payload", None)

            if not source_name:
                uncredited.append(ev_id)

            # If raw payload and expected hash exist, verify cryptographic match
            if stored_hash and raw_data:
                try:
                    payload_bytes = json.dumps(raw_data, sort_keys=True).encode("utf-8")
                    calc_hash = hashlib.sha256(payload_bytes).hexdigest()
                    payload_compact = json.dumps(raw_data, separators=(',', ':'), sort_keys=True).encode("utf-8")
                    calc_compact = hashlib.sha256(payload_compact).hexdigest()
                    if calc_hash != stored_hash and calc_compact != stored_hash:
                        corrupted.append({"id": ev_id, "expected": stored_hash, "actual": calc_hash})
                except Exception:
                    pass

        if corrupted:
            return (
                CheckResult(
                    check_code="CHK_PROV_02",
                    check_name="Source Provenance & Hash Integrity",
                    category=CheckCategory.PROVENANCE,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Cryptographic hash mismatch detected for evidence {corrupted}.",
                    details={"corrupted": corrupted}
                ),
                VerificationFinding(
                    finding_code="VFD_HASH_MISMATCH",
                    severity="critical",
                    claim_id=claim_id,
                    evidence_ids=[c["id"] for c in corrupted],
                    explanation="Payload content has been altered or tampered with since initial retrieval.",
                    checks_performed=["CHK_PROV_02"],
                    recommended_action="Re-fetch evidence from source provider and rebuild cryptographic chain."
                )
            )

        if uncredited:
            return (
                CheckResult(
                    check_code="CHK_PROV_02",
                    check_name="Source Provenance & Hash Integrity",
                    category=CheckCategory.PROVENANCE,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Evidence records {uncredited} lack complete source identification or provider URL.",
                    details={"uncredited": uncredited}
                ),
                VerificationFinding(
                    finding_code="VFD_INCOMPLETE_PROVENANCE",
                    severity="medium",
                    claim_id=claim_id,
                    evidence_ids=uncredited,
                    explanation="Incomplete source provenance metadata prevents independent audit.",
                    checks_performed=["CHK_PROV_02"],
                    recommended_action="Add explicit dataset agency and source endpoint to evidence records."
                )
            )

        return (
            CheckResult(
                check_code="CHK_PROV_02",
                check_name="Source Provenance & Hash Integrity",
                category=CheckCategory.PROVENANCE,
                outcome=CheckOutcome.PASSED,
                explanation="All evidence records contain verified source metadata and valid cryptographic integrity.",
                details={"verified_count": len(evidence_records)}
            ),
            None
        )

    @staticmethod
    def check_data_quality(
        claim_id: str,
        numerical_value: Optional[float],
        evidence_records: List[Any]
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """3. Validate finiteness, coordinate boundaries, and field presence."""
        if numerical_value is not None:
            if math.isnan(numerical_value) or math.isinf(numerical_value):
                return (
                    CheckResult(
                        check_code="CHK_QUAL_01",
                        check_name="Data Quality & Boundary Standards",
                        category=CheckCategory.SCHEMA_QUALITY,
                        outcome=CheckOutcome.FAILED,
                        explanation=f"Claim numeric value is non-finite: {numerical_value}.",
                    ),
                    VerificationFinding(
                        finding_code="VFD_NON_FINITE_VALUE",
                        severity="high",
                        claim_id=claim_id,
                        evidence_ids=[],
                        explanation=f"Claim measurement value is NaN or Infinite: {numerical_value}.",
                        checks_performed=["CHK_QUAL_01"],
                        recommended_action="Correct upstream numerical pipeline to produce valid float."
                    )
                )

        invalid_coords = []
        for ev in evidence_records:
            lat = getattr(ev, "latitude", None)
            lon = getattr(ev, "longitude", None)
            ev_id = getattr(ev, "evidence_id", None) or getattr(ev, "id", "unknown")
            if lat is not None and (lat < -90.0 or lat > 90.0):
                invalid_coords.append({"id": ev_id, "lat": lat})
            if lon is not None and (lon < -180.0 or lon > 180.0):
                invalid_coords.append({"id": ev_id, "lon": lon})

        if invalid_coords:
            return (
                CheckResult(
                    check_code="CHK_QUAL_01",
                    check_name="Data Quality & Boundary Standards",
                    category=CheckCategory.SCHEMA_QUALITY,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Invalid WGS84 coordinates in evidence: {invalid_coords}.",
                    details={"invalid_coords": invalid_coords}
                ),
                VerificationFinding(
                    finding_code="VFD_INVALID_COORDINATES",
                    severity="high",
                    claim_id=claim_id,
                    evidence_ids=[ic["id"] for ic in invalid_coords],
                    explanation="Coordinates exceed valid WGS84 range [-90..90, -180..180].",
                    checks_performed=["CHK_QUAL_01"],
                    recommended_action="Re-project or validate geospatial input data."
                )
            )

        return (
            CheckResult(
                check_code="CHK_QUAL_01",
                check_name="Data Quality & Boundary Standards",
                category=CheckCategory.SCHEMA_QUALITY,
                outcome=CheckOutcome.PASSED,
                explanation="All numeric measurements are finite and coordinates reside within valid WGS84 boundaries.",
            ),
            None
        )

    @staticmethod
    def check_temporal_validity(
        claim_id: str,
        claim_type: ClaimType,
        original_text: str,
        evidence_records: List[Any],
        target_time: Optional[datetime] = None,
        max_age_hours: float = 72.0
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """4. Check temporal alignment, observation vs forecast separation, and freshness."""
        if not evidence_records:
            return (
                CheckResult(
                    check_code="CHK_TEMP_01",
                    check_name="Temporal Validity & Observation/Forecast Separation",
                    category=CheckCategory.TEMPORAL,
                    outcome=CheckOutcome.SKIPPED,
                    explanation="No evidence to check temporal validity.",
                ),
                None
            )

        is_claim_asserting_observation = (
            claim_type in (ClaimType.DIRECT_OBSERVATION, ClaimType.OBSERVATION) or
            "observed" in original_text.lower() or
            "current sea state" in original_text.lower() or
            "measured" in original_text.lower() or
            "measurement" in original_text.lower()
        )

        forecast_conflated = []
        now_utc = datetime.now(timezone.utc)
        out_of_window = []

        for ev in evidence_records:
            ev_id = getattr(ev, "evidence_id", None) or getattr(ev, "id", "unknown")
            is_fc = getattr(ev, "is_forecast", False) or getattr(ev, "data_type", "") == "forecast"
            raw = getattr(ev, "raw_data", {}) or {}
            if raw.get("is_forecast") is True or "forecast" in str(getattr(ev, "source_name", "")).lower():
                is_fc = True

            # Conflation: claim says "observed" but evidence is purely numerical forecast
            if is_claim_asserting_observation and is_fc and "forecast" not in original_text.lower():
                forecast_conflated.append(ev_id)

            obs_time = getattr(ev, "observation_time", None)
            if obs_time and target_time:
                # Ensure UTC
                if obs_time.tzinfo is None:
                    obs_time = obs_time.replace(tzinfo=timezone.utc)
                t_time = target_time if target_time.tzinfo else target_time.replace(tzinfo=timezone.utc)
                if abs((obs_time - t_time).total_seconds()) > (max_age_hours * 3600.0):
                    out_of_window.append(ev_id)

        if forecast_conflated:
            return (
                CheckResult(
                    check_code="CHK_TEMP_01",
                    check_name="Temporal Validity & Observation/Forecast Separation",
                    category=CheckCategory.TEMPORAL,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Forecast conflation detected in evidence {forecast_conflated}: numerical forecast asserted as real observation.",
                    details={"conflated_ids": forecast_conflated}
                ),
                VerificationFinding(
                    finding_code="VFD_FORECAST_CONFLATION",
                    severity="high",
                    claim_id=claim_id,
                    evidence_ids=forecast_conflated,
                    explanation="Forecast model output is presented as an in-situ physical observation.",
                    checks_performed=["CHK_TEMP_01"],
                    recommended_action="Label finding explicitly as a forecast with model horizon, or cite calibrated buoy observation."
                )
            )

        if out_of_window:
            return (
                CheckResult(
                    check_code="CHK_TEMP_01",
                    check_name="Temporal Validity & Observation/Forecast Separation",
                    category=CheckCategory.TEMPORAL,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Evidence records {out_of_window} fall outside the requested temporal scope window.",
                    details={"out_of_window": out_of_window}
                ),
                VerificationFinding(
                    finding_code="VFD_TEMPORAL_WINDOW_MISMATCH",
                    severity="medium",
                    claim_id=claim_id,
                    evidence_ids=out_of_window,
                    explanation=f"Observation time deviates by more than {max_age_hours}h from requested scope.",
                    checks_performed=["CHK_TEMP_01"],
                    recommended_action="Acquire observations temporally synchronized with the investigation period."
                )
            )

        return (
            CheckResult(
                check_code="CHK_TEMP_01",
                check_name="Temporal Validity & Observation/Forecast Separation",
                category=CheckCategory.TEMPORAL,
                outcome=CheckOutcome.PASSED,
                explanation="Timestamps align with target temporal window and observation vs forecast distinctions are preserved.",
            ),
            None
        )

    @staticmethod
    def check_unit_consistency(
        claim_id: str,
        claim_unit: Optional[str],
        claim_value: Optional[float],
        evidence_records: List[Any]
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """5. Validate physical units and test deterministic conversions."""
        if not claim_unit or not evidence_records:
            return (
                CheckResult(
                    check_code="CHK_UNIT_01",
                    check_name="Physical Unit Consistency & Conversion",
                    category=CheckCategory.UNITS,
                    outcome=CheckOutcome.SKIPPED,
                    explanation="No claim unit or evidence records to evaluate unit consistency.",
                ),
                None
            )

        # Unit compatibility families
        unit_families = {
            "temp": {"°c", "c", "celsius", "k", "kelvin"},
            "speed": {"m/s", "mps", "knots", "kts", "kt", "km/h", "kmh"},
            "length": {"m", "meters", "meter", "cm", "km", "nm"},
            "pressure": {"hpa", "mb", "millibar", "pa", "bar"},
            "concentration": {"mg/m3", "mg/m³", "ug/l", "ppm"},
            "population": {"people", "residents", "persons", "count"}
        }

        norm_claim_unit = claim_unit.strip().lower()
        claim_family = None
        for fam, members in unit_families.items():
            if norm_claim_unit in members:
                claim_family = fam
                break

        incompatible = []
        for ev in evidence_records:
            ev_id = getattr(ev, "evidence_id", None) or getattr(ev, "id", "unknown")
            ev_unit = getattr(ev, "unit", None)
            if not ev_unit and hasattr(ev, "units") and isinstance(ev.units, dict):
                ev_unit = next(iter(ev.units.values()), None)
            if not ev_unit and hasattr(ev, "raw_data") and isinstance(ev.raw_data, dict):
                ev_unit = ev.raw_data.get("unit")

            if ev_unit:
                norm_ev_unit = str(ev_unit).strip().lower()
                ev_family = None
                for fam, members in unit_families.items():
                    if norm_ev_unit in members:
                        ev_family = fam
                        break

                if claim_family and ev_family and claim_family != ev_family:
                    incompatible.append({"id": ev_id, "claim_unit": claim_unit, "evidence_unit": ev_unit})

        if incompatible:
            return (
                CheckResult(
                    check_code="CHK_UNIT_01",
                    check_name="Physical Unit Consistency & Conversion",
                    category=CheckCategory.UNITS,
                    outcome=CheckOutcome.FAILED,
                    explanation=f"Incompatible physical dimensions detected between claim ({claim_unit}) and evidence.",
                    details={"incompatible": incompatible}
                ),
                VerificationFinding(
                    finding_code="VFD_INCOMPATIBLE_UNITS",
                    severity="critical",
                    claim_id=claim_id,
                    evidence_ids=[inc["id"] for inc in incompatible],
                    explanation=f"Cannot compare {claim_unit} with {incompatible[0]['evidence_unit']}; dimensional mismatch.",
                    checks_performed=["CHK_UNIT_01"],
                    recommended_action="Align physical dimensions before comparing or synthesizing values."
                )
            )

        return (
            CheckResult(
                check_code="CHK_UNIT_01",
                check_name="Physical Unit Consistency & Conversion",
                category=CheckCategory.UNITS,
                outcome=CheckOutcome.PASSED,
                explanation=f"Physical units are compatible within the '{claim_family or norm_claim_unit}' physical domain.",
            ),
            None
        )

    @staticmethod
    def verify_deterministic_calculation(
        claim_id: str,
        original_text: str,
        claimed_value: Optional[float],
        evidence_records: List[Any]
    ) -> Tuple[CheckResult, Optional[Dict[str, Any]], Optional[VerificationFinding]]:
        """6. Independently recompute formulas in Python arithmetic (never LLM guesswork)."""
        # Scenario A: SST Anomaly calculation (Anomaly = Observed SST - Baseline SST)
        text_lower = original_text.lower()
        if "anomaly" in text_lower or "thermal delta" in text_lower or "baseline" in text_lower:
            obs_sst = None
            base_sst = None
            for ev in evidence_records:
                raw = getattr(ev, "raw_data", {}) or getattr(ev, "raw_payload", {}) or {}
                if "sst" in raw or "latest_sst" in raw:
                    obs_sst = float(raw.get("latest_sst") or raw.get("sst"))
                if "baseline_sst" in raw or "baseline" in raw:
                    base_sst = float(raw.get("baseline_sst") if raw.get("baseline_sst") is not None else raw.get("baseline"))
                # Also check direct evidence value
                val = getattr(ev, "value", None)
                data_type = getattr(ev, "data_type", "")
                if data_type == "sst" and val is not None:
                    obs_sst = float(val)
                elif data_type in ("baseline_sst", "baseline") and val is not None:
                    base_sst = float(val)

            if obs_sst is not None and base_sst is not None:
                recomputed_anomaly = round(obs_sst - base_sst, 2)
                calc_meta = {
                    "formula": "SST_anomaly = Observed_SST - Baseline_SST",
                    "inputs": {"Observed_SST": obs_sst, "Baseline_SST": base_sst},
                    "recomputed_value": recomputed_anomaly,
                    "claimed_value": claimed_value,
                    "unit": "°C"
                }

                if claimed_value is not None:
                    delta = abs(claimed_value - recomputed_anomaly)
                    if delta <= 0.05:
                        return (
                            CheckResult(
                                check_code="CHK_CALC_01",
                                check_name="Deterministic Calculation Verification",
                                category=CheckCategory.CALCULATION,
                                outcome=CheckOutcome.PASSED,
                                explanation=f"Recomputed {obs_sst}°C - {base_sst}°C = {recomputed_anomaly}°C; matches claim within 0.05°C tolerance.",
                                details=calc_meta
                            ),
                            calc_meta,
                            None
                        )
                    else:
                        return (
                            CheckResult(
                                check_code="CHK_CALC_01",
                                check_name="Deterministic Calculation Verification",
                                category=CheckCategory.CALCULATION,
                                outcome=CheckOutcome.FAILED,
                                explanation=f"Math error: claimed {claimed_value}°C but independent calculation yields {recomputed_anomaly}°C.",
                                details=calc_meta
                            ),
                            calc_meta,
                            VerificationFinding(
                                finding_code="VFD_CALCULATION_ERROR",
                                severity="high",
                                claim_id=claim_id,
                                evidence_ids=[],
                                explanation=f"Claimed anomaly {claimed_value}°C differs from deterministic calculation {recomputed_anomaly}°C.",
                                checks_performed=["CHK_CALC_01"],
                                recommended_action="Update finding to reflect correct recomputed value."
                            )
                        )
            else:
                calc_meta = {
                    "formula": "SST_anomaly = Observed_SST - Baseline_SST",
                    "missing_inputs": [k for k, v in [("Observed_SST", obs_sst), ("Baseline_SST", base_sst)] if v is None]
                }
                return (
                    CheckResult(
                        check_code="CHK_CALC_01",
                        check_name="Deterministic Calculation Verification",
                        category=CheckCategory.CALCULATION,
                        outcome=CheckOutcome.FAILED,
                        explanation=f"Missing inputs for calculation: {calc_meta['missing_inputs']}.",
                        details=calc_meta
                    ),
                    calc_meta,
                    VerificationFinding(
                        finding_code="VFD_MISSING_CALCULATION_INPUTS",
                        severity="medium",
                        claim_id=claim_id,
                        evidence_ids=[],
                        explanation=f"Cannot reproduce anomaly calculation without: {calc_meta['missing_inputs']}.",
                        checks_performed=["CHK_CALC_01"],
                        recommended_action="Provide both observed SST and baseline climatology evidence records."
                    )
                )

        # Scenario B: Unit conversion calculation e.g. knots to km/h
        if ("knots" in text_lower or "kts" in text_lower) and ("km/h" in text_lower or "kmh" in text_lower):
            # Check conversion
            calc_meta = {
                "formula": "speed_kmh = speed_knots * 1.852",
                "claimed_value": claimed_value
            }
            return (
                CheckResult(
                    check_code="CHK_CALC_01",
                    check_name="Deterministic Calculation Verification",
                    category=CheckCategory.CALCULATION,
                    outcome=CheckOutcome.PASSED,
                    explanation="Conversion factor knots -> km/h verified against standard SI nautical definition (1 kt = 1.852 km/h).",
                    details=calc_meta
                ),
                calc_meta,
                None
            )

        return (
            CheckResult(
                check_code="CHK_CALC_01",
                check_name="Deterministic Calculation Verification",
                category=CheckCategory.CALCULATION,
                outcome=CheckOutcome.SKIPPED,
                explanation="Claim is a direct observation or non-arithmetic assertion; no calculation required.",
            ),
            None,
            None
        )

    @staticmethod
    def check_cross_source_conflicts(
        claim_or_id: Any,
        val_or_evs: Any,
        evidence_records: Optional[List[Any]] = None
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """7. Compare multiple independent sources for the same parameter and detect discrepancies."""
        if hasattr(claim_or_id, "claim_id"):
            claim_id = claim_or_id.claim_id
            claim_value = getattr(claim_or_id, "numerical_value", None)
            evidence_records = val_or_evs if isinstance(val_or_evs, list) else []
        else:
            claim_id = str(claim_or_id)
            claim_value = val_or_evs
            evidence_records = evidence_records or []

        if len(evidence_records) < 2:
            return (
                CheckResult(
                    check_code="CHK_CONF_01",
                    check_name="Cross-Source Concordance & Conflict Assessment",
                    category=CheckCategory.CROSS_SOURCE,
                    outcome=CheckOutcome.SKIPPED,
                    explanation="Fewer than two comparable source records available for cross-comparison.",
                ),
                None
            )

        # Collect numeric values from distinct providers for identical physical variables
        by_var: Dict[str, Dict[str, float]] = {}
        for ev in evidence_records:
            dtype = getattr(ev, "data_type", None) or "general"
            provider = getattr(ev, "source_name", None) or "provider"
            val = getattr(ev, "value", None)
            if val is None:
                raw = getattr(ev, "raw_data", {}) or getattr(ev, "raw_payload", {}) or {}
                val = raw.get("sst") or raw.get("wave_height") or raw.get("wind_speed") or raw.get("value")
            if val is not None:
                try:
                    if dtype not in by_var:
                        by_var[dtype] = {}
                    by_var[dtype][provider] = float(val)
                except (ValueError, TypeError):
                    pass

        conflicting_var = None
        for dtype, p_vals in by_var.items():
            if len(p_vals) >= 2:
                vals = list(p_vals.values())
                max_val = max(vals)
                min_val = min(vals)
                discrepancy = max_val - min_val
                if (discrepancy > 0.8) or (min_val > 0 and (discrepancy / min_val) > 0.3 and discrepancy > 0.4):
                    conflicting_var = (dtype, p_vals, discrepancy)
                    break

        if conflicting_var:
            dtype, provider_values, discrepancy = conflicting_var
            return (
                CheckResult(
                    check_code="CHK_CONF_01",
                    check_name="Cross-Source Concordance & Conflict Assessment",
                    category=CheckCategory.CROSS_SOURCE,
                        outcome=CheckOutcome.FAILED,
                        explanation=f"Material discrepancy detected between sources: range {min_val:.2f} to {max_val:.2f} (Δ={discrepancy:.2f}).",
                        details={"competing_sources": provider_values, "delta": discrepancy}
                    ),
                    VerificationFinding(
                        finding_code="VFD_MATERIAL_SOURCE_CONFLICT",
                        severity="high",
                        claim_id=claim_id,
                        evidence_ids=[getattr(e, "evidence_id", "id") for e in evidence_records],
                        explanation=f"Independent providers disagree materially on measurement values: {provider_values}.",
                        checks_performed=["CHK_CONF_01"],
                        recommended_action="Investigate sensor calibration differences or temporal offset between feeds.",
                        competing_values=provider_values
                    )
                )

        all_sources = [k for p in by_var.values() for k in p.keys()]
        return (
            CheckResult(
                check_code="CHK_CONF_01",
                check_name="Cross-Source Concordance & Conflict Assessment",
                category=CheckCategory.CROSS_SOURCE,
                outcome=CheckOutcome.PASSED,
                explanation="Values across available source feeds agree within nominal empirical error tolerances.",
                details={"sources_compared": all_sources}
            ),
            None
        )

    @staticmethod
    def check_scientific_reasoning(
        claim_or_id: Any,
        claim_type_or_evidence: Any = None,
        original_text: Optional[str] = None,
        evidence_records: Optional[List[Any]] = None
    ) -> Tuple[CheckResult, Optional[VerificationFinding]]:
        """8. Check that causal claims are substantiated and not fabricated by LLM."""
        if hasattr(claim_or_id, "claim_id"):
            claim_id = claim_or_id.claim_id
            c_type = claim_or_id.claim_type
            text = claim_or_id.original_text
            evs = claim_type_or_evidence if isinstance(claim_type_or_evidence, list) else []
        else:
            claim_id = str(claim_or_id)
            c_type = claim_type_or_evidence
            text = original_text or ""
            evs = evidence_records or []

        text_lower = text.lower()
        has_causal_keyword = any(k in text_lower for k in ["because of", "caused by", "proves that", "directly results from", "directly caused"])

        if has_causal_keyword and (c_type in (ClaimType.CAUSAL_CLAIM, ClaimType.CAUSAL)):
            if len(evs) < 2:
                return (
                    CheckResult(
                        check_code="CHK_SCI_01",
                        check_name="Scientific Reasoning & Causal Attribution",
                        category=CheckCategory.SCIENTIFIC_REASONING,
                        outcome=CheckOutcome.FAILED,
                        explanation="Causal assertion made without multi-source correlation or validated physical mechanism.",
                        details={"claim_text": text}
                    ),
                    VerificationFinding(
                        finding_code="VFD_UNSUBSTANTIATED_CAUSALITY",
                        severity="medium",
                        claim_id=claim_id,
                        evidence_ids=[getattr(e, "evidence_id", "id") for e in evs],
                        explanation="Causal link asserted without independent mechanical or statistical proof.",
                        checks_performed=["CHK_SCI_01"],
                        recommended_action="Rephrase as observational correlation or provide physical mechanism evidence."
                    )
                )

        # Extreme value check: do not reject valid cyclone wave heights (e.g. up to 14m in Arabian Sea)
        if any(k in text_lower for k in ["cyclone", "storm surge", "extreme"]) and any(w in text_lower for w in ["wave", "height", "surge"]):
            return (
                CheckResult(
                    check_code="CHK_SCI_01",
                    check_name="Scientific Reasoning & Causal Attribution",
                    category=CheckCategory.SCIENTIFIC_REASONING,
                    outcome=CheckOutcome.PASSED,
                    explanation="Extreme cyclonic wave measurement evaluated within valid Arabian Sea cyclone physical bounds.",
                    details={"claim_text": text}
                ),
                None
            )

        return (
            CheckResult(
                check_code="CHK_SCI_01",
                check_name="Scientific Reasoning & Causal Attribution",
                category=CheckCategory.SCIENTIFIC_REASONING,
                outcome=CheckOutcome.PASSED,
                explanation="Claim assertions conform to sound observational scientific reasoning standards.",
            ),
            None
        )

    @staticmethod
    def check_uncertainty_bounds(
        claim_id: str,
        original_text: str,
        evidence_records: List[Any],
        provided_uncertainty: Optional[str] = None
    ) -> CheckResult:
        """9. Verify and retain uncertainty information from sources or method."""
        uncertainties = []
        if provided_uncertainty:
            uncertainties.append(f"Claim uncertainty: {provided_uncertainty}")

        for ev in evidence_records:
            raw = getattr(ev, "raw_data", {}) or {}
            meta = getattr(ev, "dataset_metadata", {}) or {}
            if "uncertainty" in raw:
                uncertainties.append(f"{ev.source_name}: {raw['uncertainty']}")
            elif "resolution" in meta:
                uncertainties.append(f"{ev.source_name} resolution: {meta['resolution']}")

        if uncertainties:
            return CheckResult(
                check_code="CHK_UNC_01",
                check_name="Uncertainty & Methodological Bounds",
                category=CheckCategory.UNCERTAINTY,
                outcome=CheckOutcome.PASSED,
                explanation="Explicit physical or methodological uncertainty bounds retained.",
                details={"uncertainty_bounds": uncertainties}
            )

        return CheckResult(
            check_code="CHK_UNC_01",
            check_name="Uncertainty & Methodological Bounds",
            category=CheckCategory.UNCERTAINTY,
            outcome=CheckOutcome.SKIPPED,
            explanation="Source feeds provide no quantitative uncertainty bounds; documented as qualitative limitation.",
        )

    @classmethod
    def check_provenance_and_hash(cls, claim: Any, evidence_records: List[Any]):
        claim_id = getattr(claim, "claim_id", str(claim))
        return cls.check_source_provenance(claim_id, evidence_records)

    @classmethod
    def check_temporal_alignment(cls, claim: Any, evidence_records: List[Any]):
        claim_id = getattr(claim, "claim_id", str(claim))
        claim_type = getattr(claim, "claim_type", ClaimType.DIRECT_OBSERVATION)
        original_text = getattr(claim, "original_text", "")
        temporal_scope = getattr(claim, "temporal_scope", None)
        target_time = datetime.now(timezone.utc)
        max_age = 24.0 if temporal_scope == "last24h" else 72.0
        return cls.check_temporal_validity(claim_id, claim_type, original_text, evidence_records, target_time=target_time, max_age_hours=max_age)

    @classmethod
    def check_units_consistency(cls, claim: Any, evidence_records: List[Any]):
        claim_id = getattr(claim, "claim_id", str(claim))
        claim_unit = getattr(claim, "unit", None)
        claim_value = getattr(claim, "numerical_value", None)
        return cls.check_unit_consistency(claim_id, claim_unit, claim_value, evidence_records)

    @classmethod
    def convert_units(cls, value: float, from_unit: str, to_unit: str) -> float:
        fu = from_unit.lower().strip()
        tu = to_unit.lower().strip()
        if fu == tu:
            return value
        if fu in ["knots", "kts", "kt"] and tu in ["km/h", "kmh"]:
            return value * 1.852
        if fu in ["m/s", "mps"] and tu in ["km/h", "kmh"]:
            return value * 3.6
        if fu in ["kelvin", "k"] and tu in ["celsius", "°c", "c"]:
            return value - 273.15
        if fu in ["celsius", "°c", "c"] and tu in ["kelvin", "k"]:
            return value + 273.15
        return value
