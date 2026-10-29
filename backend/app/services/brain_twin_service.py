"""
AI4BRAIN Brain Twin Service Layer
Orchestrates profile management, Bayesian updating, future projections with uncertainty,
and AI collaboration score tracking.
"""

import time
import math
from typing import Dict, Any, List, Optional, Tuple
from app.core.engine import BrainTwinEngine
from app.core.ai_collab import AICollaborationScorer, CollabEvent
from app.core.coach_policy import CoachPolicy
from app.core.coach_prompt import call_coach_llm_or_fallback, generate_fallback_recommendation
from app.models.schemas import (
    AssessmentSessionPayload,
    BrainTwinState,
    BrainTwinDimensionState,
    DimensionHistoryEntry,
    ProjectionPoint,
    ConsentMetadata,
    CollaborationScoreState,
    CoachRecommendationPayload,
    ExplanationBlock
)

COGNITIVE_DIMENSIONS_CONFIG = {
    "working_memory": "Working Memory Capacity",
    "selective_attention": "Selective Attention & Interference Control",
    "cognitive_flexibility": "Cognitive Flexibility & Set-Shifting",
    "processing_speed": "Perceptual Processing Speed",
    "inductive_reasoning": "Inductive & Fluid Reasoning"
}


class BrainTwinService:
    def __init__(self):
        # In-memory storage for rapid development & testing
        self.profiles: Dict[str, BrainTwinState] = {}
        self.event_logs: Dict[str, List[CollabEvent]] = {}
        self.consents: Dict[str, ConsentMetadata] = {}
        self._seed_demo_personas()

    def _seed_demo_personas(self):
        """Pre-seeds the 3 benchmark evaluation personas with 10 real engine sessions."""
        now = time.time()
        personas = [
            ("persona_steady_improver", 0.0, False, 1),
            ("persona_variable_responder", 0.35, False, 2),
            ("persona_fatigue_pattern", 0.1, True, 4)
        ]
        for pid, lapse_prob, is_fatigued, sessions_today in personas:
            self.register_consent(pid, retention_days=90, consent_id=f"cst_{pid}")
            profile = self.get_or_create_profile(pid, consent_id=f"cst_{pid}")

            # Populate 10 sessions across dimensions using real engine updates
            # Per-skill offsets and slopes so each persona has a distinct, realistic profile
            offsets = [8.0, -3.0, 2.0, -9.0, 5.0]
            slopes = [3.2, 2.2, 2.8, 1.4, 3.6]
            for dim_idx, dim_id in enumerate(COGNITIVE_DIMENSIONS_CONFIG.keys()):
                state = profile.dimensions[dim_id]
                for s in range(1, 11):
                    # Base score trajectory
                    score = max(10.0, min(95.0, 50.0 + offsets[dim_idx % 5] + s * slopes[dim_idx % 5]))
                    is_lapse = (lapse_prob > 0) and (s in [4, 8])
                    if is_lapse:
                        score = 5.0  # Aberrant lapse

                    rt = 450 + (s * 40 if is_fatigued else -s * 10)
                    update_res = BrainTwinEngine.update_dimension(
                        prior_mu=state.mu,
                        prior_sigma=state.sigma,
                        raw_score=score,
                        reaction_time_ms=rt,
                        baseline_rt_ms=500,
                        task_difficulty=1.0,
                        session_index=s
                    )
                    state.mu = update_res["mu_post"]
                    state.sigma = update_res["sigma_post"]
                    state.ci_95_lower = update_res["ci_95_lower"]
                    state.ci_95_upper = update_res["ci_95_upper"]
                    state.session_count = s
                    state.history.append(
                        DimensionHistoryEntry(
                            session_index=s,
                            timestamp=now - (11 - s) * 3600,
                            raw_score=score,
                            mu_post=update_res["mu_post"],
                            sigma_post=update_res["sigma_post"],
                            kalman_gain=update_res["kalman_gain"],
                            outlier_damped=update_res["outlier_damped"]
                        )
                    )

            # Recompute global uncertainty & projection
            all_sigmas = [d.sigma for d in profile.dimensions.values()]
            profile.global_uncertainty = round(sum(all_sigmas) / len(all_sigmas), 2)
            profile.projection_cone = self._generate_projection_cone(profile.dimensions["working_memory"].mu, profile.dimensions["working_memory"].sigma)

            # Seed rich interaction events so collaboration score is unlocked
            collab_events = [
                CollabEvent("prompt", {"word_count": 22, "refs_context": True, "has_goal": True}),
                CollabEvent("prompt", {"word_count": 28, "refs_context": True, "has_goal": True, "is_reformulation": True, "resolved": True}),
                CollabEvent("response_action", {"action": "ask_why", "dwell_time_s": 5.2, "explanation_opened": True}),
                CollabEvent("response_action", {"action": "challenge", "has_reason": True, "dwell_time_s": 6.1}),
                CollabEvent("response_action", {"action": "accept", "dwell_time_s": 4.8, "explanation_opened": True}),
                CollabEvent("feedback_revision", {"revised": True, "exchanges_count": 3, "delta_y": 6.0}),
                CollabEvent("feedback_revision", {"revised": True, "exchanges_count": 4, "delta_y": 4.5}),
                CollabEvent("decision", {"consulted_coach": True, "user_decided": True, "struggling": True}),
                CollabEvent("decision", {"consulted_coach": False, "user_decided": True, "struggling": False}),
                CollabEvent("session_metric", {
                    "duration_min": 25.0,
                    "fatigued": is_fatigued,
                    "took_rest": True,
                    "messages_per_min": 1.1,
                    "sessions_today": sessions_today,
                    "ethical_flags": 0
                })
            ]
            self.event_logs[pid] = collab_events
            sc = AICollaborationScorer.calculate_collaboration_score(collab_events)
            profile.collaboration_score = CollaborationScoreState(
                overall_score=sc["overall_score"],
                total_uncertainty_sigma=sc["total_uncertainty_sigma"],
                ci_95_lower=sc["ci_95_lower"],
                ci_95_upper=sc["ci_95_upper"],
                components=sc["components"],
                total_events=sc["total_events"]
            )

    def register_consent(
        self, user_id: str, retention_days: int = 90, consent_id: Optional[str] = None
    ) -> ConsentMetadata:
        """Records explicit non-clinical GDPR consent with customizable retention."""
        now = time.time()
        c_id = consent_id or f"cst_{int(now)}_{user_id[:6]}"
        meta = ConsentMetadata(
            consent_id=c_id,
            retention_days=retention_days,
            consent_given_at=now,
            gdpr_status="active"
        )
        self.consents[user_id] = meta
        if user_id in self.profiles:
            self.profiles[user_id].consent = meta
        return meta

    def has_valid_consent(self, user_id: str) -> bool:
        """Returns True if the user has an active, unexpired consent."""
        if user_id not in self.consents:
            return False
        c = self.consents[user_id]
        if c.gdpr_status != "active":
            return False
        # Expiration check
        expiry_seconds = c.retention_days * 86400
        if time.time() - c.consent_given_at > expiry_seconds:
            return False
        return True

    def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """Exports all data collected for the pseudonymous user as clean JSON."""
        profile = self.get_or_create_profile(user_id) if user_id in self.profiles else None
        events = [
            {"event_type": e.event_type, "data": e.data, "timestamp": e.timestamp}
            for e in self.event_logs.get(user_id, [])
        ]
        return {
            "user_id": user_id,
            "export_timestamp": time.time(),
            "consent": self.consents.get(user_id).model_dump() if user_id in self.consents else None,
            "profile": profile.model_dump() if profile else None,
            "interaction_events": events,
            "privacy_notice": "Non-biometric mode: active. No voice/camera/health biometric data is stored."
        }

    def delete_user_data(self, user_id: str) -> Dict[str, Any]:
        """Hard deletes all stored profile, history, and interaction records."""
        now = time.time()
        deleted_records = 0
        if user_id in self.profiles:
            del self.profiles[user_id]
            deleted_records += 1
        if user_id in self.event_logs:
            del self.event_logs[user_id]
            deleted_records += 1
        if user_id in self.consents:
            del self.consents[user_id]
            deleted_records += 1

        return {
            "status": "deleted",
            "receipt_id": f"del_rcpt_{int(now)}_{user_id[:6]}",
            "timestamp": now,
            "user_id": user_id,
            "records_removed": deleted_records
        }

    def purge_expired_users(self, simulated_clock: Optional[float] = None) -> int:
        """Purges any user accounts whose retention period has passed."""
        now = simulated_clock if simulated_clock is not None else time.time()
        expired_users = []
        for uid, c in list(self.consents.items()):
            expiry = c.consent_given_at + (c.retention_days * 86400)
            if now > expiry:
                expired_users.append(uid)

        for uid in expired_users:
            self.delete_user_data(uid)
        return len(expired_users)

    def get_or_create_profile(self, user_id: str, consent_id: str = "cst_default") -> BrainTwinState:
        if user_id in self.profiles:
            return self.profiles[user_id]

        now = time.time()
        initial_dimensions = {}
        for dim_id, dim_name in COGNITIVE_DIMENSIONS_CONFIG.items():
            initial_dimensions[dim_id] = BrainTwinDimensionState(
                dimension_id=dim_id,
                name=dim_name,
                mu=BrainTwinEngine.DEFAULT_PRIOR_MU,
                sigma=BrainTwinEngine.DEFAULT_PRIOR_SIGMA,
                ci_95_lower=max(0.0, BrainTwinEngine.DEFAULT_PRIOR_MU - 1.96 * BrainTwinEngine.DEFAULT_PRIOR_SIGMA),
                ci_95_upper=min(100.0, BrainTwinEngine.DEFAULT_PRIOR_MU + 1.96 * BrainTwinEngine.DEFAULT_PRIOR_SIGMA),
                session_count=0,
                history=[]
            )

        collab_initial = AICollaborationScorer.calculate_collaboration_score([])

        profile = BrainTwinState(
            user_id=user_id,
            consent=ConsentMetadata(
                consent_id=consent_id,
                retention_days=30,
                consent_given_at=now,
                gdpr_status="active"
            ),
            dimensions=initial_dimensions,
            global_uncertainty=BrainTwinEngine.DEFAULT_PRIOR_SIGMA,
            projection_cone=self._generate_projection_cone(50.0, BrainTwinEngine.DEFAULT_PRIOR_SIGMA),
            collaboration_score=CollaborationScoreState(
                overall_score=collab_initial["overall_score"],
                total_uncertainty_sigma=collab_initial["total_uncertainty_sigma"],
                ci_95_lower=collab_initial["ci_95_lower"],
                ci_95_upper=collab_initial["ci_95_upper"],
                components=collab_initial["components"],
                total_events=0
            ),
            last_updated=now
        )
        self.profiles[user_id] = profile
        self.event_logs[user_id] = []
        return profile

    def record_assessment(self, payload: AssessmentSessionPayload) -> Dict[str, Any]:
        """Processes an incoming assessment session, runs Kalman update and updates state."""
        profile = self.get_or_create_profile(payload.pseudonymous_user_id, payload.consent_id)
        dim_id = payload.dimension_id
        dim_state = profile.dimensions[dim_id]

        new_session_idx = dim_state.session_count + 1

        # Run Kalman update
        update_res = BrainTwinEngine.update_dimension(
            prior_mu=dim_state.mu,
            prior_sigma=dim_state.sigma,
            raw_score=payload.raw_score,
            reaction_time_ms=payload.mean_rt_ms,
            baseline_rt_ms=payload.baseline_rt_ms,
            task_difficulty=payload.task_difficulty,
            session_index=new_session_idx
        )

        # Update dimension state
        dim_state.mu = update_res["mu_post"]
        dim_state.sigma = update_res["sigma_post"]
        dim_state.ci_95_lower = update_res["ci_95_lower"]
        dim_state.ci_95_upper = update_res["ci_95_upper"]
        dim_state.session_count = new_session_idx

        # Append to history (capped at 200)
        history_entry = DimensionHistoryEntry(
            session_index=new_session_idx,
            timestamp=payload.timestamp,
            raw_score=payload.raw_score,
            mu_post=update_res["mu_post"],
            sigma_post=update_res["sigma_post"],
            kalman_gain=update_res["kalman_gain"],
            outlier_damped=update_res["outlier_damped"]
        )
        dim_state.history.append(history_entry)
        if len(dim_state.history) > 200:
            dim_state.history.pop(0)

        # Recompute global uncertainty as mean of dimensional sigmas
        all_sigmas = [d.sigma for d in profile.dimensions.values()]
        profile.global_uncertainty = round(sum(all_sigmas) / len(all_sigmas), 2)
        profile.last_updated = time.time()

        # Update projection cone using the updated dimension
        profile.projection_cone = self._generate_projection_cone(dim_state.mu, dim_state.sigma)

        return {
            "dimension_id": dim_id,
            "updated_state": dim_state,
            "kalman_diagnostics": update_res,
            "global_uncertainty": profile.global_uncertainty
        }

    def record_collab_event(self, user_id: str, event: CollabEvent) -> Dict[str, Any]:
        """Logs interaction event and updates the collaboration score dynamically."""
        profile = self.get_or_create_profile(user_id)
        if user_id not in self.event_logs:
            self.event_logs[user_id] = []
        self.event_logs[user_id].append(event)

        score_res = AICollaborationScorer.calculate_collaboration_score(self.event_logs[user_id])
        profile.collaboration_score = CollaborationScoreState(
            overall_score=score_res["overall_score"],
            total_uncertainty_sigma=score_res["total_uncertainty_sigma"],
            ci_95_lower=score_res["ci_95_lower"],
            ci_95_upper=score_res["ci_95_upper"],
            components=score_res["components"],
            total_events=score_res["total_events"]
        )
        return score_res

    def generate_coach_recommendation(
        self,
        user_id: str,
        last_dimension_id: Optional[str] = None,
        user_action: str = "recommend",
        user_message: str = "",
        fatigue_flag: bool = False,
        sessions_today: int = 1,
        language: str = "en"
    ) -> Tuple[CoachRecommendationPayload, bool]:
        """
        Generates a faithful, explainable recommendation using the deterministic
        CoachPolicy DecisionTrace and Nova LLM / verified fallback generator.
        Supports French and English.
        Returns: (recommendation, offline_mode)
        """
        profile = self.get_or_create_profile(user_id)
        trace = CoachPolicy.recommend(profile.dimensions, last_dimension_id=last_dimension_id)
        return call_coach_llm_or_fallback(
            trace=trace,
            user_action=user_action,
            fatigue_flag=fatigue_flag,
            sessions_today=sessions_today,
            user_message=user_message,
            language=language
        )

    def _generate_projection_cone(
        self, current_mu: float, current_sigma: float, steps: int = 5
    ) -> List[ProjectionPoint]:
        """
        Projects future cognitive growth under continued training,
        ensuring uncertainty strictly widens with time into the future.
        """
        points = []
        for step in range(1, steps + 1):
            # Diminishing returns logarithmic growth curve
            gain = 4.0 * math.log(1.0 + step * 0.5)
            proj_mu = min(100.0, current_mu + gain)

            # Future uncertainty widens as sqrt(step) (aleatoric & epistemic drift)
            widened_sigma = round(current_sigma * math.sqrt(1.0 + 0.25 * step), 2)
            ci_lower = max(0.0, round(proj_mu - 1.96 * widened_sigma, 2))
            ci_upper = min(100.0, round(proj_mu + 1.96 * widened_sigma, 2))

            points.append(
                ProjectionPoint(
                    step_ahead=step,
                    expected_mu=round(proj_mu, 2),
                    uncertainty_sigma=widened_sigma,
                    ci_lower=ci_lower,
                    ci_upper=ci_upper
                )
            )
        return points
