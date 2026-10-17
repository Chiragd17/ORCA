def test_get_hazards_list(client):
    response = client.get("/api/v1/hazards")
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "pages" in data
    assert data["count"] >= 1
    assert data["total"] >= 1
    hazard = data["items"][0]
    assert "hazard_id" in hazard
    assert "name" in hazard
    assert "track_points" in hazard
    assert len(hazard["track_points"]) > 0


def test_get_hazards_filter_by_basin(client):
    response = client.get("/api/v1/hazards?basin=arabian_sea")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["basin"] == "arabian_sea"


def test_get_specific_hazard_by_id(client):
    list_res = client.get("/api/v1/hazards")
    first_id = list_res.json()["items"][0]["hazard_id"]

    res = client.get(f"/api/v1/hazards/{first_id}")
    assert res.status_code == 200
    storm = res.json()
    assert storm["hazard_id"] == first_id
    assert len(storm["track_points"]) > 0


def test_get_unknown_hazard_returns_404(client):
    res = client.get("/api/v1/hazards/hz-non-existent-storm-999")
    assert res.status_code == 404


def test_hazards_pagination(client):
    res_p1 = client.get("/api/v1/hazards?limit=5&page=1")
    assert res_p1.status_code == 200
    d1 = res_p1.json()
    assert d1["count"] == 5
    assert d1["page"] == 1
    assert d1["total"] >= 1859
    assert d1["pages"] >= 370

    res_p2 = client.get("/api/v1/hazards?limit=5&page=2")
    assert res_p2.status_code == 200
    d2 = res_p2.json()
    assert d2["count"] == 5
    assert d2["page"] == 2

    # Verify pages contain distinct storms
    p1_ids = {h["hazard_id"] for h in d1["items"]}
    p2_ids = {h["hazard_id"] for h in d2["items"]}
    assert len(p1_ids.intersection(p2_ids)) == 0


def test_hazards_search_by_name_and_sid(client):
    # Search by storm name
    res = client.get("/api/v1/hazards?search=Tauktae")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    storm = data["items"][0]
    assert "Tauktae" in storm["name"]

    # Search by SID
    res_sid = client.get("/api/v1/hazards?search=2021133N10071")
    assert res_sid.status_code == 200
    assert res_sid.json()["total"] == 1


def test_hazards_track_endpoint(client):
    res = client.get("/api/v1/hazards?search=Tauktae")
    storm_id = res.json()["items"][0]["hazard_id"]

    track_res = client.get(f"/api/v1/hazards/{storm_id}/track")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["hazard_id"] == storm_id
    assert track_data["count"] == 49
    assert len(track_data["track_points"]) == 49

    # Verify chronological ordering and historical nature
    times = [pt["time"] for pt in track_data["track_points"]]
    assert times == sorted(times)
    for pt in track_data["track_points"]:
        assert pt["is_forecast"] is False
        assert -90.0 <= pt["latitude"] <= 90.0
        assert -180.0 <= pt["longitude"] <= 180.0


def test_hazards_stats_endpoint(client):
    res = client.get("/api/v1/hazards?search=Tauktae")
    storm_id = res.json()["items"][0]["hazard_id"]

    stats_res = client.get(f"/api/v1/hazards/{storm_id}/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["hazard_id"] == storm_id
    assert stats["max_wind_knots"] == 100.0
    assert stats["min_pressure_hpa"] == 950.0
    assert stats["track_points_count"] == 49
    assert "Category 3" in stats["categories_observed"]


def test_hazards_invalid_sort_parameter(client):
    res = client.get("/api/v1/hazards?sort_by=invalid_field")
    assert res.status_code == 400
    assert "Invalid sort_by" in res.json()["detail"]

    res_order = client.get("/api/v1/hazards?sort_order=backwards")
    assert res_order.status_code == 400
    assert "Invalid sort_order" in res_order.json()["detail"]


def test_hazards_track_not_found(client):
    res = client.get("/api/v1/hazards/hz-unknown-storm/track")
    assert res.status_code == 404


def test_gdacs_status_endpoint(client):
    res = client.get("/api/v1/hazards/sync/gdacs/status")
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "GDACS"
    assert data["is_healthy"] is True
    assert "active_alerts_count" in data


def test_gdacs_sync_endpoint_success_and_idempotency(client):
    import uuid
    from datetime import UTC, datetime
    from unittest.mock import patch

    from app.db.session import get_db
    from app.models.hazard import Hazard, HazardTrack
    from app.providers.data.gdacs import GDACSValidationReport
    from app.schemas.hazard import HazardRead, HazardTrackPoint

    test_uid = uuid.uuid4().hex[:8]
    test_hz_id = f"hz-gdacs-tc-test-{test_uid}"

    mock_hazard = HazardRead(
        hazard_id=test_hz_id,
        name="Tropical Cyclone TEST-SYNC",
        type="cyclone",
        source="GDACS",
        basin="arabian_sea",
        status="active",
        first_observed=datetime(2026, 10, 14, 0, 0, tzinfo=UTC),
        last_observed=datetime(2026, 10, 15, 6, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2026, 10, 15, 6, 0, tzinfo=UTC),
                latitude=14.2,
                longitude=68.5,
                wind_speed_knots=65.0,
                category="Orange Alert",
                is_forecast=False,
            )
        ],
        metadata_json={
            "alert_level": "Orange",
            "alert_score": 2.0,
            "gdacs_event_id": f"test-{test_uid}",
            "report_url": f"https://www.gdacs.org/report.aspx?eventid={test_uid}&eventtype=TC",
        },
    )
    mock_report = GDACSValidationReport(
        retrieved_count=1,
        validated_count=1,
        rejected_count=0,
    )

    try:
        with patch(
            "app.api.v1.endpoints.hazards.GDACSClient.fetch_and_validate_active_cyclones"
        ) as mock_fetch:
            mock_fetch.return_value = ([mock_hazard], mock_report)

            # First sync: should insert
            res1 = client.post("/api/v1/hazards/sync/gdacs")
            assert res1.status_code == 200
            data1 = res1.json()
            assert data1["status"] == "success"
            assert data1["inserted_count"] == 1
            assert data1["validated_count"] == 1

            # Second sync: idempotent, unchanged
            res2 = client.post("/api/v1/hazards/sync/gdacs")
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["inserted_count"] == 0
            assert data2["unchanged_count"] == 1

            # Query via GET /api/v1/hazards with source=GDACS
            list_res = client.get("/api/v1/hazards?source=GDACS&status=active")
            assert list_res.status_code == 200
            list_data = list_res.json()
            assert any(h["hazard_id"] == test_hz_id for h in list_data["items"])
    finally:
        # Clean up test record from database
        from app.db.hazard_session import HazardSessionLocal
        db = HazardSessionLocal()
        try:
            db.query(HazardTrack).filter(HazardTrack.hazard_id == test_hz_id).delete()
            db.query(Hazard).filter(Hazard.id == test_hz_id).delete()
            db.commit()
        finally:
            db.close()


def test_gdacs_sync_endpoint_handles_timeout(client):
    from unittest.mock import patch

    with patch(
        "app.api.v1.endpoints.hazards.GDACSClient.fetch_and_validate_active_cyclones"
    ) as mock_fetch:
        mock_fetch.side_effect = TimeoutError("GDACS timeout")
        res = client.post("/api/v1/hazards/sync/gdacs")
        assert res.status_code == 504
        assert "timed out" in res.json()["detail"]


def test_marine_hazard_agent_analyze_endpoint_success(client):
    res = client.post(
        "/api/v1/hazards/agent/analyze",
        json={
            "query": "Assess wave and cyclone conditions near Mangaluru",
            "location": "Mangaluru",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["completed", "partial"]
    assert len(data["findings"]) > 0
    assert len(data["evidence"]) > 0
    assert data["executive_summary"]
    assert isinstance(data["limitations"], list)
    assert "agent_id" in data
    assert data["agent_id"] == "marine_hazard"

    # Evidence provenance check
    ev_ids = {ev["id"] for ev in data["evidence"]}
    for f in data["findings"]:
        for ev_ref in f["evidence_ids"]:
            assert ev_ref in ev_ids, f"Finding evidence {ev_ref} not in evidence list"


def test_marine_hazard_agent_analyze_endpoint_with_coordinates(client):
    res = client.post(
        "/api/v1/hazards/agent/analyze",
        json={
            "query": "Marine wave forecast assessment",
            "latitude": 12.91,
            "longitude": 74.85,
            "location": "Mangaluru Coastal Port",
            "intent": "marine_forecast",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["completed", "partial"]
    assert len(data["findings"]) >= 1


def test_marine_hazard_agent_analyze_endpoint_invalid_coordinates(client):
    res = client.post(
        "/api/v1/hazards/agent/analyze",
        json={
            "query": "Test invalid coordinates",
            "latitude": 195.0,  # Invalid latitude (>90)
            "longitude": 74.85,
        },
    )
    assert res.status_code == 422


def test_marine_hazard_agent_analyze_endpoint_nhc_boundary_warning(client):
    res = client.post(
        "/api/v1/hazards/agent/analyze",
        json={
            "query": "Query NOAA NHC hurricane forecast runs",
            "latitude": 18.96,
            "longitude": 72.82,
            "location": "Mumbai",
            "intent": "cyclone_forecast_lookup",
        },
    )
    assert res.status_code == 200
    data = res.json()
    # Must contain out of coverage finding for Indian Ocean location
    coverage_findings = [
        f for f in data["findings"] if f.get("value") == "OUT_OF_COVERAGE"
    ]
    assert len(coverage_findings) >= 1
    assert any("NOAA NHC" in lim for lim in data["limitations"])


def test_marine_hazard_agent_chat_endpoint_lifecycle(client):
    """Test multi-turn chat interaction through the HTTP API endpoint."""
    # Turn 1: Initial user message
    res1 = client.post(
        "/api/v1/hazards/agent/chat",
        json={
            "message": "What is the wave height and hazard risk off Mangaluru?",
            "location": "Mangaluru",
            "latitude": 12.91,
            "longitude": 74.85,
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert "conversation_id" in data1
    assert "message" in data1
    assert "provider_used" in data1
    assert "model_used" in data1
    assert "is_fallback" in data1
    assert len(data1["message"]) > 20
    conv_id = data1["conversation_id"]

    # Turn 2: Follow-up question maintaining conversation_id
    res2 = client.post(
        "/api/v1/hazards/agent/chat",
        json={
            "message": "Why is the sea state moderate?",
            "conversation_id": conv_id,
        },
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["conversation_id"] == conv_id
    assert len(data2["message"]) > 20

