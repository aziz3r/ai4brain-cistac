"""
Unit tests for the AI4BRAIN Kalman Brain Twin Engine (standard unittest).
"""

import unittest
from app.core.engine import BrainTwinEngine


class TestBrainTwinEngine(unittest.TestCase):
    def test_initial_session_uncertainty_reduction(self):
        mu_0, sigma_0 = 50.0, 25.0
        res = BrainTwinEngine.update_dimension(
            prior_mu=mu_0,
            prior_sigma=sigma_0,
            raw_score=75.0,
            reaction_time_ms=450,
            baseline_rt_ms=500,
            task_difficulty=1.0,
            session_index=1
        )
        self.assertGreater(res["mu_post"], mu_0)
        self.assertLess(res["sigma_post"], sigma_0)
        self.assertLessEqual(res["ci_95_lower"], res["mu_post"])
        self.assertLessEqual(res["mu_post"], res["ci_95_upper"])
        self.assertFalse(res["outlier_damped"])

    def test_convergence_and_uncertainty_floor(self):
        mu, sigma = 50.0, 25.0
        sigmas = [sigma]
        for s in range(1, 9):
            res = BrainTwinEngine.update_dimension(
                prior_mu=mu,
                prior_sigma=sigma,
                raw_score=70.0,
                reaction_time_ms=480,
                baseline_rt_ms=500,
                task_difficulty=1.0,
                session_index=s
            )
            mu, sigma = res["mu_post"], res["sigma_post"]
            sigmas.append(sigma)
            
        self.assertLess(sigmas[-1], sigmas[0])
        self.assertGreater(sigmas[-1], 3.0)
        self.assertGreater(res["kalman_gain"], 0.1)

    def test_outlier_damping(self):
        trained_mu, trained_sigma = 75.0, 4.5
        res = BrainTwinEngine.update_dimension(
            prior_mu=trained_mu,
            prior_sigma=trained_sigma,
            raw_score=0.0,
            reaction_time_ms=1200,
            baseline_rt_ms=500,
            task_difficulty=1.0,
            session_index=9
        )
        self.assertTrue(res["outlier_damped"])
        self.assertLess(res["kalman_gain"], 0.1)
        self.assertGreater(res["mu_post"], 68.0)


if __name__ == "__main__":
    unittest.main()
