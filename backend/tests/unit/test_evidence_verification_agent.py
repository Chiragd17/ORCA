import pytest
import asyncio
from datetime import datetime, timezone, timedelta
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
from app.agents.evidence_verification.engine import ScientificVerificationEngine
from app.agents.evidence_verification.agent import EvidenceVerificationAgent
from app.agents.base import InvestigationTask, AgentResult, AgentStatus
from app.evidence.schemas import EvidenceRecord, VerificationState


@pytest.fixture
def check_suite():
    return VerificationCheckSuite()


@pytest.fixture
def verification_engine():
    return ScientificVerificationEngine()


def test_claim_supported_with_adequate_evidence_and_reproducible_calculation(verification_engine):
    """Scenario 1 & 7: Claim with adequate evidence and reproducible inputs receives 'matched'."""
    ev = EvidenceRecord(
        evidence_id="ev_sst_001",
        investigation_id="inv_test_001",
        source_name="INCOIS_OON",
        data_type="ocean_observation",
        observation_time=datetime.now(timezone.utc),
        latitude=12.91,
        longitude=74.82,
        raw_data={"sst": 30.7, "unit": "celsius", "baseline": 29.2},
    )

    claims = [
        NormalizedClaim(
            claim_id="cl_sst_001",
            original_text="Sea surface temperature is 30.7°C, representing a +1.5°C positive anomaly over baseline.",
            claim_type=ClaimType.CALCULATION,
            producer_agent="ocean_research",
            evidence_ids=["ev_sst_001"],
            numerical_value=1.5,
            unit="celsius",
            latitude=12.91,
            longitude=74.82,
        )
    ]

    run = verification_engine.verify_claims(
        claims=claims,
        evidence_records=[ev],
        investigation_id="inv_test_001",
    )

    assert run.total_claims == 1
    verified_claim = run.claims[0]
    assert verified_claim.status == VerificationStatus.MATCHED
    assert verified_claim.reproduced_calculation is not None
    assert verified_claim.reproduced_calculation["recomputed_value"] == 1.5
    assert run.matched_count == 1
    assert run.checks_failed == 0


def test_missing_evidence_reference_produces_unverified_status(verification_engine):
    """Scenario 2: Missing evidence reference produces a finding and does not pass verification."""
    claims = [
        NormalizedClaim(
            claim_id="cl_missing_001",
            original_text="Wave height reached 4.2m off Karwar port.",
            claim_type=ClaimType.OBSERVATION,
            producer_agent="marine_hazard",
            evidence_ids=["ev_nonexistent_999"],
            numerical_value=4.2,
            unit="meters",
            latitude=14.8,
            longitude=74.1,
        )
    ]

    run = verification_engine.verify_claims(
        claims=claims,
        evidence_records=[],
        investigation_id="inv_test_002",
    )

    assert run.total_claims == 1
    verified_claim = run.claims[0]
    assert verified_claim.status == VerificationStatus.UNVERIFIED
    assert len(verified_claim.findings) > 0
    assert any("MISSING" in f.finding_code or "UNRESOLVED" in f.finding_code for f in verified_claim.findings)
    assert run.matched_count == 0
    assert run.unverified_count == 1


def test_observation_outside_time_window_flagged(check_suite):
    """Scenario 3: An observation outside the requested time window is identified."""
    old_time = datetime.now(timezone.utc) - timedelta(days=90)
    ev = EvidenceRecord(
        evidence_id="ev_old_001",
        investigation_id="inv_test_003",
        source_name="INCOIS_OON",
        data_type="ocean_observation",
        observation_time=old_time,
        latitude=13.0,
        longitude=74.5,
    )
    claim = NormalizedClaim(
        claim_id="cl_temp_001",
        original_text="Current sea state in the last 24 hours.",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_old_001"],
        temporal_scope="last24h",
    )

    res, finding = check_suite.check_temporal_alignment(claim, [ev])
    assert res.outcome == CheckOutcome.FAILED
    assert "outside" in res.explanation.lower() or "exceeds" in res.explanation.lower()
    assert finding is not None


def test_forecast_not_misrepresented_as_observation(check_suite):
    """Scenario 4: A forecast is not misrepresented as an in situ observation."""
    future_time = datetime.now(timezone.utc) + timedelta(hours=24)
    ev = EvidenceRecord(
        evidence_id="ev_fc_001",
        investigation_id="inv_test_004",
        source_name="INCOIS_SWELL_FORECAST",
        data_type="forecast",
        observation_time=future_time,
        latitude=13.0,
        longitude=74.5,
    )
    claim = NormalizedClaim(
        claim_id="cl_obs_fc_001",
        original_text="In situ buoy measurement recorded 3.5m wave height right now.",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="marine_hazard",
        evidence_ids=["ev_fc_001"],
    )

    res, finding = check_suite.check_temporal_alignment(claim, [ev])
    assert res.outcome == CheckOutcome.FAILED
    assert "conflation" in res.explanation.lower()
    assert finding is not None
    assert "FORECAST_CONFLATION" in finding.finding_code


def test_incompatible_units_produce_appropriate_finding(check_suite):
    """Scenario 5: Incompatible units produce an appropriate finding."""
    ev = EvidenceRecord(
        evidence_id="ev_unit_001",
        investigation_id="inv_test_005",
        source_name="INCOIS_WAVE",
        data_type="wave_observation",
        raw_data={"wave_height": 2.5, "unit": "meters"},
    )
    claim = NormalizedClaim(
        claim_id="cl_unit_001",
        original_text="Current wind speed is 2.5 knots.",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_unit_001"],
        unit="knots",
    )

    res, finding = check_suite.check_units_consistency(claim, [ev])
    assert res.outcome == CheckOutcome.FAILED
    assert "incompatible" in res.explanation.lower()
    assert finding is not None


def test_valid_unit_conversion(check_suite):
    """Scenario 6: Valid unit conversion produces expected deterministic result."""
    assert check_suite.convert_units(10.0, "knots", "km/h") == pytest.approx(18.52, 0.01)
    assert check_suite.convert_units(20.0, "m/s", "km/h") == pytest.approx(72.0, 0.01)
    assert check_suite.convert_units(300.0, "kelvin", "celsius") == pytest.approx(26.85, 0.01)


def test_missing_calculation_inputs_produces_unverified(verification_engine):
    """Scenario 8: Missing calculation inputs produce an unverified outcome."""
    ev = EvidenceRecord(
        evidence_id="ev_sst_no_baseline",
        investigation_id="inv_test_008",
        source_name="INCOIS_OON",
        data_type="ocean_observation",
        raw_data={"sst": 30.5},  # baseline missing
    )
    claim = NormalizedClaim(
        claim_id="cl_calc_missing_001",
        original_text="SST is +1.3°C above baseline.",
        claim_type=ClaimType.CALCULATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_sst_no_baseline"],
        numerical_value=1.3,
        unit="celsius",
    )

    run = verification_engine.verify_claims(
        claims=[claim],
        evidence_records=[ev],
        investigation_id="inv_test_008",
    )
    verified = run.claims[0]
    assert verified.status in [VerificationStatus.UNVERIFIED, VerificationStatus.POTENTIAL_GAP, VerificationStatus.NEEDS_REVIEW]
    assert verified.reproduced_calculation is None or verified.reproduced_calculation.get("recomputed_value") is None


def test_materially_conflicting_comparable_sources_detected(check_suite):
    """Scenario 9: Materially conflicting comparable sources are detected."""
    now = datetime.now(timezone.utc)
    ev1 = EvidenceRecord(
        evidence_id="ev_sst_incois",
        investigation_id="inv_test_009",
        source_name="INCOIS_BUOY_BD08",
        data_type="ocean_observation",
        observation_time=now,
        latitude=13.0,
        longitude=74.5,
        raw_data={"sst": 31.8, "unit": "celsius"},
    )
    ev2 = EvidenceRecord(
        evidence_id="ev_sst_satellite",
        investigation_id="inv_test_009",
        source_name="NOAA_SST_AVHRR",
        data_type="ocean_observation",
        observation_time=now,
        latitude=13.0,
        longitude=74.5,
        raw_data={"sst": 28.5, "unit": "celsius"},
    )
    claim = NormalizedClaim(
        claim_id="cl_conflict_001",
        original_text="Sea surface temperature is 31.8°C.",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_sst_incois", "ev_sst_satellite"],
        numerical_value=31.8,
        unit="celsius",
        latitude=13.0,
        longitude=74.5,
    )

    res, finding = check_suite.check_cross_source_conflicts(claim, [ev1, ev2])
    assert res.outcome == CheckOutcome.FAILED
    assert finding is not None
    assert "CONFLICT" in finding.finding_code
    assert "competing_values" in finding.competing_values or len(finding.competing_values) > 0


def test_non_comparable_sources_not_treated_as_contradiction(check_suite):
    """Scenario 10: Non-comparable sources are not incorrectly treated as direct contradictions."""
    now = datetime.now(timezone.utc)
    ev1 = EvidenceRecord(
        evidence_id="ev_sst_surface",
        investigation_id="inv_test_010",
        source_name="INCOIS_SURFACE",
        data_type="ocean_observation",
        observation_time=now,
        latitude=13.0,
        longitude=74.5,
        raw_data={"sst": 29.5, "sensor_depth_m": 0.0},
    )
    ev2 = EvidenceRecord(
        evidence_id="ev_current_depth",
        investigation_id="inv_test_010",
        source_name="INCOIS_ACOUSTIC_DOPPLER",
        data_type="ocean_current",
        observation_time=now,
        latitude=13.0,
        longitude=74.5,
        raw_data={"current_speed_knots": 1.4, "sensor_depth_m": 25.0},
    )
    claim = NormalizedClaim(
        claim_id="cl_multivar_001",
        original_text="Surface temperature is 29.5°C while deep current is 1.4 knots.",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_sst_surface", "ev_current_depth"],
    )

    res, finding = check_suite.check_cross_source_conflicts(claim, [ev1, ev2])
    assert res.outcome == CheckOutcome.PASSED
    assert finding is None


def test_unsupported_causal_claim_flagged(check_suite):
    """Scenario 11: An unsupported causal claim is flagged."""
    claim = NormalizedClaim(
        claim_id="cl_cause_001",
        original_text="The high sea surface temperature anomaly directly caused the massive fish mortality observed off Malpe harbor.",
        claim_type=ClaimType.CAUSAL,
        producer_agent="ocean_research",
        evidence_ids=[],
    )
    res, finding = check_suite.check_scientific_reasoning(claim, [])
    assert res.outcome == CheckOutcome.FAILED
    assert "causal" in res.explanation.lower()
    assert finding is not None
    assert "CAUSAL" in finding.finding_code


def test_valid_extreme_measurement_not_rejected_solely_for_being_extreme(check_suite):
    """Scenario 12: A valid extreme measurement is not rejected solely because it is unusual."""
    claim = NormalizedClaim(
        claim_id="cl_cyclone_wave",
        original_text="Peak significant wave height reached 5.8m during Cyclone Tauktae passage.",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="marine_hazard",
        evidence_ids=[],
        numerical_value=5.8,
        unit="meters",
    )
    res, finding = check_suite.check_scientific_reasoning(claim, [])
    assert res.outcome == CheckOutcome.PASSED
    assert "extreme" in res.explanation.lower()
    assert finding is None


def test_skipped_checks_not_counted_as_passed(verification_engine):
    """Scenario 13: Skipped checks are not counted as passed."""
    claim = NormalizedClaim(
        claim_id="cl_general_001",
        original_text="General regional marine status overview for coastal security.",
        claim_type=ClaimType.INTERPRETATION,
        producer_agent="ocean_research",
        evidence_ids=[],
    )
    run = verification_engine.verify_claims([claim], [])
    assert run.checks_skipped > 0
    # Confirm that skipped checks are strictly separated from checks_completed/passed
    assert run.checks_completed != run.checks_skipped


def test_orchestrator_can_invoke_agent_through_shared_contract():
    """Scenario 19: The Orchestrator can invoke the agent through the real shared BaseAgent contract."""
    agent = EvidenceVerificationAgent()
    assert agent.agent_id == "evidence_verification"

    # Test run() task
    task = InvestigationTask(
        investigation_id="inv_orch_001",
        workspace="disaster_management",
        query="Verify wave surge telemetry and risk calculations",
    )
    result = asyncio.run(agent.run(task))
    assert isinstance(result, AgentResult)
    assert result.agent_id == "evidence_verification"
    assert result.status == AgentStatus.COMPLETED

    # Test backwards-compatible verify() hook used by OrchestratorService
    findings = [
        {"claim": "Sea surface temperature is 30.7°C, representing +1.5°C anomaly.", "evidence_ids": ["ev_1"]},
        {"claim": "Wave height reaches 5.8m under cyclonic swell.", "evidence_ids": ["ev_2"]},
    ]
    evidence = [
        EvidenceRecord(
            evidence_id="ev_1",
            investigation_id="inv_orch_001",
            source_name="INCOIS_OON",
            data_type="ocean_observation",
            raw_data={"sst": 30.7, "baseline": 29.2},
        ),
        EvidenceRecord(
            evidence_id="ev_2",
            investigation_id="inv_orch_001",
            source_name="INCOIS_WAVE",
            data_type="wave_observation",
            raw_data={"wave_height": 5.8},
        ),
    ]

    summary = agent.verify("inv_orch_001", findings, evidence)
    assert hasattr(summary, "overall_status")
    assert hasattr(summary, "verified_findings_count")
    assert summary.total_findings == 2
    assert summary.verified_findings_count == 2
    assert summary.overall_status == VerificationState.VERIFIED


def test_verification_history_preserves_previous_runs(verification_engine):
    """Scenario 18: Verification history preserves previous runs without destructive overwriting."""
    claim1 = NormalizedClaim(
        claim_id="cl_hist_001",
        original_text="Observation run 1",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=[],
    )
    claim2 = NormalizedClaim(
        claim_id="cl_hist_002",
        original_text="Observation run 2",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=[],
    )

    run1 = verification_engine.verify_claims([claim1], investigation_id="inv_h1")
    run2 = verification_engine.verify_claims([claim2], investigation_id="inv_h2")

    history = verification_engine.get_run_history()
    run_ids = [r.run_id for r in history]
    assert run1.run_id in run_ids
    assert run2.run_id in run_ids
    assert len(history) >= 2


def test_sha256_hash_provenance_validation(check_suite):
    """Scenario: SHA-256 hash snapshot verification succeeds on authentic and fails on tampered payload."""
    import hashlib
    import json
    raw_payload_dict = {"location": "Karwar", "source": "INCOIS", "sst": 30.2}
    true_hash = hashlib.sha256(json.dumps(raw_payload_dict, sort_keys=True).encode("utf-8")).hexdigest()
    tampered_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    ev_authentic = EvidenceRecord(
        evidence_id="ev_auth_001",
        investigation_id="inv_hash",
        source_name="INCOIS",
        data_type="ocean_observation",
        hash=true_hash,
        raw_data=raw_payload_dict,
    )
    claim = NormalizedClaim(
        claim_id="cl_auth_001",
        original_text="Authentic payload check",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_auth_001"],
    )

    res, finding = check_suite.check_provenance_and_hash(claim, [ev_authentic])
    assert res.outcome == CheckOutcome.PASSED
    assert finding is None

    # Tampered test
    ev_tampered = EvidenceRecord(
        evidence_id="ev_tampered_001",
        investigation_id="inv_hash",
        source_name="INCOIS",
        data_type="ocean_observation",
        hash=tampered_hash,
        raw_data={"source": "INCOIS", "sst": 99.9, "location": "Karwar"},
    )
    claim_tampered = NormalizedClaim(
        claim_id="cl_tampered_001",
        original_text="Tampered payload check",
        claim_type=ClaimType.OBSERVATION,
        producer_agent="ocean_research",
        evidence_ids=["ev_tampered_001"],
    )
    res_t, finding_t = check_suite.check_provenance_and_hash(claim_tampered, [ev_tampered])
    assert res_t.outcome == CheckOutcome.FAILED
    assert finding_t is not None
    assert "HASH_MISMATCH" in finding_t.finding_code
