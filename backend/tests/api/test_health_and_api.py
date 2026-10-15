from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint truthful reporting."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] in ["connected", "disconnected"]
    assert "version" in data


def test_marine_observations_endpoint():
    """Verify read-only marine observations endpoint contract."""
    resp = client.get("/api/v1/marine/observations?lat=12.87&lon=74.88")
    assert resp.status_code == 200
    data = resp.json()
    assert "location" in data
    assert data["location"]["latitude"] == 12.87
    assert "observations" in data
    assert isinstance(data["observations"], list)


def test_hazards_endpoint():
    """Verify read-only hazards endpoint contract."""
    resp = client.get("/api/v1/hazards")
    assert resp.status_code == 200
    data = resp.json()
    assert "count" in data
    assert "hazards" in data
    assert isinstance(data["hazards"], list)


def test_investigation_lifecycle():
    """Verify investigation creation, event trace, and report generation."""
    # 1. Create investigation
    create_resp = client.post("/api/v1/investigations", json={
        "workspace": "fisherman",
        "query": "Investigate wave height offshore Mangaluru"
    })
    assert create_resp.status_code == 201
    create_data = create_resp.json()
    assert "investigation_id" in create_data
    inv_id = create_data["investigation_id"]

    # 2. Get details
    get_resp = client.get(f"/api/v1/investigations/{inv_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["investigation_id"] == inv_id
    assert "findings" in get_data
    assert "limitations" in get_data

    # 3. Get events
    events_resp = client.get(f"/api/v1/investigations/{inv_id}/events")
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) > 0
    event_types = [e["event_type"] for e in events]
    assert "investigation_started" in event_types
    assert "investigation_completed" in event_types

    # 4. Get report
    report_resp = client.get(f"/api/v1/investigations/{inv_id}/report")
    assert report_resp.status_code == 200
    report_data = report_resp.json()
    assert report_data["format"] == "markdown"
    assert "content" in report_data
