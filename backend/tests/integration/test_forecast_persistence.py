from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text

from app.db.repositories.forecast_repo import ForecastRepository
from app.db.hazard_session import HazardSessionLocal as SessionLocal
from app.providers.data.nhc import (
    NOAAForecastClient,
    NormalizedCycloneForecastPosition,
    NormalizedCycloneForecastRun,
)
from app.providers.data.open_meteo_hazard import (
    NormalizedMarineForecastPoint,
    OpenMeteoMarineClient,
)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        # Cleanup test records created during test
        db.execute(
            text("DELETE FROM marine_forecasts WHERE provider = 'test-provider';")
        )
        db.execute(
            text("DELETE FROM cyclone_forecast_runs WHERE provider = 'test-noaa';")
        )
        db.commit()
        db.close()


@pytest.mark.anyio
async def test_marine_forecast_persistence_and_idempotency(db_session):
    now = datetime.now(UTC)
    points = [
        NormalizedMarineForecastPoint(
            id=f"mf-test-12.91-74.85-{i}",
            provider="test-provider",
            model="standard",
            latitude=12.91,
            longitude=74.85,
            valid_time=now + timedelta(hours=i),
            wave_height_m=1.2 + (i * 0.1),
            wave_period_s=8.0,
            wave_direction_deg=250.0,
            wind_wave_height_m=0.5,
            swell_wave_height_m=1.0,
            retrieval_time=now,
            source_url="https://mock.marine/test",
            metadata={"test": True},
        )
        for i in range(3)
    ]

    class MockMarineClient(OpenMeteoMarineClient):
        async def fetch_and_normalize(self, latitude, longitude, forecast_days=3):
            return points

    repo = ForecastRepository(marine_client=MockMarineClient())

    # 1. Initial Ingestion
    res1 = await repo.sync_marine_forecast(db_session, latitude=12.91, longitude=74.85)
    assert res1["status"] == "success"
    assert res1["retrieved_points"] == 3
    assert res1["inserted_points"] == 3
    assert res1["updated_points"] == 0

    # Verify rows in DB
    stored = repo.get_marine_forecasts(
        db_session, latitude=12.91, longitude=74.85, provider="test-provider"
    )
    assert len(stored) == 3
    assert stored[0].wave_height_m == 1.2

    # 2. Repeat Ingestion (Strict Idempotency Check)
    # Modify wave_height on second point to verify in-place update
    points[1].wave_height_m = 1.99
    res2 = await repo.sync_marine_forecast(db_session, latitude=12.91, longitude=74.85)
    assert res2["status"] == "success"
    assert res2["retrieved_points"] == 3
    assert res2["inserted_points"] == 0
    assert res2["updated_points"] == 3

    # Row count MUST remain 3 (zero duplicate records)
    stored_again = repo.get_marine_forecasts(
        db_session, latitude=12.91, longitude=74.85, provider="test-provider"
    )
    assert len(stored_again) == 3
    assert stored_again[1].wave_height_m == 1.99


@pytest.mark.anyio
async def test_cyclone_forecast_persistence_and_idempotency(db_session):
    now = datetime.now(UTC)
    run_obj = NormalizedCycloneForecastRun(
        id="cfr-test-storm-01-adv001",
        storm_id="test-storm-01",
        storm_name="Cyclone Test",
        basin="arabian_sea",
        provider="test-noaa",
        advisory_number="001",
        issue_time=now,
        retrieval_time=now,
        source_url="https://mock.nhc/test",
        positions=[
            NormalizedCycloneForecastPosition(
                id="cfp-test-storm-01-001-tau000",
                lead_time_hours=0,
                valid_time=now,
                latitude=14.0,
                longitude=72.0,
                max_wind_knots=65.0,
                classification="HU",
                stage_description="Hurricane",
            ),
            NormalizedCycloneForecastPosition(
                id="cfp-test-storm-01-001-tau012",
                lead_time_hours=12,
                valid_time=now + timedelta(hours=12),
                latitude=14.8,
                longitude=71.5,
                max_wind_knots=75.0,
                classification="HU",
                stage_description="Hurricane",
            ),
        ],
    )

    class MockNHCClient(NOAAForecastClient):
        async def fetch_and_normalize_forecasts(self):
            return [run_obj]

    repo = ForecastRepository(nhc_client=MockNHCClient())

    # 1. Initial Ingestion
    res1 = await repo.sync_cyclone_forecasts(db_session)
    assert res1["status"] == "success"
    assert res1["runs_inserted"] == 1
    assert res1["runs_updated"] == 0
    assert res1["positions_persisted"] == 2

    runs = repo.get_cyclone_forecast_runs(db_session, storm_id="test-storm-01")
    assert len(runs) == 1
    assert runs[0].storm_name == "Cyclone Test"

    positions = repo.get_cyclone_forecast_positions(
        db_session, forecast_run_id=runs[0].id
    )
    assert len(positions) == 2
    assert positions[0].lead_time_hours == 0
    assert positions[1].lead_time_hours == 12

    # 2. Repeat Ingestion (Strict Idempotency Check)
    res2 = await repo.sync_cyclone_forecasts(db_session)
    assert res2["status"] == "success"
    assert res2["runs_inserted"] == 0
    assert res2["runs_updated"] == 1

    runs_after = repo.get_cyclone_forecast_runs(db_session, storm_id="test-storm-01")
    assert len(runs_after) == 1
    positions_after = repo.get_cyclone_forecast_positions(
        db_session, forecast_run_id=runs_after[0].id
    )
    assert len(positions_after) == 2  # No duplicate positions!
