import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_verification_summary_endpoint():
    """Verify that /evidence-verification/summary returns aggregated audit metrics."""
    resp = client.get("/api/v1/evidence-verification/summary")
    assert resp.status_code == 200
    data = resp.json()

    assert "claims_assessed" in data
    assert "supported_claims" in data
    assert "unverified_claims" in data
    assert "material_conflicts" in data
    assert "evidence_records_examined" in data
    assert "status_distribution" in data
    assert isinstance(data["status_distribution"], list)
    assert "checks_by_category" in data
    assert isinstance(data["checks_by_category"], list)


def test_verification_claims_endpoint():
    """Verify listing and retrieving individual claims."""
    resp = client.get("/api/v1/evidence-verification/claims")
    assert resp.status_code == 200
    data = resp.json()
    assert "claims" in data
    assert "total" in data
    assert isinstance(data["claims"], list)

    if len(data["claims"]) > 0:
        first_claim = data["claims"][0]
        assert "claim_id" in first_claim
        assert "original_text" in first_claim
        assert "status" in first_claim
        assert "reason" in first_claim

        # Test single claim detail endpoint
        c_id = first_claim["claim_id"]
        detail_resp = client.get(f"/api/v1/evidence-verification/claims/{c_id}")
        assert detail_resp.status_code == 200
        claim_detail = detail_resp.json()
        assert claim_detail["claim_id"] == c_id

    # Test unknown claim 404
    missing_resp = client.get("/api/v1/evidence-verification/claims/nonexistent_claim_id_xyz")
    assert missing_resp.status_code == 404


def test_verification_evidence_endpoint():
    """Verify listing and retrieving evidence items."""
    resp = client.get("/api/v1/evidence-verification/evidence")
    assert resp.status_code == 200
    data = resp.json()
    assert "evidence" in data
    assert "total" in data
    assert isinstance(data["evidence"], list)

    if len(data["evidence"]) > 0:
        ev = data["evidence"][0]
        ev_id = ev.get("evidence_id") or ev.get("id")
        assert ev_id is not None
        assert "source_name" in ev

        # Test single evidence detail endpoint
        ev_detail_resp = client.get(f"/api/v1/evidence-verification/evidence/{ev_id}")
        assert ev_detail_resp.status_code == 200

    missing_ev = client.get("/api/v1/evidence-verification/evidence/nonexistent_ev_999")
    assert missing_ev.status_code == 404


def test_verification_findings_endpoint():
    """Verify retrieving findings and material source conflicts."""
    resp = client.get("/api/v1/evidence-verification/findings")
    assert resp.status_code == 200
    data = resp.json()
    assert "findings" in data
    assert "total" in data
    assert isinstance(data["findings"], list)


def test_verification_methodology_endpoint():
    """Verify methodology endpoint provides safe check definitions and limitations without secrets."""
    resp = client.get("/api/v1/evidence-verification/methodology")
    assert resp.status_code == 200
    data = resp.json()
    assert "version" in data
    assert "categories" in data
    assert "implemented_checks" in data
    assert isinstance(data["implemented_checks"], list)
    assert "limitations" in data
    assert isinstance(data["limitations"], list)

    # Ensure no secrets or credentials leaked
    body_str = resp.text.lower()
    for sensitive in ["password", "secret_key", "bearer ", "token", "private_key"]:
        assert sensitive not in body_str


def test_initiate_verification_run_endpoint():
    """Verify submitting a verification run and inspecting the resulting run."""
    run_resp = client.post("/api/v1/evidence-verification/runs", json={
        "investigation_id": "test_api_inv_001",
        "force_recheck": True
    })
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert "run_id" in run_data
    assert "overall_status" in run_data
    assert "overall_scientific_state" in run_data
    assert "total_claims" in run_data
    assert "checks_completed" in run_data
    assert "claims" in run_data

    run_id = run_data["run_id"]

    # Retrieve individual run
    get_run_resp = client.get(f"/api/v1/evidence-verification/runs/{run_id}")
    assert get_run_resp.status_code == 200
    fetched_run = get_run_resp.json()
    assert fetched_run["run_id"] == run_id

    # Test unknown run 404
    missing_run = client.get("/api/v1/evidence-verification/runs/vrun_nonexistent_000")
    assert missing_run.status_code == 404


def test_verification_history_endpoint():
    """Verify run history preservation."""
    resp = client.get("/api/v1/evidence-verification/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "history" in data
    assert "total" in data
    assert isinstance(data["history"], list)
    assert len(data["history"]) >= 1
