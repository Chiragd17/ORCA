from datetime import UTC, datetime

import pytest

from app.providers.data.nhc import NOAAForecastClient

SAMPLE_NHC_SUMMARY = {
    "activeStorms": [
        {
            "id": "ep212026",
            "binNumber": "EP1",
            "name": "Trudy",
            "classification": "HU",
            "intensity": "80",
            "pressure": "975",
            "latitudeNumeric": 13.1,
            "longitudeNumeric": -101.6,
            "lastUpdate": "2026-10-15T15:00:00.000Z",
            "forecastTrack": {
                "advNum": "009",
                "issuance": "2026-10-15T15:00:00.000Z",
                "zipFile": "https://www.nhc.noaa.gov/gis/forecast/archive/ep212026_5day_009.zip",
            },
        }
    ]
}

SAMPLE_ADVISORY_TEXT = """
HURRICANE TRUDY FORECAST/ADVISORY NUMBER   9
NWS NATIONAL HURRICANE CENTER MIAMI FL       EP212026
1500 UTC THU OCT 15 2026

FORECAST VALID 16/0000Z 13.6N 101.9W
MAX WIND  95 KT...GUSTS 115 KT.

FORECAST VALID 16/1200Z 14.6N 102.2W
MAX WIND 115 KT...GUSTS 140 KT.

OUTLOOK VALID 19/1200Z 20.2N 107.4W
MAX WIND  55 KT...GUSTS  65 KT.
"""


def test_derive_basin():
    client = NOAAForecastClient()
    assert client._derive_basin("ep212026") == "eastern_pacific"
    assert client._derive_basin("al052026") == "north_atlantic"
    assert client._derive_basin("cp012026") == "central_pacific"


def test_parse_text_advisory_bulletin(monkeypatch):
    client = NOAAForecastClient()
    issue_time = datetime(2026, 10, 15, 15, 0, 0, tzinfo=UTC)

    # Mock fetch_forecast_positions_from_text directly
    class MockResponse:
        status_code = 200
        text = SAMPLE_ADVISORY_TEXT

    import httpx

    async def mock_get(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    import asyncio

    positions = asyncio.run(
        client.fetch_forecast_positions_from_text(
            advisory_url="https://mock.nhc/advisory",
            storm_id="ep212026",
            adv_num="009",
            issue_time=issue_time,
        )
    )

    assert len(positions) == 3
    p0 = positions[0]
    assert p0.latitude == 13.6
    assert p0.longitude == -101.9
    assert p0.max_wind_knots == 95.0
    assert p0.wind_gusts_knots == 115.0
    assert p0.lead_time_hours == 12

    p1 = positions[1]
    assert p1.latitude == 14.6
    assert p1.longitude == -102.2
    assert p1.max_wind_knots == 115.0

    p2 = positions[2]
    assert p2.latitude == 20.2
    assert p2.longitude == -107.4
    assert p2.max_wind_knots == 55.0


def test_nhc_geographic_coverage_constant():
    from app.providers.data.nhc import GEOGRAPHIC_COVERAGE

    assert "eastern_pacific" in GEOGRAPHIC_COVERAGE
    assert "north_atlantic" in GEOGRAPHIC_COVERAGE
    assert "central_pacific" in GEOGRAPHIC_COVERAGE
    assert "Does not cover Indian Ocean" in GEOGRAPHIC_COVERAGE


@pytest.mark.asyncio
async def test_nhc_client_handles_429_rate_limit():
    from unittest.mock import AsyncMock, MagicMock, patch

    client = NOAAForecastClient(max_retries=1)

    mock_429 = MagicMock()
    mock_429.status_code = 429
    mock_429.headers = {"Retry-After": "1"}

    mock_200 = MagicMock()
    mock_200.status_code = 200
    mock_200.json.return_value = SAMPLE_NHC_SUMMARY

    with (
        patch("httpx.AsyncClient.get", side_effect=[mock_429, mock_200]),
        patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
    ):
        data = await client.fetch_current_storms()
        assert "activeStorms" in data
        mock_sleep.assert_awaited_once_with(1.0)


@pytest.mark.asyncio
async def test_nhc_client_handles_malformed_json():
    from unittest.mock import MagicMock, patch

    import pytest

    client = NOAAForecastClient(max_retries=1)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.side_effect = ValueError("Malformed JSON from NHC")

    with (
        patch("httpx.AsyncClient.get", return_value=mock_resp),
        pytest.raises(ValueError, match="malformed JSON"),
    ):
        await client.fetch_current_storms()


@pytest.mark.asyncio
async def test_nhc_client_non_retryable_4xx():
    from unittest.mock import MagicMock, patch

    import pytest

    client = NOAAForecastClient(max_retries=2)
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_resp.text = "Not Found"

    with (
        patch("httpx.AsyncClient.get", return_value=mock_resp),
        pytest.raises(ValueError, match="client error 404"),
    ):
        await client.fetch_current_storms()
