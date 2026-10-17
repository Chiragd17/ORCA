from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.agents.marine_hazard.agent import MarineHazardAgent
from app.providers.data.gdacs import GDACSClient
from app.providers.data.ibtracs import IBTrACSClient
from app.schemas.hazard import HazardRead, HazardTrackPoint
from app.schemas.investigation import (
    AgentExecutionStatus,
    InvestigationTask,
    LocationContext,
)


@pytest.fixture
def mock_ibtracs():
    client = IBTrACSClient()
    fake_hazard = HazardRead(
        hazard_id="hz-ibtracs-test-storm",
        name="Cyclone Tauktae",
        type="cyclone",
        source="NOAA IBTrACS",
        basin="arabian_sea",
        status="historical",
        first_observed=datetime(2021, 5, 14, 0, 0, tzinfo=UTC),
        last_observed=datetime(2021, 5, 18, 0, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2021, 5, 15, 6, 0, tzinfo=UTC),
                latitude=13.0,
                longitude=73.5,
                wind_speed_knots=70.0,
                pressure_hpa=980.0,
                category="Category 1",
                is_forecast=False,
            ),
            HazardTrackPoint(
                time=datetime(2021, 5, 16, 12, 0, tzinfo=UTC),
                latitude=15.0,
                longitude=72.8,
                wind_speed_knots=105.0,
                pressure_hpa=950.0,
                category="Category 3",
                is_forecast=False,
            ),
        ],
    )
    client.load_local_dataset = lambda: [fake_hazard]
    return client


@pytest.mark.asyncio
async def test_marine_hazard_agent_end_to_end(mock_ibtracs):
    mock_gdacs = GDACSClient()
    mock_gdacs.fetch_active_tropical_cyclones = AsyncMock(return_value=[])

    agent = MarineHazardAgent(gdacs_client=mock_gdacs, ibtracs_client=mock_ibtracs)
    task = InvestigationTask(
        investigation_id="inv-test-hz-01",
        workspace="disaster-management",
        query="Investigate cyclone risks off Mangaluru port",
        location=LocationContext(latitude=12.91, longitude=74.85, name="Mangaluru"),
    )

    result = await agent.run(task)

    assert result.agent_id == "marine_hazard"
    assert result.status == AgentExecutionStatus.COMPLETED
    assert len(result.findings) >= 2
    assert len(result.evidence) >= 2
    assert len(result.limitations) >= 3

    # Verify that all evidence_ids cited in findings resolve to actual evidence records
    evidence_id_set = {e.id for e in result.evidence}
    for finding in result.findings:
        assert len(finding.evidence_ids) > 0
        for eid in finding.evidence_ids:
            assert eid in evidence_id_set


@pytest.mark.asyncio
async def test_marine_hazard_agent_provider_failure_graceful_handling(mock_ibtracs):
    mock_gdacs = GDACSClient()
    mock_gdacs.fetch_active_tropical_cyclones = AsyncMock(
        side_effect=TimeoutError("GDACS timeout")
    )

    agent = MarineHazardAgent(gdacs_client=mock_gdacs, ibtracs_client=mock_ibtracs)
    task = InvestigationTask(
        investigation_id="inv-test-hz-02",
        workspace="disaster-management",
        query="Check active cyclone warnings",
        location=LocationContext(latitude=14.0, longitude=74.0),
    )

    result = await agent.run(task)

    # Agent should not crash; it should return PARTIAL with limitation recorded
    assert result.status == AgentExecutionStatus.PARTIAL
    assert any("GDACS" in lim for lim in result.limitations)
    assert len(result.errors) > 0
    assert len(result.findings) > 0  # Historical IBTrACS benchmark still succeeded!


@pytest.mark.asyncio
async def test_marine_hazard_agent_with_persisted_active_and_historical_alerts():
    from unittest.mock import MagicMock

    mock_repo = MagicMock()
    # Mock active alerts in database
    active_alert = HazardRead(
        hazard_id="hz-gdacs-tc-9901",
        name="Cyclone TEJ",
        type="cyclone",
        source="GDACS",
        basin="arabian_sea",
        status="active",
        first_observed=datetime(2026, 10, 14, 0, 0, tzinfo=UTC),
        last_observed=datetime(2026, 10, 15, 12, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2026, 10, 15, 12, 0, tzinfo=UTC),
                latitude=14.5,
                longitude=70.2,
                wind_speed_knots=85.0,
                category="Orange Alert",
                is_forecast=False,
            )
        ],
        metadata_json={
            "alert_level": "Orange",
            "alert_score": 2.0,
            "country": "India, Oman",
            "severity_kmh": 157.4,
            "report_url": "https://www.gdacs.org/report.aspx?eventid=9901&eventtype=TC",
        },
    )

    # Mock historical storm in database
    historical_storm = HazardRead(
        hazard_id="hz-ibtracs-hist-01",
        name="Cyclone MEGH",
        type="cyclone",
        source="NOAA IBTrACS",
        basin="arabian_sea",
        status="historical",
        first_observed=datetime(2015, 11, 5, 0, 0, tzinfo=UTC),
        last_observed=datetime(2015, 11, 10, 0, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2015, 11, 7, 12, 0, tzinfo=UTC),
                latitude=13.2,
                longitude=65.0,
                wind_speed_knots=95.0,
                pressure_hpa=965.0,
                category="Category 2",
                is_forecast=False,
            )
        ],
    )

    def mock_list_hazards_paginated(**kwargs):
        if kwargs.get("status") == "active":
            return [active_alert], 1
        elif kwargs.get("status") == "historical":
            return [historical_storm], 1
        return [active_alert, historical_storm], 2

    mock_repo.list_hazards_paginated.side_effect = mock_list_hazards_paginated

    agent = MarineHazardAgent(hazard_repo=mock_repo)
    task = InvestigationTask(
        investigation_id="inv-test-hz-03",
        workspace="disaster-management",
        query="Assess Arabian Sea active cyclone proximity",
        location=LocationContext(
            latitude=13.0, longitude=72.0, name="Arabian Sea Sector"
        ),
    )

    result = await agent.run(task)

    assert result.agent_id == "marine_hazard"
    assert result.status == AgentExecutionStatus.COMPLETED
    assert len(result.findings) >= 2

    # Finding 1 must be the active cyclone advisory
    active_finding = next(
        f for f in result.findings if f.id.startswith("f-gdacs") and "TEJ" in f.claim
    )
    assert "Status: ACTIVE" in active_finding.claim
    assert "Orange" in active_finding.claim
    assert active_finding.is_forecast is True

    # Finding 2 must be the historical benchmark
    hist_finding = next(
        f for f in result.findings if f.id.startswith("f-ibtracs") and "MEGH" in f.claim
    )
    assert "Status: HISTORICAL" in hist_finding.claim
    assert hist_finding.is_forecast is False


def test_evaluate_douglas_sea_state():
    from app.agents.marine_hazard.agent import evaluate_douglas_sea_state

    # Calm: 0 m
    s0 = evaluate_douglas_sea_state(0.0)
    assert "Calm" in s0["scale"]

    # Smooth: 0.1 to 0.5 m
    s2 = evaluate_douglas_sea_state(0.4)
    assert "Calm" in s2["scale"]

    # Moderate: 1.25 to 2.5 m
    s4 = evaluate_douglas_sea_state(1.8)
    assert "Moderate" in s4["scale"]

    # Rough: 2.5 to 4.0 m
    s5 = evaluate_douglas_sea_state(3.2)
    assert "Rough" in s5["scale"]

    # High: 6.0 to 9.0 m
    s7 = evaluate_douglas_sea_state(7.5)
    assert "High" in s7["scale"]

    # Phenomenal: > 9.0 m
    s9 = evaluate_douglas_sea_state(15.2)
    assert "Phenomenal" in s9["scale"]


def test_classify_cyclone_wind():
    from app.agents.marine_hazard.agent import classify_cyclone_wind

    assert "Unknown" in classify_cyclone_wind(None)
    assert "Depression" in classify_cyclone_wind(22.0)
    assert "Deep Depression" in classify_cyclone_wind(30.0)
    assert "Cyclonic Storm" in classify_cyclone_wind(45.0)
    assert "Severe Cyclonic Storm" in classify_cyclone_wind(55.0)
    assert "Very Severe Cyclonic Storm" in classify_cyclone_wind(75.0)
    assert "Extremely Severe Cyclonic Storm" in classify_cyclone_wind(105.0)
    assert "Super Cyclonic Storm" in classify_cyclone_wind(135.0)


def test_intent_classification():
    from app.agents.marine_hazard.agent import detect_analysis_intent

    assert detect_analysis_intent("What is the wave height and swell near Mumbai?") in [
        "current_conditions",
        "marine_forecast",
    ]
    assert detect_analysis_intent("Show historical cyclones near Chennai") in [
        "historical_event",
        "historical_cyclone_analysis",
    ]
    assert detect_analysis_intent("Are there active GDACS cyclone warnings?") in [
        "active_hazards",
        "current_hazards",
    ]
    assert (
        detect_analysis_intent("Check NOAA NHC cyclone forecast runs")
        == "cyclone_forecast_lookup"
    )
    assert (
        detect_analysis_intent("Is the pipeline data fresh or in fallback state?")
        == "data_freshness"
    )
    assert (
        detect_analysis_intent("Provide a comprehensive marine hazard assessment")
        == "comprehensive_hazard_assessment"
    )


@pytest.mark.asyncio
async def test_nhc_indian_ocean_boundary_rejection():
    mock_gdacs = GDACSClient()
    mock_gdacs.fetch_active_tropical_cyclones = AsyncMock(return_value=[])
    agent = MarineHazardAgent(gdacs_client=mock_gdacs)
    task = InvestigationTask(
        investigation_id="inv-nhc-bound-01",
        workspace="disaster-management",
        query="Check cyclone forecast from NOAA NHC",
        location=LocationContext(latitude=15.0, longitude=72.0, name="Goa Coast"),
    )

    result = await agent.run(task)

    assert result.status == AgentExecutionStatus.COMPLETED
    # Must contain NHC coverage boundary finding
    nhc_finding = next(
        (f for f in result.findings if f.id.startswith("f-nhc-coverage")), None
    )
    assert nhc_finding is not None
    assert nhc_finding.value == "OUT_OF_COVERAGE"
    assert "Indian Ocean" in nhc_finding.claim

    # Must contain coverage limitation
    assert any("NOAA NHC Geographic Coverage" in lim for lim in result.limitations)


@pytest.mark.asyncio
async def test_evidence_provenance_and_traceability(mock_ibtracs):
    from unittest.mock import MagicMock

    mock_repo = MagicMock()
    mock_repo.list_hazards_paginated.return_value = ([], 0)

    agent = MarineHazardAgent(hazard_repo=mock_repo, ibtracs_client=mock_ibtracs)
    task = InvestigationTask(
        investigation_id="inv-prov-01",
        workspace="disaster-management",
        query="Assess marine hazards for Kochi",
        location=LocationContext(latitude=9.93, longitude=76.26, name="Kochi"),
    )

    result = await agent.run(task)

    evidence_dict = {ev.id: ev for ev in result.evidence}
    assert len(evidence_dict) > 0

    # Ensure all finding evidence IDs are traced to actual evidence items
    for finding in result.findings:
        assert len(finding.evidence_ids) > 0
        for ev_id in finding.evidence_ids:
            assert ev_id in evidence_dict, (
                f"Orphaned evidence_id {ev_id} in finding {finding.id}"
            )
            ev = evidence_dict[ev_id]
            assert ev.dataset_id is not None
            assert ev.source_name is not None


@pytest.mark.asyncio
async def test_conversational_multi_turn_session_context():
    """Verify multi-turn follow-up queries retain session location and provide context-aware responses."""
    from unittest.mock import MagicMock

    mock_repo = MagicMock()
    mock_repo.list_hazards_paginated.return_value = ([], 0)
    agent = MarineHazardAgent(hazard_repo=mock_repo)

    # Turn 1: Initial broad query
    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[])), \
         patch("app.agents.marine_hazard.agent.get_active_llm_provider", AsyncMock(return_value=None)):
        res_t1 = await agent.chat(
            message="What are the wave and hazard conditions off Mangaluru?",
            location="Mangaluru",
            latitude=12.91,
            longitude=74.85,
        )
    assert res_t1.conversation_id is not None
    cid = res_t1.conversation_id
    assert res_t1.is_fallback is True
    assert res_t1.provider_used == "deterministic_fallback"
    assert res_t1.model_used == "deterministic_rule_engine"
    assert "Mangaluru" in res_t1.message
    assert len(res_t1.message) > 50

    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[])), \
         patch("app.agents.marine_hazard.agent.get_active_llm_provider", AsyncMock(return_value=None)):
        # Turn 2: Follow-up 1 ("Why is sea state moderate?")
        res_t2 = await agent.chat(
            message="Why is the sea state moderate?",
            conversation_id=cid,
        )
        assert res_t2.conversation_id == cid
        assert "Douglas" in res_t2.message or "wave" in res_t2.message.lower()

        # Turn 3: Follow-up 2 ("Is that an official warning?")
        res_t3 = await agent.chat(
            message="Is that an official warning?",
            conversation_id=cid,
        )
        assert res_t3.conversation_id == cid
        assert "warning" in res_t3.message.lower() or "imd" in res_t3.message.lower()

        # Turn 4: Follow-up 3 ("How fresh is the forecast?")
        res_t4 = await agent.chat(
            message="How fresh is the forecast data?",
            conversation_id=cid,
        )
        assert res_t4.conversation_id == cid
        assert "fresh" in res_t4.message.lower() or "utc" in res_t4.message.lower()


@pytest.mark.asyncio
async def test_llm_tool_calling_execution_loop():
    """Verify dynamic tool selection and execution loop when an LLM provider is active."""
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.providers.llm_tools.base import LLMProvider, LLMResponse, LLMToolCall

    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.name = "groq"
    mock_provider.model = "llama-3.3-70b-versatile"

    # Step 1: Model requests tool execution
    # Step 2: Model receives tool output and produces final synthesis
    tool_call = LLMToolCall(
        id="call_wave_123",
        name="get_marine_forecast",
        arguments={"latitude": 12.91, "longitude": 74.85, "location_name": "Mangaluru"},
    )
    mock_provider.chat_with_tools = AsyncMock(
        side_effect=[
            LLMResponse(
                content="",
                tool_calls=[tool_call],
                provider="groq",
                model="llama-3.3-70b-versatile",
            ),
            LLMResponse(
                content="Based on verified Open-Meteo gridded marine forecast data, significant wave height off Mangaluru is 1.6m with moderate sea state. No cyclonic storm conditions are observed.",
                tool_calls=[],
                provider="groq",
                model="llama-3.3-70b-versatile",
            ),
        ]
    )

    with patch("app.agents.marine_hazard.agent.get_active_llm_provider", AsyncMock(return_value=mock_provider)):
        agent = MarineHazardAgent()
        res = await agent.chat(
            message="Check wave height and sea conditions off Mangaluru",
            latitude=12.91,
            longitude=74.85,
            location="Mangaluru",
        )

        assert res.provider_used == "groq"
        assert res.model_used == "llama-3.3-70b-versatile"
        assert res.is_fallback is False
        assert len(res.tool_executions) == 1
        assert res.tool_executions[0]["tool"] == "get_marine_forecast"
        assert "Open-Meteo" in res.message


def test_geographic_filtering_distant_gdacs_alert_excluded():
    """Verify distant GDACS tropical cyclone alert (e.g. Mexico ~17,000 km away) is excluded from Mangaluru local threats."""
    from unittest.mock import MagicMock

    mock_repo = MagicMock()
    # Mock a storm in Eastern Pacific (Mexico)
    mexico_storm = HazardRead(
        hazard_id="hz-gdacs-tc-1001",
        name="Tropical Storm John",
        type="cyclone",
        source="GDACS",
        basin="east_pacific",
        status="active",
        first_observed=datetime(2026, 10, 10, 0, 0, tzinfo=UTC),
        last_observed=datetime(2026, 10, 16, 0, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2026, 10, 15, 0, 0, tzinfo=UTC),
                latitude=16.5,
                longitude=-98.5,  # Southern coast of Mexico
                wind_speed_knots=65.0,
                category="Red Alert",
                is_forecast=False,
            )
        ],
        metadata_json={
            "alert_level": "Red",
            "country": "Mexico",
            "report_url": "https://www.gdacs.org/report.aspx?eventid=1001&eventtype=TC",
        },
    )
    mock_repo.list_hazards_paginated.return_value = ([mexico_storm], 1)

    agent = MarineHazardAgent(hazard_repo=mock_repo)
    # Query for Mangaluru on the Indian West Coast
    summary, findings, _evidence = agent.tool_get_active_hazard_alerts(
        db=None,
        latitude=12.91,
        longitude=74.85,
        location_name="Mangaluru",
        max_distance_km=1500.0,
    )

    # Must find 0 local threats
    assert summary["local_threats_count"] == 0
    assert summary["distant_storms_count"] == 1
    # Regional waters must be confirmed clear
    assert any("Regional Cyclone Clearance Notice" in f.claim for f in findings)
    assert any(f.value == "CLEAR_LOCAL_WATERS" for f in findings)
    assert any(f.value == "GEOGRAPHICALLY_UNRELATED" for f in findings)

