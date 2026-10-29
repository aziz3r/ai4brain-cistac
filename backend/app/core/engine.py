"""
AI4BRAIN Brain Twin State Estimation Engine
Compliant with IEEE CISTAC 1.0 specifications.
Kalman-type Gaussian Bayesian cognitive capacity tracking with process drift,
difficulty scaling, speed-accuracy weighting, and outlier damping.
"""

import math
from typing import Dict, Any, Tuple


class BrainTwinEngine:
    """
    Probabilistic state estimator for cognitive capacities.
    Maintains prior state theta ~ N(mu, sigma^2) with non-zero uncertainty floor.
    """
    
    DEFAULT_DRIFT_Q: float = 2.5   # Process noise: prevents sigma from reaching zero
    DEFAULT_PRIOR_MU: float = 50.0 # Neutral initial capacity [0, 100]
    DEFAULT_PRIOR_SIGMA: float = 25.0 # High initial epistemic uncertainty
    OUTLIER_THRESHOLD: float = 3.0 # Z-score threshold for innovation damping

    @classmethod
    def update_dimension(
        cls,
        prior_mu: float,
        prior_sigma: float,
        raw_score: float,
        reaction_time_ms: float,
        baseline_rt_ms: float,
        task_difficulty: float = 1.0,
        session_index: int = 1,
        drift_q: float = DEFAULT_DRIFT_Q
    ) -> Dict[str, Any]:
        """
        Executes a 1D Kalman-type cognitive update with innovation damping.

        Parameters:
            prior_mu: Prior estimated capacity in [0, 100].
            prior_sigma: Prior uncertainty standard deviation.
            raw_score: Observed accuracy/raw percentage score in [0, 100].
            reaction_time_ms: Measured mean reaction time on correct trials in ms.
            baseline_rt_ms: Baseline reaction time reference for the task in ms.
            task_difficulty: Relative task difficulty multiplier (d >= 0.25).
            session_index: Sequential session counter (1, 2, ...).
            drift_q: Process variance ensuring perpetual uncertainty floor.

        Returns:
            Dictionary containing updated posterior statistics and explainability flags.
        """
        # 1. State variance propagation with drift
        p_prior = (prior_sigma ** 2) + drift_q

        # 2. Speed modifier: reward speed only when accuracy is high (penalize fast guessing)
        baseline = max(baseline_rt_ms, 1.0)
        speed_delta_ratio = (baseline - reaction_time_ms) / baseline
        accuracy_weight = max(0.0, min(1.0, raw_score / 100.0))
        speed_mod = 1.0 + max(-0.25, min(0.35, speed_delta_ratio * accuracy_weight))

        # 3. Observation value y with logarithmic difficulty bonus
        difficulty_clamped = max(0.25, task_difficulty)
        difficulty_bonus = 10.0 * math.log2(difficulty_clamped)
        raw_scaled = raw_score * speed_mod + difficulty_bonus
        y_obs = max(0.0, min(100.0, raw_scaled))

        # 4. Measurement noise R estimation
        # Early sessions and harder tasks have higher epistemic/aleatoric noise
        session_decay = 1.0 + 0.5 * math.exp(-session_index / 3.0)
        sigma_noise = 10.0 * math.sqrt(difficulty_clamped) * session_decay
        r_noise = sigma_noise ** 2

        # 5. Standardized innovation and outlier damping
        innovation = y_obs - prior_mu
        s_variance = p_prior + r_noise
        standardized_innovation = abs(innovation) / math.sqrt(max(s_variance, 1e-6))

        outlier_damped = False
        r_effective = r_noise
        if standardized_innovation > cls.OUTLIER_THRESHOLD:
            outlier_damped = True
            # Inflate measurement noise quadratically past threshold
            inflation_factor = (standardized_innovation / cls.OUTLIER_THRESHOLD) ** 2
            r_effective = r_noise * inflation_factor

        # 6. Kalman gain and posterior calculation
        k_gain = p_prior / (p_prior + r_effective)
        mu_post = prior_mu + k_gain * innovation
        p_post = (1.0 - k_gain) * p_prior
        sigma_post = math.sqrt(max(p_post, 1e-4))

        # Bound estimates within valid domain [0, 100]
        mu_post_clamped = max(0.0, min(100.0, mu_post))
        ci_lower = max(0.0, mu_post_clamped - 1.96 * sigma_post)
        ci_upper = min(100.0, mu_post_clamped + 1.96 * sigma_post)
        uncertainty_reduction = max(0.0, (prior_sigma - sigma_post) / prior_sigma) * 100.0

        return {
            "mu_post": round(mu_post_clamped, 2),
            "sigma_post": round(sigma_post, 2),
            "ci_95_lower": round(ci_lower, 2),
            "ci_95_upper": round(ci_upper, 2),
            "uncertainty_reduction_rate": round(uncertainty_reduction, 2),
            "observation_y": round(y_obs, 2),
            "sigma_noise_effective": round(math.sqrt(r_effective), 2),
            "kalman_gain": round(k_gain, 4),
            "outlier_damped": outlier_damped,
            "session_index": session_index
        }
