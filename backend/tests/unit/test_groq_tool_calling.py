import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.agents.marine_hazard.agent import MarineHazardAgent
from app.core.config import settings
from app.providers.llm_tools.base import LLMProvider, LLMResponse, LLMToolCall
from app.schemas.evidence import EvidenceRecord, Finding


# =============================================================================
# 1. GROQ TOOL CALLING ROUNDTRIP & EVIDENCE-GROUNDED SYNTHESIS
# =============================================================================


@pytest.mark.asyncio
async def test_groq_tool_calling_successful_roundtrip():
    """Verify full loop: question -> Groq requests tool -> Python executes -> Groq synthesizes final answer."""
    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.name = "groq"
    mock_provider.model = "openai/gpt-oss-120b"

    # Turn 1: Model requests get_marine_forecast
    tool_call = LLMToolCall(
        id="call_wave_999",
        name="get_marine_forecast",
        arguments={"latitude": 12.91, "longitude": 74.85, "location_name": "Mangaluru"},
    )
    # Turn 2: Model synthesizes final evidence-grounded answer
    mock_provider.chat_with_tools = AsyncMock(
        side_effect=[
            LLMResponse(
                content="",
                tool_calls=[tool_call],
                provider="groq",
                model="openai/gpt-oss-120b",
            ),
            LLMResponse(
                content="Based on Open-Meteo numerical wave spectra, the wave height off Mangaluru reaches 1.45m (Moderate Sea State) [ev-marine-wave-1].",
                tool_calls=[],
                provider="groq",
                model="openai/gpt-oss-120b",
            ),
        ]
    )

    agent = MarineHazardAgent()
    # Mock the tool implementation to return predictable findings/evidence
    agent.tool_get_marine_forecast = MagicMock(
        return_value=(
            {"status": "success", "peak_wave_height_m": 1.45, "max_wave_height_m": 1.45, "douglas_scale": "Moderate"},
            [Finding(id="f-wave-1", claim="Peak wave height reaches 1.45m", value=1.45, unit="m", evidence_ids=["ev-marine-wave-1"], uncertainty="±0.1m", is_forecast=True, observation_time=datetime.now(UTC))],
            [EvidenceRecord(id="ev-marine-wave-1", dataset_id="open-meteo-marine", source_name="Open-Meteo", source_url="https://open-meteo.com", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=12.91, longitude=74.85, variable="wave_height", value=1.45, unit="m")]
        )
    )

    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[mock_provider])):
        resp = await agent.chat(
            message="What are the wave conditions off Mangaluru?",
            location="Mangaluru",
            latitude=12.91,
            longitude=74.85,
        )

        assert resp.provider_used == "groq"
        assert resp.model_used == "openai/gpt-oss-120b"
        assert resp.is_fallback is False
        assert resp.synthesis_source == "llm"
        assert resp.provider_attempted == "groq"
        assert len(resp.tool_executions) == 1
        assert resp.tool_executions[0]["tool"] == "get_marine_forecast"
        assert "1.45m" in resp.message
        assert any(e.id == "ev-marine-wave-1" for e in resp.evidence)


# =============================================================================
# 2. PROVIDER FALLBACK CHAIN (GROQ -> GEMINI -> OPENROUTER -> DETERMINISTIC)
# =============================================================================


@pytest.mark.asyncio
async def test_fallback_chain_groq_failure_triggers_gemini():
    """Verify that when Groq raises an exception, the agent falls back to Gemini."""
    mock_groq = MagicMock(spec=LLMProvider)
    mock_groq.name = "groq"
    mock_groq.model = "openai/gpt-oss-120b"
    mock_groq.chat_with_tools = AsyncMock(side_effect=Exception("Groq rate limit exceeded"))

    mock_gemini = MagicMock(spec=LLMProvider)
    mock_gemini.name = "gemini"
    mock_gemini.model = "gemini-flash-latest"
    mock_gemini.chat_with_tools = AsyncMock(
        return_value=LLMResponse(
            content="Gemini synthesized report: Moderate sea state observed off Mangaluru.",
            tool_calls=[],
            provider="gemini",
            model="gemini-flash-latest",
        )
    )

    agent = MarineHazardAgent()

    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[mock_groq, mock_gemini])):
        resp = await agent.chat(
            message="What are the wave conditions off Mangaluru?",
            location="Mangaluru",
        )

        assert resp.provider_used == "gemini"
        assert resp.model_used == "gemini-flash-latest"
        assert resp.is_fallback is False
        assert resp.provider_attempted == "groq"
        assert "Gemini synthesized report" in resp.message


@pytest.mark.asyncio
async def test_fallback_chain_all_providers_fail_enters_deterministic_fallback():
    """Verify that when all LLM providers fail, the agent cleanly transitions to deterministic fallback."""
    mock_groq = MagicMock(spec=LLMProvider)
    mock_groq.name = "groq"
    mock_groq.model = "openai/gpt-oss-120b"
    mock_groq.chat_with_tools = AsyncMock(side_effect=Exception("Connection timed out"))

    mock_openrouter = MagicMock(spec=LLMProvider)
    mock_openrouter.name = "openrouter"
    mock_openrouter.model = "meta-llama/llama-3.3-70b-instruct"
    mock_openrouter.chat_with_tools = AsyncMock(side_effect=Exception("Credit balance insufficient"))

    agent = MarineHazardAgent()
    agent.tool_get_marine_forecast = MagicMock(
        return_value=(
            {"status": "success", "peak_wave_height_m": 1.45, "max_wave_height_m": 1.45, "douglas_scale": "Moderate"},
            [Finding(id="f-wave-1", claim="Peak wave height reaches 1.45m", value=1.45, unit="m", evidence_ids=["ev-marine-wave-1"], uncertainty="±0.1m", is_forecast=True, observation_time=datetime.now(UTC))],
            [EvidenceRecord(id="ev-marine-wave-1", dataset_id="open-meteo-marine", source_name="Open-Meteo", source_url="https://open-meteo.com", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=12.91, longitude=74.85, variable="wave_height", value=1.45, unit="m")]
        )
    )
    agent.tool_get_active_hazard_alerts = MagicMock(
        return_value=(
            {"status": "success", "is_regional_waters_clear": True},
            [Finding(id="f-gdacs-clear", claim="Regional waters clear", value="CLEAR", unit="status", evidence_ids=["ev-gdacs-clear"], uncertainty="Low", is_forecast=False, observation_time=datetime.now(UTC))],
            [EvidenceRecord(id="ev-gdacs-clear", dataset_id="gdacs-tc", source_name="GDACS", source_url="https://gdacs.org", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=12.91, longitude=74.85, variable="alert", value="clear", unit="status")]
        )
    )

    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[mock_groq, mock_openrouter])):
        resp = await agent.chat(
            message="What are the wave conditions off Mangaluru?",
            location="Mangaluru",
        )

        assert resp.is_fallback is True
        assert resp.provider_used == "deterministic_fallback"
        assert resp.model_used == "deterministic_rule_engine"
        assert resp.synthesis_source == "deterministic_rule_engine"
        assert resp.provider_attempted == "groq"
        assert resp.fallback_reason is not None
        assert "openrouter" in resp.fallback_reason.lower() or "groq" in resp.fallback_reason.lower()


# =============================================================================
# 3. SAFETY, ARGUMENT VALIDATION, AND LOOP GUARDS
# =============================================================================


@pytest.mark.asyncio
async def test_unauthorized_tool_name_rejected_safely():
    """Verify that an unknown or unauthorized tool requested by the model is rejected with an error message."""
    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.name = "groq"
    mock_provider.model = "openai/gpt-oss-120b"

    unauthorized_tool = LLMToolCall(
        id="call_bad_1",
        name="execute_arbitrary_shell_command",
        arguments={"cmd": "cat /etc/passwd"},
    )
    mock_provider.chat_with_tools = AsyncMock(
        side_effect=[
            LLMResponse(content="", tool_calls=[unauthorized_tool], provider="groq", model="openai/gpt-oss-120b"),
            LLMResponse(content="I cannot execute arbitrary commands.", tool_calls=[], provider="groq", model="openai/gpt-oss-120b"),
        ]
    )

    agent = MarineHazardAgent()
    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[mock_provider])):
        resp = await agent.chat(message="Run a shell command")
        assert resp.is_fallback is False
        assert len(resp.tool_executions) == 0  # Tool was rejected, not executed


@pytest.mark.asyncio
async def test_duplicate_tool_call_skipped_to_prevent_infinite_loops():
    """Verify that duplicate identical tool calls in the same turn are not re-executed infinitely."""
    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.name = "groq"
    mock_provider.model = "openai/gpt-oss-120b"

    repeated_tool = LLMToolCall(
        id="call_dup_1",
        name="get_marine_forecast",
        arguments={"latitude": 12.91, "longitude": 74.85, "location_name": "Mangaluru"},
    )
    # Model requests the exact same tool twice in successive turns
    mock_provider.chat_with_tools = AsyncMock(
        side_effect=[
            LLMResponse(content="", tool_calls=[repeated_tool], provider="groq", model="openai/gpt-oss-120b"),
            LLMResponse(content="", tool_calls=[repeated_tool], provider="groq", model="openai/gpt-oss-120b"),
            LLMResponse(content="Final synthesis after loop prevention.", tool_calls=[], provider="groq", model="openai/gpt-oss-120b"),
        ]
    )

    agent = MarineHazardAgent()
    agent.tool_get_marine_forecast = MagicMock(
        return_value=(
            {"status": "success", "peak_wave_height_m": 1.45},
            [],
            []
        )
    )

    with patch("app.agents.marine_hazard.agent.get_ordered_llm_providers", AsyncMock(return_value=[mock_provider])):
        resp = await agent.chat(message="Check waves")
        # Should execute only once due to signature deduplication
        assert len(resp.tool_executions) == 1


# =============================================================================
# 4. CHAT CONTROLS: CUSTOM COORDINATES, TOMORROW WINDOW, AND CONSISTENCY
# =============================================================================


@pytest.mark.asyncio
async def test_custom_coordinates_override_preset():
    """Verify custom latitude/longitude override the dropdown preset when use_custom_coordinates is True."""
    agent = MarineHazardAgent()
    agent.tool_get_marine_forecast = MagicMock(return_value=({"status": "success"}, [], []))
    agent.tool_get_active_hazard_alerts = MagicMock(return_value=({"status": "success"}, [], []))

    resp = await agent.chat(
        message="What are the sea conditions?",
        location="Mangaluru",  # Preset in dropdown
        latitude=15.55,       # Custom coordinates entered by user
        longitude=73.75,
        use_custom_coordinates=True,
    )

    assert resp.target_location["latitude"] == pytest.approx(15.55, abs=0.01)
    assert resp.target_location["longitude"] == pytest.approx(73.75, abs=0.01)
    assert "Custom" in resp.target_location["name"] or "15.55" in resp.target_location["name"]


@pytest.mark.asyncio
async def test_tomorrow_forecast_isolates_tomorrow_window():
    """Verify 'tomorrow' query passes is_tomorrow=True and isolates the +24h to +48h lead window."""
    agent = MarineHazardAgent()
    agent.tool_get_marine_forecast = MagicMock(
        return_value=(
            {
                "status": "success",
                "location": "Chennai",
                "peak_wave_height_m": 0.88,
                "max_wave_height_m": 0.88,
                "douglas_scale": "Slight",
                "time_window": "Tomorrow (+24h to +48h Lead Window)",
            },
            [Finding(id="f-wave-tmrw", claim="Marine Sea State Forecast (Tomorrow (+24h to +48h Lead Window), Status: FORECAST): Slight sea state predicted", value=0.88, unit="m", evidence_ids=["ev-tmrw"], uncertainty="Low", is_forecast=True, observation_time=datetime.now(UTC))],
            [EvidenceRecord(id="ev-tmrw", dataset_id="open-meteo-marine", source_name="Open-Meteo", source_url="https://open-meteo.com", retrieval_time=datetime.now(UTC), observation_time=datetime.now(UTC), latitude=13.08, longitude=80.27, variable="wave_height", value=0.88, unit="m")]
        )
    )
    agent.tool_get_active_hazard_alerts = MagicMock(return_value=({"status": "success"}, [], []))

    resp = await agent.chat(
        message="What about tomorrow?",
        location="Chennai",
        latitude=13.08,
        longitude=80.27,
    )

    assert resp.decision is not None
    assert resp.decision.intent == "forecast"
    assert "tomorrow" in resp.decision.time_range.lower()
    assert any("Tomorrow" in f.claim for f in resp.findings)


def test_wave_height_consistency_between_forecast_and_comparison():
    """Verify tool_compare_current_vs_historical extracts the exact peak_wave_height_m (e.g. 0.88m) consistently."""
    agent = MarineHazardAgent()
    # Mock marine forecast returning 0.88m for Chennai
    agent.tool_get_marine_forecast = MagicMock(
        return_value=(
            {
                "status": "success",
                "location": "Chennai",
                "peak_wave_height_m": 0.88,
                "max_wave_height_m": 0.88,
                "mean_wave_height_m": 0.72,
                "douglas_sea_state": "Slight",
                "douglas_scale": "Slight",
            },
            [],
            [],
        )
    )
    agent.tool_get_active_hazard_alerts = MagicMock(return_value=({"status": "success", "is_regional_waters_clear": True}, [], []))
    agent.tool_search_historical_cyclones = MagicMock(return_value=({"status": "success", "storm_name": "Vardah", "closest_approach_km": 45.0, "peak_wind_knots": 70.0}, [], []))

    summary, findings, evidence = agent.tool_compare_current_vs_historical(
        db=None,
        latitude=13.08,
        longitude=80.27,
        location_name="Chennai",
    )

    # Must be exactly 0.88m, NOT default fallback 1.2m!
    assert summary["current_wave_m"] == pytest.approx(0.88, abs=0.01)
    comp_finding = next((f for f in findings if "f-marine-comparison" in f.id), None)
    assert comp_finding is not None
    assert "0.88" in comp_finding.claim


def test_database_target_strictly_orca_db():
    """Safety check: Confirm only orca_db is targeted and protected orca is untouched."""
    db_url = settings.DATABASE_URL
    assert "orca_db" in db_url
    assert db_url.split("/")[-1].split("?")[0].startswith("orca_db")
    assert not db_url.endswith("/orca")
