"""
Language check test suite:
Runs the coach generator on 200 randomized simulated decision traces in both languages
(EN and FR) and asserts zero clinical terms and zero unauthorized numbers.
Also asserts that all French banned clinical terms from contracts/i18n_copy.json
are strictly intercepted by clinical_guardrails.py.
"""

import re
import random
import unittest
from app.core.coach_policy import DecisionTrace
from app.core.coach_prompt import generate_fallback_recommendation
from app.core.clinical_guardrails import contains_clinical_term, find_clinical_terms


FRENCH_BANNED_TERMS = [
    "tdah", "trouble", "troubles", "dépression", "dyslexie", "autisme",
    "pathologie", "pathologique", "diagnostic", "syndrome", "déficit",
    "thérapie", "traitement", "clinique", "patient", "symptôme",
    "anxiété généralisée", "handicap"
]


class TestCoachLanguageCompliance(unittest.TestCase):
    def test_french_banned_terms_are_detected(self):
        """Verify that every single term from i18n_copy.json guardrails_fr_banned is caught."""
        for term in FRENCH_BANNED_TERMS:
            text = f"Le joueur présente un {term} d'apprentissage."
            self.assertTrue(
                contains_clinical_term(text),
                f"Banned French term '{term}' was NOT detected by guardrails."
            )

    def test_200_simulated_traces_in_both_languages(self):
        """Run 200 traces in both English and French with zero violations and no unauthorized numbers."""
        random.seed(42)
        dimensions = [
            ("working_memory", "spatial_n_back", "Grid Memory"),
            ("selective_attention", "flanker_arrows", "Arrow Focus"),
            ("cognitive_flexibility", "task_switching_cued", "Rule Switch"),
            ("processing_speed", "speed_choice_rt", "Quick Reaction"),
            ("inductive_reasoning", "matrix_reasoning", "Pattern Puzzle")
        ]
        user_actions = ["recommend", "ask_why", "challenge"]

        for lang in ["en", "fr"]:
            for i in range(200):
                dim_id, task_id, task_name = random.choice(dimensions)
                mu = round(random.uniform(30.0, 95.0), 1)
                sigma = round(random.uniform(3.5, 22.0), 1)
                diff = random.choice([0.5, 0.75, 1.0, 1.5, 2.0])
                action = random.choice(user_actions)
                fatigued = random.random() < 0.2
                sessions_today = random.randint(1, 5)

                trace = DecisionTrace(
                    target_dimension=dim_id,
                    dimension_name=dim_id.replace("_", " ").title(),
                    task_id=task_id,
                    task_name=task_name,
                    calibrated_difficulty=diff,
                    current_mu=mu,
                    current_sigma=sigma,
                    ci_95_lower=max(0.0, round(mu - 1.96 * sigma, 1)),
                    ci_95_upper=min(100.0, round(mu + 1.96 * sigma, 1)),
                    uncertainty_tier="high" if sigma > 12 else "moderate" if sigma >= 6 else "refined",
                    room_to_grow=round((100.0 - mu) / 100.0, 2),
                    recency_weight=round(random.uniform(0.1, 1.0), 2),
                    computed_priority=round(random.uniform(0.3, 0.9), 2),
                    all_priorities={dim_id: 0.8},
                    alternatives=[{"dimension_id": "working_memory", "task_id": "spatial_n_back", "name": "Grid Memory"}],
                    timestamp=1700000000.0 + i
                )

                rec = generate_fallback_recommendation(
                    trace=trace,
                    user_action=action,
                    fatigue_flag=fatigued,
                    sessions_today=sessions_today,
                    offline_mode=True,
                    language=lang
                )

                # Assert zero clinical or diagnostic terms in any output field
                self.assertFalse(
                    contains_clinical_term(rec.explanation.plain_language_reason),
                    f"[{lang}] Clinical term in reason (iter {i}): {find_clinical_terms(rec.explanation.plain_language_reason)}"
                )
                self.assertFalse(
                    contains_clinical_term(rec.motivational_note),
                    f"[{lang}] Clinical term in motivation (iter {i}): {find_clinical_terms(rec.motivational_note)}"
                )
                self.assertFalse(
                    contains_clinical_term(rec.explanation.uncertainty_note),
                    f"[{lang}] Clinical term in uncertainty (iter {i}): {find_clinical_terms(rec.explanation.uncertainty_note)}"
                )
                if rec.explanation.counterfactual:
                    self.assertFalse(
                        contains_clinical_term(rec.explanation.counterfactual),
                        f"[{lang}] Clinical term in counterfactual (iter {i}): {find_clinical_terms(rec.explanation.counterfactual)}"
                    )

                # Verify no unauthorized numbers in plain_language_reason
                allowed_numbers = {
                    str(int(round(trace.current_mu))),
                    str(int(round(1.96 * trace.current_sigma))),
                    str(trace.calibrated_difficulty),
                    "1", "2", "3", "4", "5"
                }
                found_digits = re.findall(r"\b\d+(?:\.\d+)?\b", rec.explanation.plain_language_reason)
                for num in found_digits:
                    self.assertIn(
                        num,
                        allowed_numbers,
                        f"[{lang}] Unauthorized number '{num}' found in reason_text (iter {i})"
                    )
