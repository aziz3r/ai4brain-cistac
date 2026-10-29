"""
AI4BRAIN Deterministic Coach Policy & Faithful XAI Decision Trace
Computes reproducible task and difficulty recommendations according to IEEE CISTAC 1.0.
The LLM generates pedagogical explanations citing ONLY facts from the Decision Trace.
"""

import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict


TASK_MAPPING = {
    "working_memory": {"task_id": "spatial_n_back", "name": "Visuo-spatial N-Back"},
    "selective_attention": {"task_id": "flanker_arrows", "name": "Eriksen Flanker Task"},
    "cognitive_flexibility": {"task_id": "task_switching_cued", "name": "Cued Task-Switching"},
    "processing_speed": {"task_id": "speed_choice_rt", "name": "Multi-Choice Reaction Speed"},
    "inductive_reasoning": {"task_id": "matrix_reasoning", "name": "Procedural Matrix Puzzles"}
}

DIFFICULTY_TIERS = [0.5, 0.75, 1.0, 1.5, 2.0]


@dataclass
class DecisionTrace:
    target_dimension: str
    dimension_name: str
    task_id: str
    task_name: str
    calibrated_difficulty: float
    current_mu: float
    current_sigma: float
    ci_95_lower: float
    ci_95_upper: float
    uncertainty_tier: str  # high, moderate, refined
    room_to_grow: float
    recency_weight: float
    computed_priority: float
    all_priorities: Dict[str, float]
    alternatives: List[Dict[str, str]]
    timestamp: float


class CoachPolicy:
    """
    Deterministic rule-based policy engine that selects the optimal training task
    and calibrated difficulty to sustain Zone of Proximal Development (~70% target performance).
    """

    @classmethod
    def recommend(
        cls,
        dimensions: Dict[str, Any],
        last_dimension_id: Optional[str] = None
    ) -> DecisionTrace:
        """
        Picks target dimension:
        Priority = 0.4 * room_to_grow + 0.4 * uncertainty + 0.2 * recency
        Excludes last practiced dimension if multiple dimensions are available.
        """
        priorities: Dict[str, float] = {}
        dim_stats: Dict[str, Dict[str, Any]] = {}

        now = time.time()
        for dim_id, state in dimensions.items():
            mu = getattr(state, "mu", 50.0)
            sigma = getattr(state, "sigma", 25.0)
            history = getattr(state, "history", [])

            # 1. Room to grow: (100 - mu) / 100
            room = max(0.0, min(1.0, (100.0 - mu) / 100.0))

            # 2. Epistemic uncertainty: normalized by baseline sigma=25
            uncert = max(0.0, min(1.0, sigma / 25.0))

            # 3. Recency: time or session count since last training
            if history:
                last_time = history[-1].timestamp if hasattr(history[-1], "timestamp") else now
                days_since = max(0.0, (now - last_time) / 86400.0)
                recency = min(1.0, days_since / 7.0 + 0.2)
            else:
                recency = 1.0  # Never practiced

            # Priority formula
            p = 0.4 * room + 0.4 * uncert + 0.2 * recency

            # Penalty/exclusion for immediate repetition to promote cognitive variety
            if dim_id == last_dimension_id and len(dimensions) > 1:
                p *= 0.15

            priorities[dim_id] = round(p, 4)
            dim_stats[dim_id] = {
                "mu": round(mu, 2),
                "sigma": round(sigma, 2),
                "room": round(room, 3),
                "uncert": round(uncert, 3),
                "recency": round(recency, 3),
                "ci_lower": getattr(state, "ci_95_lower", max(0.0, mu - 1.96 * sigma)),
                "ci_upper": getattr(state, "ci_95_upper", min(100.0, mu + 1.96 * sigma))
            }

        # Select target dimension with highest priority
        sorted_dims = sorted(priorities.items(), key=lambda kv: kv[1], reverse=True)
        target_dim_id = sorted_dims[0][0]
        stats = dim_stats[target_dim_id]

        # Calibrate difficulty targeting ~70% expected accuracy
        target_mu = stats["mu"]
        if target_mu < 45.0:
            calibrated_diff = 0.5
        elif target_mu < 60.0:
            calibrated_diff = 0.75
        elif target_mu < 75.0:
            calibrated_diff = 1.0
        elif target_mu < 88.0:
            calibrated_diff = 1.5
        else:
            calibrated_diff = 2.0

        # Qualitative uncertainty tier
        sig = stats["sigma"]
        if sig > 12.0:
            uncert_tier = "high"
        elif sig >= 6.0:
            uncert_tier = "moderate"
        else:
            uncert_tier = "refined"

        # Alternative suggestions (rank 2 and 3)
        alternatives = []
        for alt_id, _ in sorted_dims[1:3]:
            alternatives.append({
                "dimension_id": alt_id,
                "task_id": TASK_MAPPING[alt_id]["task_id"],
                "name": TASK_MAPPING[alt_id]["name"]
            })

        mapping = TASK_MAPPING[target_dim_id]
        return DecisionTrace(
            target_dimension=target_dim_id,
            dimension_name=mapping["name"],
            task_id=mapping["task_id"],
            task_name=mapping["name"],
            calibrated_difficulty=calibrated_diff,
            current_mu=stats["mu"],
            current_sigma=stats["sigma"],
            ci_95_lower=round(stats["ci_lower"], 2),
            ci_95_upper=round(stats["ci_upper"], 2),
            uncertainty_tier=uncert_tier,
            room_to_grow=stats["room"],
            recency_weight=stats["recency"],
            computed_priority=sorted_dims[0][1],
            all_priorities=priorities,
            alternatives=alternatives,
            timestamp=now
        )
