import os
"""
Integration tests for FastAPI endpoints with consent, privacy, and GDPR controls.
"""

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["clinical_guardrail"] == "active_and_strictly_non_clinical"
    assert data["privacy_mode"] == "non_biometric_mandatory"


def test_taxonomy_endpoint():
    res = client.get("/taxonomy")
    assert res.status_code == 200
    data = res.json()
    assert "dimensions" in data
    assert len(data["dimensions"]) == 5
    assert "working_memory" in data["dimensions"]


def test_assessment_without_consent_returns_403():
    unconsented_user = "unconsented_user_99"
    payload = {
        "privacy_mode": "non_biometric",
        "pseudonymous_user_id": unconsented_user,
        "consent_id": "none",
        "session_id": "sess_err",
        "timestamp": time.time(),
        "dimension_id": "working_memory",
        "task_id": "spatial_n_back",
        "task_difficulty": 1.0,
        "items": [],
        "raw_score": 70.0,
        "mean_rt_ms": 500.0,
        "baseline_rt_ms": 500.0,
        "error_rate": 0.2,
        "isv": 0.15
    }
    res = client.post("/assessment", json=payload)
    assert res.status_code == 403
    assert "Consent required" in res.json()["detail"]


def test_consent_and_brain_twin_lifecycle():
    user_id = "test_user_cistac_01"
    
    # 1. Register consent
    res_cst = client.post("/consent", json={
        "user_id": user_id,
        "retention_days": 90,
        "acknowledged_non_clinical": True
    })
    assert res_cst.status_code == 200
    assert res_cst.json()["status"] == "consent_recorded"
    
    # 2. Fetch initial profile
    res_init = client.get(f"/brain-twin/{user_id}")
    assert res_init.status_code == 200
    init_data = res_init.json()
    assert init_data["dimensions"]["working_memory"]["mu"] == 50.0
    assert init_data["dimensions"]["working_memory"]["sigma"] == 25.0
    
    # 3. Submit assessment session
    session_payload = {
        "privacy_mode": "non_biometric",
        "pseudonymous_user_id": user_id,
        "consent_id": "cst_2026_01",
        "session_id": "sess_001",
        "timestamp": time.time(),
        "dimension_id": "working_memory",
        "task_id": "spatial_n_back",
        "task_difficulty": 1.0,
        "items": [
            {"item_id": "i1", "rt_ms": 420.0, "correct": True, "condition": "2-back", "difficulty": 1.0},
            {"item_id": "i2", "rt_ms": 460.0, "correct": True, "condition": "2-back", "difficulty": 1.0}
        ],
        "raw_score": 85.0,
        "mean_rt_ms": 440.0,
        "baseline_rt_ms": 500.0,
        "error_rate": 0.10,
        "isv": 0.15,
        "behavior_indicators": {}
    }
    
    res_assess = client.post("/assessment", json=session_payload)
    assert res_assess.status_code == 200
    assess_res = res_assess.json()
    assert assess_res["updated_state"]["session_count"] == 1
    assert assess_res["updated_state"]["mu"] > 50.0
    assert assess_res["updated_state"]["sigma"] < 25.0
    
    # 4. Check coach recommendation
    res_rec = client.get(f"/coach/recommendation/{user_id}")
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert rec_data["clinical_term_check"] == "passed"
    assert "explanation" in rec_data
    assert len(rec_data["explanation"]["evidence"]) >= 1


def test_export_and_delete_gdpr():
    user_id = "test_user_gdpr"
    client.post("/consent", json={"user_id": user_id, "retention_days": 30, "acknowledged_non_clinical": True})
    
    # Export data
    res_export = client.get(f"/user/{user_id}/export")
    assert res_export.status_code == 200
    export_data = res_export.json()
    assert export_data["user_id"] == user_id
    assert "privacy_notice" in export_data
    
    # Delete data
    res_del = client.delete(f"/user/{user_id}/data")
    assert res_del.status_code == 200
    del_data = res_del.json()
    assert del_data["status"] == "deleted"
    assert "receipt_id" in del_data
    
    # Verify export after deletion leaves empty profile
    res_after = client.get(f"/user/{user_id}/export")
    assert res_after.json()["profile"] is None


def test_purge_expired_users_with_faked_clock():
    user_exp = "user_expiring_soon"
    client.post("/consent", json={"user_id": user_exp, "retention_days": 30, "acknowledged_non_clinical": True})
    
    # Advance faked clock past 30 days (e.g. 31 days ahead)
    future_clock = time.time() + (31 * 86400)
    # Without the admin token the purge endpoint is refused
    assert client.post(f"/admin/purge-expired?simulated_clock={future_clock}").status_code == 403
    assert client.post(f"/admin/purge-expired?simulated_clock={future_clock}",
                       headers={"X-Admin-Token": "wrong"}).status_code == 403

    os.environ["ADMIN_TOKEN"] = "test-admin-token"
    try:
        res_purge = client.post(f"/admin/purge-expired?simulated_clock={future_clock}",
                                headers={"X-Admin-Token": "test-admin-token"})
    finally:
        del os.environ["ADMIN_TOKEN"]
    assert res_purge.status_code == 200
    assert res_purge.json()["purged_accounts"] >= 1


def test_collab_event_submission():
    user_id = "test_user_cistac_02"
    client.post("/consent", json={"user_id": user_id, "retention_days": 90, "acknowledged_non_clinical": True})
    event_payload = {
        "event_type": "prompt",
        "data": {
            "word_count": 25,
            "refs_context": True,
            "has_goal": True,
            "is_reformulation": False
        },
        "timestamp": time.time()
    }
    res = client.post(f"/collab-event/{user_id}", json=event_payload)
    assert res.status_code == 200
    data = res.json()
    assert "overall_score" in data
    assert "components" in data
