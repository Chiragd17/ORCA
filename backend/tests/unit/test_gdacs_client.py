from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.providers.data.gdacs import GDACSClient

SAMPLE_GDACS_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "eventtype": "TC",
                "eventid": 1001234,
                "eventname": "HECTOR-26",
                "name": "Tropical Cyclone HECTOR-26",
                "alertlevel": "Orange",
                "alertscore": 2.0,
                "fromdate": "2026-10-14T06:00:00",
                "todate": "2026-10-18T12:00:00",
                "country": "India, Sri Lanka",
                "iscurrent": "true",
                "severitydata": {
                    "severity": 185.0,
                    "severitytext": "Tropical Cyclone (185 km/h)",
                    "severityunit": "km/h",
                },
                "url": {
                    "report": "https://www.gdacs.org/report.aspx?eventid=1001234&eventtype=TC"
                },
            },
            "geometry": {"type": "Point", "coordinates": [73.5, 12.8]},
        }
    ],
}


@pytest.mark.asyncio
async def test_gdacs_client_parses_active_cyclone():
    client = GDACSClient()

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = SAMPLE_GDACS_GEOJSON
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        events = await client.fetch_active_tropical_cyclones()
        assert len(events) == 1
        ev = events[0]
        assert ev.event_id == "gdacs-tc-1001234"
        assert ev.event_name == "HECTOR-26"
        assert ev.alert_level == "Orange"
        assert ev.alert_score == 2.0
        assert ev.severity_kmh == 185.0
        assert ev.is_current is True


@pytest.mark.asyncio
async def test_gdacs_client_handles_timeout():
    client = GDACSClient(timeout_seconds=5)

    with (
        patch(
            "httpx.AsyncClient.get",
            side_effect=httpx.TimeoutException("Connection timed out"),
        ),
        pytest.raises(TimeoutError, match="timed out"),
    ):
        await client.fetch_active_tropical_cyclones()


@pytest.mark.asyncio
async def test_gdacs_client_handles_http_error():
    client = GDACSClient()

    mock_resp = MagicMock()
    mock_resp.status_code = 503
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        "503 Service Unavailable", request=AsyncMock(), response=mock_resp
    )

    with (
        patch("httpx.AsyncClient.get", return_value=mock_resp),
        pytest.raises(RuntimeError, match="GDACS API returned status 503"),
    ):
        await client.fetch_active_tropical_cyclones()


@pytest.mark.asyncio
async def test_gdacs_client_handles_empty_response():
    client = GDACSClient()

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"type": "FeatureCollection", "features": []}
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        events = await client.fetch_active_tropical_cyclones()
        assert events == []


@pytest.mark.asyncio
async def test_gdacs_client_handles_malformed_feature_gracefully():
    client = GDACSClient()

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature"},  # Missing properties
                {"type": "Feature", "properties": {}},  # Missing eventid
                {
                    "type": "Feature",
                    "properties": {
                        "eventid": 9999,
                        "eventname": "MALFORMED_DATES",
                        "fromdate": "invalid-iso-date",
                        "todate": "invalid-iso-date",
                    },
                },
            ],
        }
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        events = await client.fetch_active_tropical_cyclones()
        assert len(events) == 1
        assert events[0].event_id == "gdacs-tc-9999"
        assert events[0].from_date is None
        assert events[0].to_date is None


@pytest.mark.asyncio
async def test_gdacs_client_validates_coordinates_and_converts_knots():
    from app.providers.data.gdacs import infer_cyclone_basin

    client = GDACSClient()
    mock_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "Class": "Point_Centroid",
                    "eventid": 1001,
                    "eventname": "VALID_STORM",
                    "name": "Tropical Cyclone VALID_STORM",
                    "alertlevel": "Red",
                    "alertscore": 2.5,
                    "fromdate": "2026-10-15T00:00:00Z",
                    "todate": "2026-10-15T12:00:00Z",
                    "severitydata": {"severity": 200.0},
                },
                "geometry": {"type": "Point", "coordinates": [88.5, 18.2]},
            },
            {
                "type": "Feature",
                "properties": {
                    "Class": "Point_Centroid",
                    "eventid": 1002,
                    "eventname": "INVALID_COORDS",
                    "severitydata": {"severity": 100.0},
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [250.0, 95.0],
                },  # Out of range
            },
        ],
    }

    with patch.object(client, "_fetch_feed_data", return_value=mock_data):
        hazards, report = await client.fetch_and_validate_active_cyclones()

        assert len(hazards) == 2
        valid_hz = next(h for h in hazards if h.hazard_id == "hz-gdacs-tc-1001")
        assert valid_hz.name == "Tropical Cyclone VALID_STORM"
        assert valid_hz.basin == "bay_of_bengal"
        assert len(valid_hz.track_points) == 1
        assert valid_hz.track_points[0].latitude == 18.2
        assert valid_hz.track_points[0].longitude == 88.5
        assert valid_hz.track_points[0].wind_speed_knots == round(200.0 * 0.539957, 1)
        assert valid_hz.track_points[0].category == "Red Alert"
        assert valid_hz.status == "active"

        # Invalid coords storm has None coordinates and no track points created
        invalid_hz = next(h for h in hazards if h.hazard_id == "hz-gdacs-tc-1002")
        assert len(invalid_hz.track_points) == 0
        assert any("out of geographic range" in r for r in report.rejection_reasons)

        # Verify basin inference helper
        assert infer_cyclone_basin(15.0, 65.0) == "arabian_sea"
        assert infer_cyclone_basin(15.0, 85.0) == "bay_of_bengal"
        assert infer_cyclone_basin(-20.0, 60.0) == "south_indian_ocean"
        assert infer_cyclone_basin(25.0, 130.0) == "western_pacific"
        assert infer_cyclone_basin(25.0, -110.0) == "eastern_pacific"
        assert infer_cyclone_basin(25.0, -70.0) == "north_atlantic"
        assert infer_cyclone_basin(None, None) == "global"


@pytest.mark.asyncio
async def test_gdacs_client_deduplicates_events_by_id():
    client = GDACSClient()
    mock_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "Class": "Point_Centroid",
                    "eventid": 2001,
                    "eventname": "STORM_A",
                    "datemodified": "2026-10-15T06:00:00Z",
                    "severitydata": {"severity": 100.0},
                },
                "geometry": {"type": "Point", "coordinates": [70.0, 15.0]},
            },
            {
                "type": "Feature",
                "properties": {
                    "Class": "Point_Centroid",
                    "eventid": 2001,  # Duplicate event ID with later modification date
                    "eventname": "STORM_A_UPDATED",
                    "datemodified": "2026-10-15T12:00:00Z",
                    "severitydata": {"severity": 120.0},
                },
                "geometry": {"type": "Point", "coordinates": [71.0, 15.5]},
            },
        ],
    }

    with patch.object(client, "_fetch_feed_data", return_value=mock_data):
        events = await client.fetch_active_tropical_cyclones()
        assert len(events) == 1
        assert events[0].event_name == "STORM_A_UPDATED"
        assert events[0].severity_kmh == 120.0


@pytest.mark.asyncio
async def test_gdacs_client_handles_429_rate_limit_and_retries():
    client = GDACSClient(max_retries=1)

    mock_resp_429 = MagicMock()
    mock_resp_429.status_code = 429
    mock_resp_429.headers = {"Retry-After": "1"}

    mock_resp_200 = MagicMock()
    mock_resp_200.status_code = 200
    mock_resp_200.json.return_value = {"type": "FeatureCollection", "features": []}

    with (
        patch("httpx.AsyncClient.get", side_effect=[mock_resp_429, mock_resp_200]),
        patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
    ):
        events = await client.fetch_active_tropical_cyclones()
        assert events == []
        mock_sleep.assert_awaited_once_with(1.0)


@pytest.mark.asyncio
async def test_gdacs_client_handles_malformed_json():
    client = GDACSClient(max_retries=1)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.side_effect = ValueError("Invalid JSON string")

    with (
        patch("httpx.AsyncClient.get", return_value=mock_resp),
        pytest.raises(ValueError, match="malformed JSON"),
    ):
        await client.fetch_active_tropical_cyclones()


@pytest.mark.asyncio
async def test_gdacs_client_non_retryable_4xx_fails_immediately():
    client = GDACSClient(max_retries=2)

    mock_resp = MagicMock()
    mock_resp.status_code = 403

    with (
        patch("httpx.AsyncClient.get", return_value=mock_resp) as mock_get,
        pytest.raises(RuntimeError, match="client error 403"),
    ):
        await client.fetch_active_tropical_cyclones()

    assert mock_get.call_count == 1
