from datetime import UTC, datetime, timedelta

from app.core.freshness import reliability_tracker
from app.db.repositories.forecast_repo import forecast_repo
from app.providers.data.nhc import (
    NormalizedCycloneForecastPosition,
    NormalizedCycloneForecastRun,
)
from app.providers.data.open_meteo import NormalizedMarineForecastPoint


def test_gdacs_provider_status_endpoint(client, monkeypatch):
    # Set tracker status to idle/success
    reliability_tracker.record_attempt_success("gdacs", message="Healthy mock sync")

    response = client.get("/api/v1/hazards/sync/gdacs/status")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "GDACS"
    assert "freshness" in data
    assert "is_healthy" in data
    assert "is_fallback" in data
    assert "active_alerts_count" in data
    assert data["last_attempt_status"] == "success"


def test_marine_provider_status_endpoint(client, monkeypatch):
    reliability_tracker.record_attempt_success(
        "open-meteo-marine", message="Mock marine sync success", retrieved_count=24
    )

    response = client.get(
        "/api/v1/forecasts/marine/status?latitude=12.91&longitude=74.85"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "open-meteo-marine"
    assert "freshness" in data
    assert "is_healthy" in data
    assert "is_fallback" in data
    assert "total_persisted_points" in data


def test_cyclone_provider_status_endpoint(client, monkeypatch):
    reliability_tracker.record_attempt_success(
        "noaa-nhc", message="Mock NHC sync success", retrieved_count=1
    )

    response = client.get("/api/v1/forecasts/cyclones/status")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "NOAA NHC"
    assert "freshness" in data
    assert "is_healthy" in data
    assert "is_fallback" in data
    assert "active_runs_count" in data
    assert "total_positions_count" in data
    assert "geographic_coverage" in data
    assert "Does not cover Indian Ocean" in data["geographic_coverage"]


def test_marine_forecast_query_includes_freshness_and_fallback(client, monkeypatch):
    now = datetime.now(UTC)
    mock_point = NormalizedMarineForecastPoint(
        id="mf-status-test-01",
        provider="open-meteo-marine",
        model="standard",
        latitude=12.91,
        longitude=74.85,
        valid_time=now + timedelta(hours=1),
        wave_height_m=1.2,
        wave_period_s=7.0,
        wave_direction_deg=250.0,
        wind_wave_height_m=0.4,
        swell_wave_height_m=1.0,
        retrieval_time=now,
        source_url="https://mock.marine/test",
    )

    async def mock_fetch(*args, **kwargs):
        return [mock_point]

    monkeypatch.setattr(forecast_repo.marine_client, "fetch_and_normalize", mock_fetch)

    # 1. Successful sync
    sync_res = client.post(
        "/api/v1/forecasts/marine/sync",
        json={"latitude": 12.91, "longitude": 74.85, "forecast_days": 1},
    )
    assert sync_res.status_code == 200

    # 2. Query
    query_res = client.get("/api/v1/forecasts/marine?latitude=12.91&longitude=74.85")
    assert query_res.status_code == 200
    qdata = query_res.json()
    assert qdata["freshness"] == "fresh"
    assert qdata["is_fallback"] is False
    assert qdata["last_retrieved_utc"] is not None
    assert qdata["count"] >= 1


def test_failed_sync_marks_fallback_without_data_loss(client, monkeypatch):
    # 1. Simulate an existing successful point
    now = datetime.now(UTC)
    mock_point = NormalizedMarineForecastPoint(
        id="mf-fallback-test-01",
        provider="open-meteo-marine",
        model="standard",
        latitude=12.91,
        longitude=74.85,
        valid_time=now + timedelta(hours=2),
        wave_height_m=1.5,
        wave_period_s=8.0,
        wave_direction_deg=240.0,
        wind_wave_height_m=0.5,
        swell_wave_height_m=1.2,
        retrieval_time=now,
        source_url="https://mock.marine/test",
    )

    async def mock_fetch_success(*args, **kwargs):
        return [mock_point]

    monkeypatch.setattr(
        forecast_repo.marine_client, "fetch_and_normalize", mock_fetch_success
    )
    client.post(
        "/api/v1/forecasts/marine/sync",
        json={"latitude": 12.91, "longitude": 74.85, "forecast_days": 1},
    )

    # Verify data is stored
    q1 = client.get("/api/v1/forecasts/marine?latitude=12.91&longitude=74.85")
    count_before = q1.json()["count"]
    assert count_before >= 1

    # 2. Now simulate upstream outage (e.g. 502 or timeout)
    async def mock_fetch_failure(*args, **kwargs):
        raise RuntimeError("Open-Meteo upstream service unavailable (503)")

    monkeypatch.setattr(
        forecast_repo.marine_client, "fetch_and_normalize", mock_fetch_failure
    )

    # 3. Trigger sync -> must honestly fail with 502
    fail_res = client.post(
        "/api/v1/forecasts/marine/sync",
        json={"latitude": 12.91, "longitude": 74.85, "forecast_days": 1},
    )
    assert fail_res.status_code == 502

    # 4. Crucial: Querying persisted data MUST still succeed and return previous data
    q2 = client.get("/api/v1/forecasts/marine?latitude=12.91&longitude=74.85")
    assert q2.status_code == 200
    q2_data = q2.json()
    assert q2_data["count"] == count_before
    assert q2_data["is_fallback"] is True  # Fallback flag active!

    # 5. Check status endpoint honestly reports fallback and failure
    status_res = client.get(
        "/api/v1/forecasts/marine/status?latitude=12.91&longitude=74.85"
    )
    assert status_res.status_code == 200
    sdata = status_res.json()
    assert sdata["is_fallback"] is True
    assert sdata["is_healthy"] is False
    assert sdata["last_attempt_status"] == "failed"
    assert "Open-Meteo Marine refresh failed" in sdata["message"]


def test_cyclone_failed_sync_marks_fallback_and_recovers(client, monkeypatch):
    """Verify NOAA NHC fallback: failure preserves existing runs, reports fallback, and recovers on subsequent sync."""
    now = datetime.now(UTC)
    mock_run = NormalizedCycloneForecastRun(
        id="cfr-fallback-test-run-001",
        storm_id="storm-fallback-01",
        storm_name="Hurricane Fallback Test",
        basin="north_atlantic",
        provider="NOAA NHC",
        advisory_number="005",
        issue_time=now,
        retrieval_time=now,
        source_url="https://mock.nhc/fallback-test",
        positions=[
            NormalizedCycloneForecastPosition(
                id="cfp-fallback-test-01-tau00",
                lead_time_hours=0,
                valid_time=now,
                latitude=25.0,
                longitude=-75.0,
                max_wind_knots=85.0,
                classification="HU",
                stage_description="Hurricane",
            )
        ],
    )

    try:
        # 1. Successful initial sync
        async def mock_fetch_success(*args, **kwargs):
            return [mock_run]

        monkeypatch.setattr(
            forecast_repo.nhc_client,
            "fetch_and_normalize_forecasts",
            mock_fetch_success,
        )
        res1 = client.post("/api/v1/forecasts/cyclones/sync")
        assert res1.status_code == 200

        q1 = client.get("/api/v1/forecasts/cyclones/runs?storm_id=storm-fallback-01")
        assert q1.status_code == 200
        assert q1.json()["count"] >= 1
        assert q1.json()["is_fallback"] is False

        # 2. Subsequent failure
        async def mock_fetch_failure(*args, **kwargs):
            raise RuntimeError("NOAA NHC advisory feed unreachable (503)")

        monkeypatch.setattr(
            forecast_repo.nhc_client,
            "fetch_and_normalize_forecasts",
            mock_fetch_failure,
        )
        res_fail = client.post("/api/v1/forecasts/cyclones/sync")
        assert res_fail.status_code == 502

        # 3. Persisted run remains queryable with fallback flag
        q2 = client.get("/api/v1/forecasts/cyclones/runs?storm_id=storm-fallback-01")
        assert q2.status_code == 200
        assert q2.json()["count"] >= 1
        assert q2.json()["is_fallback"] is True

        # 4. Status reflects failure and fallback
        status_res = client.get("/api/v1/forecasts/cyclones/status")
        assert status_res.status_code == 200
        s_data = status_res.json()
        assert s_data["is_fallback"] is True
        assert s_data["is_healthy"] is False
        assert s_data["last_attempt_status"] == "failed"

        # 5. Subsequent recovery
        monkeypatch.setattr(
            forecast_repo.nhc_client,
            "fetch_and_normalize_forecasts",
            mock_fetch_success,
        )
        res_rec = client.post("/api/v1/forecasts/cyclones/sync")
        assert res_rec.status_code == 200

        status_rec = client.get("/api/v1/forecasts/cyclones/status")
        assert status_rec.status_code == 200
        assert status_rec.json()["is_fallback"] is False
        assert status_rec.json()["is_healthy"] is True
        assert status_rec.json()["last_attempt_status"] == "success"
    finally:
        from app.db.hazard_session import HazardSessionLocal
        from app.models.forecast import CycloneForecastPosition, CycloneForecastRun

        cleanup_db = HazardSessionLocal()
        try:
            cleanup_db.query(CycloneForecastPosition).filter(
                CycloneForecastPosition.forecast_run_id == "cfr-fallback-test-run-001"
            ).delete()
            cleanup_db.query(CycloneForecastRun).filter(
                CycloneForecastRun.id == "cfr-fallback-test-run-001"
            ).delete()
            cleanup_db.commit()
        finally:
            cleanup_db.close()


def test_gdacs_failed_sync_marks_fallback_without_data_loss(client, monkeypatch):
    """Verify GDACS fallback: failed sync preserves existing alerts and reports fallback in status."""
    import uuid
    from unittest.mock import patch

    from app.db.session import get_db
    from app.models.hazard import Hazard, HazardTrack
    from app.providers.data.gdacs import GDACSValidationReport
    from app.schemas.hazard import HazardRead, HazardTrackPoint

    test_uid = uuid.uuid4().hex[:8]
    test_hz_id = f"hz-gdacs-fb-{test_uid}"

    mock_hazard = HazardRead(
        hazard_id=test_hz_id,
        name="Tropical Cyclone FALLBACK-TEST",
        type="cyclone",
        source="GDACS",
        basin="arabian_sea",
        status="active",
        first_observed=datetime(2026, 10, 15, 0, 0, tzinfo=UTC),
        last_observed=datetime(2026, 10, 16, 6, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2026, 10, 16, 6, 0, tzinfo=UTC),
                latitude=15.0,
                longitude=70.0,
                wind_speed_knots=70.0,
                category="Red Alert",
                is_forecast=False,
            )
        ],
        metadata_json={
            "alert_level": "Red",
            "alert_score": 2.5,
            "gdacs_event_id": f"fb-{test_uid}",
            "retrieval_timestamp_utc": datetime.now(UTC).isoformat(),
        },
    )
    mock_report = GDACSValidationReport(
        retrieved_count=1,
        validated_count=1,
        rejected_count=0,
    )

    try:
        # 1. Successful initial sync
        with patch(
            "app.api.v1.endpoints.hazards.GDACSClient.fetch_and_validate_active_cyclones"
        ) as mock_fetch:
            mock_fetch.return_value = ([mock_hazard], mock_report)
            res1 = client.post("/api/v1/hazards/sync/gdacs")
            assert res1.status_code == 200

        # Verify alert stored
        q1 = client.get("/api/v1/hazards?source=GDACS&status=active")
        assert q1.status_code == 200
        assert any(h["hazard_id"] == test_hz_id for h in q1.json()["items"])

        # 2. Subsequent failed sync
        with patch(
            "app.api.v1.endpoints.hazards.GDACSClient.fetch_and_validate_active_cyclones"
        ) as mock_fail:
            mock_fail.side_effect = RuntimeError(
                "GDACS live server returned 500 Internal Error"
            )
            res_fail = client.post("/api/v1/hazards/sync/gdacs")
            assert res_fail.status_code == 502

        # 3. Previously stored alerts MUST remain intact and queryable
        q2 = client.get("/api/v1/hazards?source=GDACS&status=active")
        assert q2.status_code == 200
        assert any(h["hazard_id"] == test_hz_id for h in q2.json()["items"])

        # 4. Status endpoint reflects fallback
        st = client.get("/api/v1/hazards/sync/gdacs/status")
        assert st.status_code == 200
        st_data = st.json()
        assert st_data["is_fallback"] is True
        assert st_data["is_healthy"] is False
        assert st_data["last_attempt_status"] == "failed"
    finally:
        # Cleanup
        from app.db.hazard_session import HazardSessionLocal
        db = HazardSessionLocal()
        try:
            db.query(HazardTrack).filter(HazardTrack.hazard_id == test_hz_id).delete()
            db.query(Hazard).filter(Hazard.id == test_hz_id).delete()
            db.commit()
        finally:
            db.close()


def test_valid_empty_responses_do_not_fail(client, monkeypatch):
    """Verify that genuinely empty valid responses are distinguished from provider failures."""
    from unittest.mock import patch

    from app.providers.data.gdacs import GDACSValidationReport

    # 1. GDACS empty response -> status="empty", not an error
    empty_report = GDACSValidationReport(
        retrieved_count=0, validated_count=0, rejected_count=0
    )
    with patch(
        "app.api.v1.endpoints.hazards.GDACSClient.fetch_and_validate_active_cyclones"
    ) as mock_gdacs:
        mock_gdacs.return_value = ([], empty_report)
        res_gdacs = client.post("/api/v1/hazards/sync/gdacs")
        assert res_gdacs.status_code == 200
        assert res_gdacs.json()["status"] == "empty"
        assert res_gdacs.json()["retrieved_count"] == 0

    # 2. Open-Meteo empty response -> status="success", 0 points
    async def mock_marine_empty(*args, **kwargs):
        return []

    monkeypatch.setattr(
        forecast_repo.marine_client, "fetch_and_normalize", mock_marine_empty
    )
    res_marine = client.post(
        "/api/v1/forecasts/marine/sync",
        json={"latitude": 12.91, "longitude": 74.85, "forecast_days": 1},
    )
    assert res_marine.status_code == 200
    assert res_marine.json()["status"] == "success"
    assert res_marine.json()["retrieved_points"] == 0

    # 3. NOAA NHC empty response -> status="success", 0 runs
    async def mock_nhc_empty(*args, **kwargs):
        return []

    monkeypatch.setattr(
        forecast_repo.nhc_client, "fetch_and_normalize_forecasts", mock_nhc_empty
    )
    res_nhc = client.post("/api/v1/forecasts/cyclones/sync")
    assert res_nhc.status_code == 200
    assert res_nhc.json()["status"] == "success"
    assert res_nhc.json()["runs_retrieved"] == 0


def test_database_persistence_exception_reports_failure(client, monkeypatch):
    """Verify that a database persistence exception is caught, reported as a failed sync, and does not report fake success."""

    # Simulate DB persistence failure on marine sync
    async def mock_db_error(*args, **kwargs):
        raise RuntimeError("PostgreSQL disk space exhausted during insert")

    monkeypatch.setattr(forecast_repo, "sync_marine_forecast", mock_db_error)

    res = client.post(
        "/api/v1/forecasts/marine/sync",
        json={"latitude": 12.91, "longitude": 74.85, "forecast_days": 1},
    )
    # Must fail honestly with 502/500, NOT return 200 fake success
    assert res.status_code == 502
    assert "Open-Meteo Marine ingestion failed" in res.json()["detail"]
