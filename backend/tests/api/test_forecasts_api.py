from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.db.repositories.forecast_repo import forecast_repo
from app.main import app
from app.providers.data.nhc import (
    NormalizedCycloneForecastPosition,
    NormalizedCycloneForecastRun,
)
from app.providers.data.open_meteo import NormalizedMarineForecastPoint


@pytest.fixture
def client():
    return TestClient(app)


def test_sync_marine_forecast_endpoint(client, monkeypatch):
    now = datetime.now(UTC)
    mock_points = [
        NormalizedMarineForecastPoint(
            id="mf-api-test-01",
            provider="open-meteo-marine",
            model="standard",
            latitude=12.91,
            longitude=74.85,
            valid_time=now + timedelta(hours=1),
            wave_height_m=1.35,
            wave_period_s=7.8,
            wave_direction_deg=260.0,
            wind_wave_height_m=0.45,
            swell_wave_height_m=1.1,
            retrieval_time=now,
            source_url="https://mock.marine/test",
            metadata={"test": True},
        )
    ]

    async def mock_fetch(*args, **kwargs):
        return mock_points

    monkeypatch.setattr(forecast_repo.marine_client, "fetch_and_normalize", mock_fetch)

    response = client.post(
        "/api/v1/forecasts/marine/sync",
        json={"latitude": 12.91, "longitude": 74.85, "forecast_days": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["retrieved_points"] == 1
    assert data["latitude"] == 12.91


def test_get_marine_forecasts_endpoint(client):
    response = client.get(
        "/api/v1/forecasts/marine",
        params={"latitude": 12.91, "longitude": 74.85, "radius_deg": 1.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "items" in data
    assert data["provider"] == "open-meteo-marine"


def test_marine_forecast_coordinates_validation_error(client):
    # Invalid latitude 95.0
    response = client.get(
        "/api/v1/forecasts/marine",
        params={"latitude": 95.0, "longitude": 74.85},
    )
    assert response.status_code == 422


def test_sync_and_get_cyclone_forecasts_endpoints(client, monkeypatch):
    now = datetime.now(UTC)
    mock_run = NormalizedCycloneForecastRun(
        id="cfr-api-test-run-001",
        storm_id="api-storm-01",
        storm_name="Hurricane Mock",
        basin="eastern_pacific",
        provider="NOAA NHC",
        advisory_number="012",
        issue_time=now,
        retrieval_time=now,
        source_url="https://mock.nhc/test",
        positions=[
            NormalizedCycloneForecastPosition(
                id="cfp-api-test-01-tau00",
                lead_time_hours=0,
                valid_time=now,
                latitude=15.0,
                longitude=-100.0,
                max_wind_knots=90.0,
                classification="HU",
                stage_description="Hurricane",
            )
        ],
    )

    async def mock_fetch(*args, **kwargs):
        return [mock_run]

    monkeypatch.setattr(
        forecast_repo.nhc_client, "fetch_and_normalize_forecasts", mock_fetch
    )

    # 1. Sync
    sync_resp = client.post("/api/v1/forecasts/cyclones/sync")
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["status"] == "success"
    assert sync_data["runs_retrieved"] == 1

    # 2. Query Runs
    runs_resp = client.get(
        "/api/v1/forecasts/cyclones/runs", params={"storm_id": "api-storm-01"}
    )
    assert runs_resp.status_code == 200
    runs_data = runs_resp.json()
    assert runs_data["count"] >= 1
    run_id = runs_data["items"][0]["id"]

    # 3. Query Positions for Run
    pos_resp = client.get(f"/api/v1/forecasts/cyclones/runs/{run_id}/positions")
    assert pos_resp.status_code == 200
    pos_data = pos_resp.json()
    assert len(pos_data) >= 1
    assert pos_data[0]["lead_time_hours"] == 0
    assert pos_data[0]["max_wind_knots"] == 90.0
