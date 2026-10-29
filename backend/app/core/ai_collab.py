"""
AI4BRAIN AI Collaboration Score Engine
Compliant with IEEE CISTAC 1.0 specifications.
Computes objective human-AI collaboration metric (0-100) across 5 dimensions:
Clarification (20%), Critical Verification (25%), Iteration (20%), Autonomy (20%), Responsible Use (15%).
Includes Bayesian shrinkage toward 50 for small sample sizes and uncertainty estimation.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


def trap(x: float, a: float, b: float, c: float, d: float) -> float:
    """Trapezoid membership function."""
    if x <= a or x >= d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if a < x < b:
        return (x - a) / (b - a) if b > a else 0.0
    if c < x < d:
        return (d - x) / (d - c) if d > c else 0.0
    return 0.0


@dataclass
class CollabEvent:
    event_type: str  # prompt, response_action, feedback_revision, decision, session_metric
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: Optional[float] = None


class AICollaborationScorer:
    WEIGHTS = {
        "clarification": 0.20,
        "critical_verification": 0.25,
        "iteration": 0.20,
        "autonomy": 0.20,
        "responsible_use": 0.15
    }

    @staticmethod
    def _mean(values: List[float], default: float = 0.5) -> float:
        return sum(values) / len(values) if values else default

    @classmethod
    def compute_clarification(cls, events: List[CollabEvent]) -> Tuple[float, int]:
        """
        C = 100 * (0.4 * L + 0.4 * X + 0.2 * P)
        L: trap(words; 3, 8, 45, 120)
        X: mean(0.5 * refs_context + 0.5 * has_goal)
        P: share of reformulations that resolve
        """
        prompt_events = [e for e in events if e.event_type == "prompt"]
        n = len(prompt_events)
        if n == 0:
            return 50.0, 0

        l_vals = []
        x_vals = []
        reformulations_total = 0
        reformulations_resolved = 0

        for e in prompt_events:
            d = e.data
            word_count = float(d.get("word_count", 0))
            l_vals.append(trap(word_count, 3, 8, 45, 120))

            refs_ctx = 1.0 if d.get("refs_context", False) else 0.0
            has_goal = 1.0 if d.get("has_goal", False) else 0.0
            x_vals.append(0.5 * refs_ctx + 0.5 * has_goal)

            if d.get("is_reformulation", False):
                reformulations_total += 1
                if d.get("resolved", True):
                    reformulations_resolved += 1

        l_mean = cls._mean(l_vals, 0.5)
        x_mean = cls._mean(x_vals, 0.5)
        p_ratio = (reformulations_resolved / reformulations_total) if reformulations_total > 0 else 0.7

        c_raw = 100.0 * (0.4 * l_mean + 0.4 * x_mean + 0.2 * p_ratio)
        return max(0.0, min(100.0, c_raw)), n

    @classmethod
    def compute_verification(cls, events: List[CollabEvent]) -> Tuple[float, int]:
        """
        V = 100 * (1 - exp(-v/0.4)) * (1 - 0.5 * max(0, (q - 0.7)/0.3))
        v is mean response weight:
        ask_why: 1.0, challenge_with_reason: 1.0, challenge_without: 0.6,
        modify: 0.8, accept (audited/deliberate): 0.5, accept (blind <4s): 0.0, ignore: 0.0
        q is share of challenges and ignores.
        """
        response_events = [e for e in events if e.event_type == "response_action"]
        n = len(response_events)
        if n == 0:
            return 50.0, 0

        weights = []
        challenge_ignore_count = 0

        for e in response_events:
            action = e.data.get("action", "")
            dwell_time_s = float(e.data.get("dwell_time_s", 0.0))
            explanation_opened = bool(e.data.get("explanation_opened", False))
            has_reason = bool(e.data.get("has_reason", False))

            if action == "ask_why":
                weights.append(1.0)
            elif action == "challenge":
                challenge_ignore_count += 1
                weights.append(1.0 if has_reason else 0.6)
            elif action == "modify":
                weights.append(0.8)
            elif action == "accept":
                if explanation_opened or dwell_time_s >= 4.0:
                    weights.append(0.5)
                else:
                    weights.append(0.0)  # Blind click-through
            elif action == "ignore":
                challenge_ignore_count += 1
                weights.append(0.0)
            else:
                weights.append(0.3)

        v_mean = cls._mean(weights, 0.0)
        q_ratio = challenge_ignore_count / n
        penalty = 1.0 - 0.5 * max(0.0, min(1.0, (q_ratio - 0.7) / 0.3))
        v_raw = 100.0 * (1.0 - math.exp(-v_mean / 0.4)) * penalty
        return max(0.0, min(100.0, v_raw)), n

    @classmethod
    def compute_iteration(cls, events: List[CollabEvent]) -> Tuple[float, int]:
        """
        I = 100 * (0.5 * F + 0.3 * D + 0.2 * G)
        F: share of feedback followed by revision
        D: trap(exchanges; 0, 2, 4, 8)
        G: clip(0.5 + mean(delta_y)/20, 0, 1)
        """
        iter_events = [e for e in events if e.event_type == "feedback_revision"]
        n = len(iter_events)
        if n == 0:
            return 50.0, 0

        feedbacks = 0
        revisions = 0
        exchanges_list = []
        delta_ys = []

        for e in iter_events:
            d = e.data
            feedbacks += 1
            if d.get("revised", False):
                revisions += 1
            exchanges_list.append(float(d.get("exchanges_count", 2)))
            if "delta_y" in d:
                delta_ys.append(float(d["delta_y"]))

        f_ratio = (revisions / feedbacks) if feedbacks > 0 else 0.5
        d_mean = cls._mean([trap(x, 0, 2, 4, 8) for x in exchanges_list], 0.5)
        g_mean = max(0.0, min(1.0, 0.5 + (cls._mean(delta_ys, 0.0) / 20.0)))

        i_raw = 100.0 * (0.5 * f_ratio + 0.3 * d_mean + 0.2 * g_mean)
        return max(0.0, min(100.0, i_raw)), n

    @classmethod
    def compute_autonomy(cls, events: List[CollabEvent]) -> Tuple[float, int]:
        """
        A = 100 * (0.5 * B + 0.25 * T + 0.25 * S)
        B: exp(-(rho - 0.4)^2 / (2 * 0.25^2))
        T: mean(precision, recall) of asking help when struggling
        S: share of user-initiated decisions vs full delegation
        """
        decisions = [e for e in events if e.event_type == "decision"]
        n = len(decisions)
        if n == 0:
            return 50.0, 0

        consulted_count = 0
        user_decisions = 0
        tp, fp, fn = 0, 0, 0

        for e in decisions:
            d = e.data
            consulted = bool(d.get("consulted_coach", False))
            user_retained = bool(d.get("user_decided", True))
            struggled = bool(d.get("struggling", False))

            if consulted:
                consulted_count += 1
            if user_retained:
                user_decisions += 1

            if consulted and struggled:
                tp += 1
            elif consulted and not struggled:
                fp += 1
            elif not consulted and struggled:
                fn += 1

        rho = consulted_count / n
        b_score = math.exp(-((rho - 0.4) ** 2) / (2 * (0.25 ** 2)))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.5
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.5
        t_score = 0.5 * (precision + recall)
        s_score = user_decisions / n

        a_raw = 100.0 * (0.5 * b_score + 0.25 * t_score + 0.25 * s_score)
        return max(0.0, min(100.0, a_raw)), n

    @classmethod
    def compute_responsible_use(cls, events: List[CollabEvent]) -> Tuple[float, int]:
        """
        R = 100 * (0.30 * P + 0.35 * F + 0.20 * Q + 0.15 * H)
        P: trap(duration_min; 3, 10, 45, 90)
        F: share of fatigue sessions followed by rest
        Q: penalises > 2 msg/min and > 3 sessions/day
        H: 1 - min(1, flags / 3)
        """
        metric_events = [e for e in events if e.event_type == "session_metric"]
        n = len(metric_events)
        if n == 0:
            return 50.0, 0

        p_vals = []
        fatigue_sessions = 0
        rest_taken = 0
        overuse_penalties = []
        flag_counts = []

        for e in metric_events:
            d = e.data
            dur = float(d.get("duration_min", 20.0))
            p_vals.append(trap(dur, 3, 10, 45, 90))

            if d.get("fatigued", False):
                fatigue_sessions += 1
                if d.get("took_rest", True):
                    rest_taken += 1

            msgs_per_min = float(d.get("messages_per_min", 1.0))
            sessions_today = int(d.get("sessions_today", 1))
            q_val = 1.0
            if msgs_per_min > 2.0:
                q_val -= 0.5
            if sessions_today > 3:
                q_val -= 0.5
            overuse_penalties.append(max(0.0, q_val))

            flag_counts.append(int(d.get("ethical_flags", 0)))

        p_mean = cls._mean(p_vals, 0.7)
        f_ratio = (rest_taken / fatigue_sessions) if fatigue_sessions > 0 else 0.8
        q_mean = cls._mean(overuse_penalties, 0.8)
        h_mean = 1.0 - min(1.0, sum(flag_counts) / 3.0)

        r_raw = 100.0 * (0.30 * p_mean + 0.35 * f_ratio + 0.20 * q_mean + 0.15 * h_mean)
        return max(0.0, min(100.0, r_raw)), n

    @classmethod
    def calculate_collaboration_score(cls, events: List[CollabEvent]) -> Dict[str, Any]:
        """
        Calculates complete weighted AI Collaboration Score with Bayesian shrinkage
        and explicit uncertainty modeling.
        """
        comp_calc = {
            "clarification": cls.compute_clarification(events),
            "critical_verification": cls.compute_verification(events),
            "iteration": cls.compute_iteration(events),
            "autonomy": cls.compute_autonomy(events),
            "responsible_use": cls.compute_responsible_use(events)
        }

        shrunk_components = {}
        component_sigmas = {}
        weighted_sum = 0.0
        var_sum = 0.0

        for key, (raw_val, n) in comp_calc.items():
            # Bayesian shrinkage toward 50 (neutral honest baseline)
            shrunk = 50.0 + (raw_val - 50.0) * (n / (n + 5.0))
            sigma_k = 25.0 * math.sqrt(5.0 / (n + 5.0))
            w = cls.WEIGHTS[key]

            shrunk_components[key] = {
                "raw_score": round(raw_val, 2),
                "score": round(shrunk, 2),
                "uncertainty_sigma": round(sigma_k, 2),
                "events_count": n,
                "weight": w
            }

            weighted_sum += w * shrunk
            var_sum += (w * sigma_k) ** 2

        total_sigma = math.sqrt(var_sum)
        ci_lower = max(0.0, weighted_sum - 1.96 * total_sigma)
        ci_upper = min(100.0, weighted_sum + 1.96 * total_sigma)

        return {
            "overall_score": round(weighted_sum, 2),
            "total_uncertainty_sigma": round(total_sigma, 2),
            "ci_95_lower": round(ci_lower, 2),
            "ci_95_upper": round(ci_upper, 2),
            "components": shrunk_components,
            "total_events": len(events)
        }
