"""
Unit tests for AI Collaboration Scorer & Clinical Vocabulary Guardrails.
"""

import unittest
from app.core.ai_collab import AICollaborationScorer, CollabEvent
from app.core.clinical_guardrails import contains_clinical_term, find_clinical_terms


class TestClinicalGuardrails(unittest.TestCase):
    def test_forbidden_terms_detected(self):
        text_bad = "The user exhibits signs of ADHD and mild depression during N-Back."
        self.assertTrue(contains_clinical_term(text_bad))
        terms = find_clinical_terms(text_bad)
        self.assertIn("adhd", [t.lower() for t in terms])
        self.assertIn("depression", [t.lower() for t in terms])

    def test_clean_non_clinical_text(self):
        text_clean = "Working memory capacity updated. Speed increased by 15% with lower reaction time."
        self.assertFalse(contains_clinical_term(text_clean))
        self.assertEqual(len(find_clinical_terms(text_clean)), 0)


class TestAICollaborationScorer(unittest.TestCase):
    def test_empty_log_neutral_honesty(self):
        res = AICollaborationScorer.calculate_collaboration_score([])
        # An empty log has 0 events, should shrink exactly to 50
        self.assertEqual(res["overall_score"], 50.0)
        self.assertGreater(res["total_uncertainty_sigma"], 10.0)
        self.assertEqual(res["total_events"], 0)

    def test_engaged_user_events(self):
        events = [
            # High-quality prompt
            CollabEvent("prompt", {"word_count": 25, "refs_context": True, "has_goal": True, "is_reformulation": True, "resolved": True}),
            CollabEvent("prompt", {"word_count": 30, "refs_context": True, "has_goal": True}),
            # Critical verification
            CollabEvent("response_action", {"action": "ask_why", "dwell_time_s": 5.0, "explanation_opened": True}),
            CollabEvent("response_action", {"action": "challenge", "has_reason": True, "dwell_time_s": 6.0}),
            # Iteration
            CollabEvent("feedback_revision", {"revised": True, "exchanges_count": 3, "delta_y": 8.0}),
            CollabEvent("feedback_revision", {"revised": True, "exchanges_count": 4, "delta_y": 5.0}),
            # Autonomy
            CollabEvent("decision", {"consulted_coach": True, "user_decided": True, "struggling": True}),
            CollabEvent("decision", {"consulted_coach": False, "user_decided": True, "struggling": False}),
            # Responsible use
            CollabEvent("session_metric", {"duration_min": 25.0, "fatigued": True, "took_rest": True, "messages_per_min": 0.8, "sessions_today": 2, "ethical_flags": 0})
        ]
        res = AICollaborationScorer.calculate_collaboration_score(events)
        self.assertGreater(res["overall_score"], 55.0)
        self.assertLess(res["total_uncertainty_sigma"], 11.0)


if __name__ == "__main__":
    unittest.main()
