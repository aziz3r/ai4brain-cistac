"""
AI4BRAIN Pydantic v2 Data Contracts
Compliant with JSON Schema 2020-12 specifications for IEEE CISTAC 1.0.
Strict non-clinical compliance and privacy-preserving non-biometric architecture.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from app.core.clinical_guardrails import contains_clinical_term


# ============================================================================
# 1. COLLABORATION EVENTS
# ============================================================================

class CollabEventModel(BaseModel):
    event_type: Literal[
        "prompt",
        "response_action",
        "feedback_revision",
        "decision",
        "session_metric"
    ]
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[float] = None


# ============================================================================
# 2. ASSESSMENT & TASK SESSIONS (LAYER A)
# ============================================================================

class ItemResult(BaseModel):
    item_id: str
    rt_ms: float = Field(..., ge=0, description="Reaction time on item in milliseconds")
    correct: bool
    condition: Optional[str] = Field(default=None, description="e.g. congruent vs incongruent for Stroop")
    difficulty: float = Field(default=1.0, ge=0.25)


class AssessmentSessionPayload(BaseModel):
    privacy_mode: Literal["non_biometric"] = Field(
        default="non_biometric",
        description="Mandatory IEEE requirement: biometric evaluation is disabled"
    )
    pseudonymous_user_id: str = Field(..., min_length=4)
    consent_id: str = Field(..., min_length=4)
    session_id: str
    timestamp: float
    dimension_id: Literal[
        "working_memory",
        "selective_attention",
        "cognitive_flexibility",
        "processing_speed",
        "inductive_reasoning"
    ]
    task_id: str
    task_difficulty: float = Field(default=1.0, ge=0.25, le=3.0)
    items: List[ItemResult] = Field(default_factory=list)
    raw_score: float = Field(..., ge=0.0, le=100.0)
    mean_rt_ms: float = Field(..., ge=0.0)
    baseline_rt_ms: float = Field(default=500.0, ge=10.0)
    error_rate: float = Field(..., ge=0.0, le=1.0)
    isv: float = Field(default=0.2, ge=0.0, description="Intra-individual coefficient of variation of correct RTs")
    behavior_indicators: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# 3. BRAIN TWIN STATE (LAYER A & C)
# ============================================================================

class DimensionHistoryEntry(BaseModel):
    session_index: int
    timestamp: float
    raw_score: float
    mu_post: float
    sigma_post: float
    kalman_gain: float
    outlier_damped: bool


class BrainTwinDimensionState(BaseModel):
    dimension_id: str
    name: str
    mu: float = Field(default=50.0, ge=0.0, le=100.0)
    sigma: float = Field(default=25.0, gt=0.0)
    ci_95_lower: float = Field(default=1.0, ge=0.0, le=100.0)
    ci_95_upper: float = Field(default=99.0, ge=0.0, le=100.0)
    session_count: int = Field(default=0, ge=0)
    history: List[DimensionHistoryEntry] = Field(default_factory=list, max_length=200)


class ProjectionPoint(BaseModel):
    step_ahead: int
    expected_mu: float = Field(..., ge=0.0, le=100.0)
    uncertainty_sigma: float = Field(..., gt=0.0)
    ci_lower: float = Field(..., ge=0.0, le=100.0)
    ci_upper: float = Field(..., ge=0.0, le=100.0)


class ConsentMetadata(BaseModel):
    consent_id: str
    retention_days: int = Field(default=30, ge=1, le=365)
    consent_given_at: float
    deletion_requested_at: Optional[float] = None
    gdpr_status: Literal["active", "pending_deletion", "deleted"] = "active"


class CollaborationScoreState(BaseModel):
    overall_score: float = Field(default=50.0, ge=0.0, le=100.0)
    total_uncertainty_sigma: float = Field(default=11.32, ge=0.0)
    ci_95_lower: float = Field(default=27.8, ge=0.0)
    ci_95_upper: float = Field(default=72.2, le=100.0)
    components: Dict[str, Any] = Field(default_factory=dict)
    total_events: int = Field(default=0, ge=0)


class BrainTwinState(BaseModel):
    user_id: str
    consent: ConsentMetadata
    dimensions: Dict[str, BrainTwinDimensionState]
    global_uncertainty: float = Field(default=25.0, ge=0.0)
    projection_cone: List[ProjectionPoint] = Field(default_factory=list)
    collaboration_score: CollaborationScoreState = Field(default_factory=CollaborationScoreState)
    last_updated: float


# ============================================================================
# 4. AI COACH RECOMMENDATIONS & XAI (LAYER B)
# ============================================================================

class ExplanationBlock(BaseModel):
    plain_language_reason: str
    evidence: List[str] = Field(default_factory=list, max_length=4)
    uncertainty_note: str
    counterfactual: str
    alternatives: List[str] = Field(default_factory=list)

    @field_validator("plain_language_reason", "uncertainty_note", "counterfactual")
    @classmethod
    def check_non_clinical(cls, v: str) -> str:
        if contains_clinical_term(v):
            raise ValueError(f"Clinical vocabulary detected in explanation: '{v}'")
        return v


class CoachRecommendationPayload(BaseModel):
    recommendation_id: str
    target_dimension: str
    task_id: str
    calibrated_difficulty: float = Field(..., ge=0.25, le=3.0)
    explanation: ExplanationBlock
    motivational_note: str
    clinical_term_check: Literal["passed"] = "passed"
    disclaimer: str = Field(
        default="Non-clinical educational cognitive growth coaching only. Not a medical assessment."
    )

    @field_validator("motivational_note")
    @classmethod
    def check_motivation_non_clinical(cls, v: str) -> str:
        if contains_clinical_term(v):
            raise ValueError(f"Clinical vocabulary detected in motivation: '{v}'")
        return v
