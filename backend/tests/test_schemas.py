"""
Unit tests for Pydantic v2 data contracts and guardrails.
"""

import time
import unittest
from app.models.schemas import (
    AssessmentSessionPayload,
    BrainTwinState,
    BrainTwinDimensionState,
    ConsentMetadata,
    CoachRecommendationPayload,
    ExplanationBlock
)


class TestDataContracts(unittest.TestCase):
    def test_assessment_payload_validation(self):
        payload = AssessmentSessionPayload(
            privacy_mode="non_biometric",
            pseudonymous_user_id="user_8f4b",
            consent_id="cst_2026_01",
            session_id="sess_101",
            timestamp=time.time(),
            dimension_id="working_memory",
            task_id="n_back_spatial",
            task_difficulty=1.2,
            raw_score=82.5,
            mean_rt_ms=420.0,
            baseline_rt_ms=500.0,
            error_rate=0.12,
            isv=0.18
        )
        self.assertEqual(payload.dimension_id, "working_memory")
        self.assertEqual(payload.privacy_mode, "non_biometric")

    def test_coach_recommendation_non_clinical_check(self):
        # Valid non-clinical recommendation
        rec = CoachRecommendationPayload(
            recommendation_id="rec_001",
            target_dimension="selective_attention",
            task_id="stroop_color",
            calibrated_difficulty=1.1,
            explanation=ExplanationBlock(
                plain_language_reason="This exercise challenges stimulus filtering while maintaining fast reaction pace.",
                evidence=["Mean accuracy is stable at 78%", "Incongruent trials showed 45ms latency gap"],
                uncertainty_note="Estimate confidence is moderate (sigma=6.2) after 3 sessions.",
                counterfactual="If accuracy was below 60%, a slower paced task would be prioritized.",
                alternatives=["flanker_arrows", "task_switch_cued"]
            ),
            motivational_note="Great consistency across your last set! Let's push processing fluency.",
            clinical_term_check="passed"
        )
        self.assertEqual(rec.clinical_term_check, "passed")

    def test_coach_recommendation_rejects_clinical_terms(self):
        with self.assertRaises(ValueError):
            CoachRecommendationPayload(
                recommendation_id="rec_002",
                target_dimension="selective_attention",
                task_id="stroop_color",
                calibrated_difficulty=1.0,
                explanation=ExplanationBlock(
                    plain_language_reason="This task helps with your ADHD deficit and concentration impairment.",
                    evidence=[],
                    uncertainty_note="High confidence",
                    counterfactual="None",
                    alternatives=[]
                ),
                motivational_note="You can improve your disorder.",
                clinical_term_check="passed"
            )


if __name__ == "__main__":
    unittest.main()
