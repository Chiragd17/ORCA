import pytest
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.marine_hazard.agent import (
    MarineHazardAgent,
    classify_and_plan_data_sources,
    detect_analysis_intent,
    extract_explicit_place_name,
    resolve_geographic_context,
)
from app.agents.marine_hazard.session import ConversationSessionManager
from app.core.config import settings
from app.schemas.evidence import EvidenceRecord, Finding
from app.schemas.investigation import LocationContext


# =============================================================================
# 1. INTENT CLASSIFICATION AND DATA SOURCE DECISION TESTS
# =============================================================================

def test_intent_classification_all_categories():
    """Verify that detect_analysis_intent deterministically categorizes queries into distinct categories."""
    assert detect_analysis_intent("What are the current sea conditions in Chennai?") == "current_conditions"
    assert detect_analysis_intent("What are the wave conditions off Mangaluru?") == "current_conditions"
    assert detect_analysis_intent("What will the waves be tomorrow?") == "forecast"
    assert detect_analysis_intent("Can I go fishing today?") == "forecast"
    assert detect_analysis_intent("Is there a cyclone or active alert near this coast?") == "active_hazards"
    assert detect_analysis_intent("Where did Cyclone Fengal travel?") == "historical_event"
    assert detect_analysis_intent("Show historical cyclones near Mangaluru.") == "historical_event"
    assert detect_analysis_intent("How have cyclone patterns changed over the past ten years?") == "historical_trend"
    assert detect_analysis_intent("Which months have historically had more cyclone activity near this region?") == "historical_trend"
    assert detect_analysis_intent("Compare today's forecast with historical marine conditions.") == "comparison"
    assert detect_analysis_intent("Is this cyclone following a similar path to previous storms?") == "comparison"
    assert detect_analysis_intent("Check data freshness, SLA status, and fallback indicators.") == "data_freshness"


def test_classify_and_plan_data_sources_purely_historical():
    """Verify that a purely historical query selects the historical archive without live forecast refresh."""
    plan = classify_and_plan_data_sources(
        query="Where did Cyclone Fengal travel and what were its peak winds?",
        target_lat=13.08,
        target_lon=80.27,
        loc_name="Chennai",
        requested_loc="Chennai",
    )
    assert plan.intent == "historical_event"
    assert plan.resolved_location == "Chennai"
    assert plan.required_sources == ["noaa-ibtracs"]
    assert "persisted_historical_archive" in plan.cache_policy
    assert plan.refresh_required is False
    assert "open-meteo-marine" not in plan.required_sources


def test_classify_and_plan_data_sources_comparison():
    """Verify that comparison queries request both current forecast and historical records."""
    plan = classify_and_plan_data_sources(
        query="Compare today's sea conditions with previous cyclone tracks near Chennai.",
        target_lat=13.08,
        target_lon=80.27,
        loc_name="Chennai",
        requested_loc="Chennai",
    )
    assert plan.intent == "comparison"
    assert "open-meteo-marine" in plan.required_sources
    assert "noaa-ibtracs" in plan.required_sources
    assert "gdacs-tc" in plan.required_sources
    assert "hybrid" in plan.cache_policy


def test_classify_and_plan_data_sources_current_forecast():
    """Verify current and forecast queries require wave and alert feeds with fresh cache permitted."""
    plan_curr = classify_and_plan_data_sources(
        query="What are the wave conditions off Mangaluru?",
        target_lat=12.91,
        target_lon=74.85,
        loc_name="Mangaluru",
        requested_loc="Mangaluru",
    )
    assert plan_curr.intent == "current_conditions"
    assert "open-meteo-marine" in plan_curr.required_sources
    assert "gdacs-tc" in plan_curr.required_sources
    assert "allow_fresh_cache" in plan_curr.cache_policy
    assert plan_curr.freshness_requirements["open-meteo-marine"] == "max_age_12h"
    assert plan_curr.freshness_requirements["gdacs-tc"] == "max_age_6h"


# =============================================================================
# 2. LOCATION RESOLUTION & CONVERSATIONAL STATE REGRESSION TESTS
# =============================================================================

def test_extract_explicit_place_name_word_boundaries():
    """Verify word boundary regex matching for explicit place names."""
    res1 = extract_explicit_place_name("What about Chennai?")
    assert res1 is not None
    assert res1[2] == "Chennai"
    assert res1[3] == "bay_of_bengal"

    res2 = extract_explicit_place_name("Is there any warning in Port Blair?")
    assert res2 is not None
    assert res2[2] == "Port Blair"

    res3 = extract_explicit_place_name("How are the waves off Mangaluru?")
    assert res3 is not None
    assert res3[2] == "Mangaluru"

    res4 = extract_explicit_place_name("No location here")
    assert res4 is None


@pytest.mark.asyncio
async def test_location_transition_mangaluru_to_chennai_evidence_isolation():
    """
    MANDATORY REGRESSION TEST:
    Turn 1: Mangaluru -> sets anchor to Mangaluru, returns Mangaluru findings/evidence.
    Turn 2: What about Chennai? -> updates anchor to Chennai, isolates pools so Mangaluru
            evidence is NOT attached to the Chennai answer.
    Turn 3: What about tomorrow? -> preserves Chennai anchor, updates time horizon.
    Turn 4: Compare it with historical cyclones -> preserves Chennai anchor, queries Chennai tracks.
    """
    mgr = ConversationSessionManager()
    agent = MarineHazardAgent(
        gdacs_client=MagicMock(),
        ibtracs_client=MagicMock(),
        hazard_repo=MagicMock(),
        forecast_repo=MagicMock(),
    )

    conv_id = "test-conv-regress-01"

    # Mock tools
    agent.tool_get_marine_forecast = MagicMock(return_value=(
        {"status": "success", "max_wave_height_m": 1.45, "douglas_scale": "Moderate"},
        [Finding(id="f-marine-wave-1", claim="Wave height 1.45m", value=1.45, unit="m", evidence_ids=["ev-marine-wave-1"], uncertainty="±0.1m", is_forecast=True, observation_time=datetime.now(UTC))],
        [EvidenceRecord(id="ev-marine-wave-1", dataset_id="open-meteo-marine", source_name="Open-Meteo", source_url="https://open-meteo.com", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=12.91, longitude=74.85, variable="wave_height", value=1.45, unit="m")]
    ))
    agent.tool_get_active_hazard_alerts = MagicMock(return_value=(
        {"status": "success", "is_regional_waters_clear": True, "local_threats_count": 0, "distant_storms_count": 0},
        [Finding(id="f-gdacs-clear-1", claim="Regional waters clear", value="CLEAR", unit="status", evidence_ids=["ev-gdacs-clear-1"], uncertainty="Low", is_forecast=False, observation_time=datetime.now(UTC))],
        [EvidenceRecord(id="ev-gdacs-clear-1", dataset_id="gdacs-tc", source_name="GDACS", source_url="https://gdacs.org", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=12.91, longitude=74.85, variable="alert", value="clear", unit="status")]
    ))
    agent.tool_search_historical_cyclones = MagicMock(return_value=(
        {"status": "success", "storm_name": "Tauktae", "closest_approach_km": 110.0, "peak_wind_knots": 85.0, "evidence_id": "ev-ibtracs-tauktae"},
        [Finding(id="f-ibtracs-tauktae", claim="Cyclone Tauktae tracked within 110 km", value=110.0, unit="km", evidence_ids=["ev-ibtracs-tauktae"], uncertainty="±25 km", is_forecast=False, observation_time=datetime.now(UTC))],
        [EvidenceRecord(id="ev-ibtracs-tauktae", dataset_id="noaa-ibtracs", source_name="IBTrACS", source_url="https://noaa.gov", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=12.91, longitude=74.85, variable="track", value={"name": "Tauktae"}, unit="km")]
    ))
    agent.tool_compare_current_vs_historical = MagicMock(return_value=(
        {"status": "success", "location": "Chennai", "current_wave_m": 1.20, "closest_historical_storm": "Cyclone Vardah", "closest_dist_km": 45.0, "evidence_id": "ev-marine-comparison-1"},
        [Finding(id="f-marine-comparison-1", claim="Current vs Historical Comparison for Chennai: Vardah approached 45km", value="BENIGN", unit="status", evidence_ids=["ev-marine-comparison-1"], uncertainty="Low", is_forecast=True, observation_time=datetime.now(UTC))],
        [EvidenceRecord(id="ev-marine-comparison-1", dataset_id="orca-comparison", source_name="ORCA Comparison", source_url="https://orca.ocean", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=13.08, longitude=80.27, variable="comparison", value="benign", unit="status")]
    ))

    # --- Turn 1: Mangaluru ---
    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[])), \
         patch("app.agents.marine_hazard.agent.get_active_llm_provider", AsyncMock(return_value=None)):
        resp1 = await agent.chat(
            message="What are the sea conditions off Mangaluru?",
            conversation_id=conv_id,
            latitude=12.91,
            longitude=74.85,
            location="Mangaluru",
        )
    assert resp1.target_location["name"] == "Mangaluru"
    assert resp1.target_location["latitude"] == pytest.approx(12.91, abs=0.01)
    assert resp1.decision is not None
    assert resp1.decision.resolved_location == "Mangaluru"
    assert any("mangaluru" in f.claim.lower() or "wave" in f.claim.lower() for f in resp1.findings)
    mangaluru_ev_ids = [e.id for e in resp1.evidence]
    assert "ev-marine-wave-1" in mangaluru_ev_ids

    # --- Turn 2: What about Chennai? ---
    # Mock chennai-specific tools
    agent.tool_get_marine_forecast = MagicMock(return_value=(
        {"status": "success", "max_wave_height_m": 1.10, "douglas_scale": "Slight"},
        [Finding(id="f-marine-wave-chennai", claim="Wave height 1.10m in Chennai", value=1.10, unit="m", evidence_ids=["ev-marine-wave-chennai"], uncertainty="±0.1m", is_forecast=True, observation_time=datetime.now(UTC))],
        [EvidenceRecord(id="ev-marine-wave-chennai", dataset_id="open-meteo-marine", source_name="Open-Meteo", source_url="https://open-meteo.com", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=13.08, longitude=80.27, variable="wave_height", value=1.10, unit="m")]
    ))

    # Notice user payload might carry old dropdown value "Mangaluru", but query has "What about Chennai?"
    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[])), \
         patch("app.agents.marine_hazard.agent.get_active_llm_provider", AsyncMock(return_value=None)):
        resp2 = await agent.chat(
            message="What about Chennai?",
            conversation_id=conv_id,
            latitude=12.91,   # Old stale coordinate from UI dropdown
            longitude=74.85,
            location="Mangaluru",
        )
        assert resp2.target_location["name"] == "Chennai"
        assert resp2.target_location["latitude"] == pytest.approx(13.08, abs=0.01)
        assert resp2.decision is not None
        assert resp2.decision.resolved_location == "Chennai"

        # CRITICAL CHECK: Mangaluru evidence must NOT be in the Chennai response!
        chennai_ev_ids = [e.id for e in resp2.evidence]
        assert "ev-marine-wave-1" not in chennai_ev_ids
        assert "ev-marine-wave-chennai" in chennai_ev_ids

        # --- Turn 3: What about tomorrow? (Preserves Chennai anchor) ---
        resp3 = await agent.chat(
            message="What about tomorrow?",
            conversation_id=conv_id,
        )
        assert resp3.target_location["name"] == "Chennai"
        assert resp3.target_location["latitude"] == pytest.approx(13.08, abs=0.01)
        assert resp3.decision is not None
        assert resp3.decision.resolved_location == "Chennai"
        assert "tomorrow" in resp3.decision.time_range

        # --- Turn 4: Compare it with historical cyclones (Preserves Chennai anchor) ---
        resp4 = await agent.chat(
            message="Compare it with historical cyclones.",
            conversation_id=conv_id,
        )
    assert resp4.target_location["name"] == "Chennai"
    assert resp4.decision is not None
    assert resp4.decision.intent == "comparison"
    assert resp4.decision.resolved_location == "Chennai"
    assert any("f-marine-comparison-1" in f.id for f in resp4.findings)
    assert any("ev-marine-comparison-1" in e.id for e in resp4.evidence)


# =============================================================================
# 3. SAFETY AND GEOGRAPHIC BOUNDARY CHECKS
# =============================================================================

def test_noaa_nhc_indian_ocean_boundary_enforcement():
    """Verify that NOAA NHC cyclone forecast tool enforces geographic boundaries for Indian Ocean coordinates."""
    agent = MarineHazardAgent()
    res, findings, evidence = agent.tool_get_cyclone_forecast(
        db=None,
        latitude=13.08,
        longitude=80.27,
        location_name="Chennai",
    )
    assert res["status"] == "out_of_coverage"
    assert "Indian Ocean" in res["coverage_basin"]
    assert len(findings) == 1
    assert findings[0].value == "OUT_OF_COVERAGE"
    assert "outside the authoritative forecast coverage" in findings[0].claim
    assert len(evidence) == 1
    assert evidence[0].variable == "geographic_coverage_status"


def test_clear_alerts_distinguished_from_unconditional_safety():
    """Verify that empty alerts are reported as clear regional waters, not an unconditional safety guarantee."""
    mock_repo = MagicMock()
    mock_repo.list_hazards_paginated.return_value = ([], 0)
    agent = MarineHazardAgent(hazard_repo=mock_repo)

    res, findings, evidence = agent.tool_get_active_hazard_alerts(
        db=None,
        latitude=12.91,
        longitude=74.85,
        location_name="Mangaluru",
        max_distance_km=1500.0,
    )
    assert res["status"] == "success"
    assert res["is_regional_waters_clear"] is True
    assert "clear_regional_waters" in evidence[0].value
    assert "clear of active cyclone warnings" in findings[0].claim or "No active tropical cyclone alerts" in findings[0].claim


def test_distant_cyclones_not_reported_as_local_threats():
    """Verify that distant global cyclones (>1500 km away) are tagged as distant context, not local hazards."""
    from app.schemas.hazard import HazardRead, HazardTrackPoint

    distant_storm = HazardRead(
        hazard_id="hz-gdacs-distant-01",
        name="Hurricane Test",
        type="cyclone",
        source="GDACS",
        basin="eastern_pacific",
        status="active",
        first_observed=datetime.now(UTC),
        last_observed=datetime.now(UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime.now(UTC),
                latitude=20.0,
                longitude=-105.0,  # Mexico, Eastern Pacific > 10,000 km
                wind_speed_knots=75.0,
                category="Red Alert",
                is_forecast=False,
            )
        ],
        metadata_json={
            "alert_level": "Red",
            "country": "Mexico",
            "report_url": "https://www.gdacs.org/test",
        },
    )

    mock_repo = MagicMock()
    mock_repo.list_hazards_paginated.return_value = ([distant_storm], 1)
    agent = MarineHazardAgent(hazard_repo=mock_repo)

    res, findings, evidence = agent.tool_get_active_hazard_alerts(
        db=None,
        latitude=12.91,
        longitude=74.85,
        location_name="Mangaluru",
        max_distance_km=1500.0,
    )
    assert res["local_threats_count"] == 0
    assert res["distant_storms_count"] == 1
    assert res["is_regional_waters_clear"] is True

    # Check evidence classification
    distant_ev = next(e for e in evidence if "distant" in e.id)
    assert distant_ev.value["classification"] == "GEOGRAPHICALLY_UNRELATED"


# =============================================================================
# 4. DATABASE TARGET SAFETY VERIFICATION
# =============================================================================

def test_database_target_is_strictly_orca_db():
    """
    CRITICAL DATABASE SAFETY CONSTRAINT:
    Ensure application DB URL points to orca_db and NEVER to the protected orca database.
    """
    db_url = settings.DATABASE_URL
    assert "orca_db" in db_url, f"Configured DATABASE_URL must point to orca_db, got: {db_url}"
    assert not db_url.rstrip("/").endswith("/orca"), "Target database MUST NOT be the protected 'orca' database!"
