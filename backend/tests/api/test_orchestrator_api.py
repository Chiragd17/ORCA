import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_orchestrator_agents_endpoint():
    """Verify that /orchestrator/agents returns all 4 specialists + master orchestrator."""
    resp = client.get("/api/v1/orchestrator/agents")
    assert resp.status_code == 200
    agents = resp.json()
    assert isinstance(agents, list)
    assert len(agents) >= 4

    agent_ids = [a["agent_id"] for a in agents]
    assert "orchestrator" in agent_ids
    assert "ocean_research" in agent_ids
    assert "marine_hazard" in agent_ids
    assert "coastal_risk" in agent_ids
    assert "evidence_verification" in agent_ids

    for a in agents:
        assert "title" in a
        assert "role" in a
        assert a["status"] == "LIVE"
        assert len(a["capabilities"]) > 0


def test_orchestrator_stats_endpoint():
    """Verify that /orchestrator/stats returns aggregate telemetry and verification metrics."""
    resp = client.get("/api/v1/orchestrator/stats")
    assert resp.status_code == 200
    stats = resp.json()

    assert "total_investigations" in stats
    assert "completed_count" in stats
    assert "registered_agents_count" in stats
    assert stats["registered_agents_count"] == 4
    assert "verification_pass_rate_percent" in stats
    assert stats["verification_pass_rate_percent"] >= 0.0


def test_orchestrator_create_and_get_investigation_lifecycle():
    """Verify end-to-end API execution: create -> list -> detail -> events -> evidence."""
    # 1. Create Investigation
    create_payload = {
        "workspace": "fisherman",
        "query": "Assess wave heights and sea surface temperature off Mangaluru",
        "latitude": 12.91,
        "longitude": 74.85,
        "radius_km": 50.0,
    }
    create_resp = client.post("/api/v1/orchestrator", json=create_payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()

    assert "investigation_id" in created_data
    inv_id = created_data["investigation_id"]
    assert created_data["status"] in ("completed", "partial")
    assert "planned_agents" in created_data
    assert "final_answer" in created_data
    assert "storage_tier" in created_data

    # 2. List Investigations
    list_resp = client.get("/api/v1/orchestrator")
    assert list_resp.status_code == 200
    invs = list_resp.json()
    assert isinstance(invs, list)
    assert any(inv["investigation_id"] == inv_id for inv in invs)

    # 3. Retrieve Investigation Detail
    detail_resp = client.get(f"/api/v1/orchestrator/{inv_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    assert detail["investigation_id"] == inv_id
    assert detail["query"] == create_payload["query"]
    assert "findings" in detail
    assert "verification_summary" in detail
    assert "plan" in detail
    assert detail["plan"]["workspace"] == "fisherman"
    assert "events" in detail

    # 4. Retrieve Execution Events
    events_resp = client.get(f"/api/v1/orchestrator/{inv_id}/events")
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert isinstance(events, list)
    assert len(events) > 0
    event_types = [e.get("event_type") for e in events]
    assert "investigation_started" in event_types
    assert "plan_created" in event_types
    assert "investigation_completed" in event_types

    # 5. Retrieve Investigation Evidence
    evidence_resp = client.get(f"/api/v1/orchestrator/{inv_id}/evidence")
    assert evidence_resp.status_code == 200
    evidence = evidence_resp.json()
    assert isinstance(evidence, list)


def test_investigations_legacy_routes_backward_compatibility():
    """Verify that existing legacy /investigations endpoints remain 100% operational."""
    resp = client.get("/api/v1/investigations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    stats_resp = client.get("/api/v1/investigations/stats")
    assert stats_resp.status_code == 200
