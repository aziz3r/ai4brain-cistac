"""
AI4BRAIN FastAPI Application
Main entry point compliant with IEEE CISTAC 1.0 guidelines.
Features:
- Strict Non-Clinical Compliance Guardrails
- Kalman-type Brain Twin State Estimation with Uncertainty Floors
- Objective AI Collaboration Score (0-100)
- Explainable AI Coach Recommendations
"""

import os
import hmac
import json
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import (
    AssessmentSessionPayload,
    BrainTwinState,
    CoachRecommendationPayload,
    CollabEventModel,
    ConsentMetadata
)
from pydantic import BaseModel, Field
from app.services.brain_twin_service import BrainTwinService
from app.core.ai_collab import CollabEvent
from app.core.clinical_guardrails import contains_clinical_term

app = FastAPI(
    title="AI4BRAIN API - Cognitive Growth Agent",
    description="Adaptive, explainable, uncertainty-aware non-clinical cognitive growth engine.",
    version="1.0.0"
)

# Enable CORS for Frontend Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton service instance
service = BrainTwinService()


class ConsentRequest(BaseModel):
    user_id: str
    retention_days: int = Field(default=90, ge=30, le=365)
    acknowledged_non_clinical: bool = True


@app.post("/consent")
def submit_consent(payload: ConsentRequest) -> Dict[str, Any]:
    """Registers user consent and retention duration before recording data."""
    if not payload.acknowledged_non_clinical:
        raise HTTPException(status_code=400, detail="Must acknowledge non-clinical learning tool notice.")
    meta = service.register_consent(payload.user_id, payload.retention_days)
    return {
        "status": "consent_recorded",
        "consent": meta.model_dump(),
        "non_biometric_mode": "always_on"
    }


@app.get("/user/{user_id}/export")
def export_user_data(user_id: str) -> Dict[str, Any]:
    """GDPR Data Portability: Downloads all user logs and profile as JSON."""
    return service.export_user_data(user_id)


@app.delete("/user/{user_id}/data")
def delete_user_data(user_id: str) -> Dict[str, Any]:
    """GDPR Right to Erasure: Hard deletes all profile and interaction events."""
    return service.delete_user_data(user_id)


@app.post("/admin/purge-expired")
def purge_expired(
    simulated_clock: Optional[float] = None,
    x_admin_token: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Purges user data whose retention window has lapsed. Requires the ADMIN_TOKEN secret."""
    expected = os.environ.get("ADMIN_TOKEN", "")
    if not expected or not x_admin_token or not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(status_code=403, detail="Admin token required")
    count = service.purge_expired_users(simulated_clock)
    return {"status": "purged", "purged_accounts": count}


@app.get("/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "competition": "IEEE CISTAC 1.0 - AI4BRAIN",
        "clinical_guardrail": "active_and_strictly_non_clinical",
        "privacy_mode": "non_biometric_mandatory"
    }


@app.get("/taxonomy")
def get_taxonomy() -> Dict[str, Any]:
    """Returns the 5 validated non-clinical cognitive dimensions."""
    tax_path = os.path.join(os.path.dirname(__file__), "core", "taxonomy.json")
    with open(tax_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/brain-twin/{user_id}", response_model=BrainTwinState)
def get_brain_twin(user_id: str):
    """Retrieves current dynamic Brain Twin profile with uncertainty intervals."""
    return service.get_or_create_profile(user_id)


@app.post("/assessment")
def submit_assessment(payload: AssessmentSessionPayload) -> Dict[str, Any]:
    """
    Submits a completed cognitive mini-task session.
    Enforces mandatory consent check (returns 403 without active consent).
    Triggers Bayesian Kalman update and propagates uncertainty.
    """
    if not service.has_valid_consent(payload.pseudonymous_user_id):
        raise HTTPException(
            status_code=403,
            detail="Consent required: An active consent record is required before recording assessment data."
        )
    return service.record_assessment(payload)


@app.post("/collab-event/{user_id}")
def record_collab_event(user_id: str, payload: CollabEventModel) -> Dict[str, Any]:
    """
    Records human-AI collaboration interaction event (prompt, response action, feedback, etc.)
    and updates the 0-100 AI Collaboration Score with Bayesian shrinkage.
    """
    event = CollabEvent(
        event_type=payload.event_type,
        data=payload.data,
        timestamp=payload.timestamp
    )
    return service.record_collab_event(user_id, event)


@app.get("/coach/recommendation/{user_id}")
def get_coach_recommendation(
    user_id: str,
    user_action: str = "recommend",
    user_message: str = "",
    fatigue_flag: bool = False,
    sessions_today: int = 1,
    last_dimension_id: Optional[str] = None,
    language: str = "en"
):
    """
    Generates explainable, motivation-rich recommendations based on
    profile uncertainty and current capacities, filtered by anti-clinical guardrails.
    Supports language=fr|en.
    """
    rec, is_offline = service.generate_coach_recommendation(
        user_id=user_id,
        last_dimension_id=last_dimension_id,
        user_action=user_action,
        user_message=user_message,
        fatigue_flag=fatigue_flag,
        sessions_today=sessions_today,
        language=language
    )
    if contains_clinical_term(rec.explanation.plain_language_reason) or contains_clinical_term(rec.motivational_note):
        raise HTTPException(
            status_code=500,
            detail="Clinical vocabulary detected in generated response. Blocked by guardrail."
        )

    res = rec.model_dump()
    res["is_offline_mode"] = is_offline
    return res
