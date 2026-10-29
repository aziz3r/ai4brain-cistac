# Task protocols v1.1 (quick sessions, 60-90 s of scored play)


## Common rules
- Discrete difficulty levels shared by all games: `task_difficulty ∈ {0.5, 0.75, 1.0, 1.5, 2.0}` (coach snaps to these).
- No adaptation inside a session (clean measurement). Adaptation happens between sessions (`coach_policy.next_difficulty`).
- Practice: 5 unscored trials with feedback, only when `session_index == 0` for that task. Not sent in `items`.
- RT validity: RT < 150 ms = anticipation, drop the trial (not an error). No response within the deadline = omission (`rt_ms: null`, `correct: false`).
- RT statistics (`mean_rt_ms`, `isv`) use correct trials with RT in [150, mean+3SD]. `isv = SD/mean`.
- `error_rate_pct = 100 * errors / valid trials` (omissions count as errors).
- `clip(x) = min(max(x, 0), 1)`. `raw_score` is rounded to 1 decimal, in [0, 100].
- Engine call: `update_brain_twin_dimension(raw_score, reaction_time_ms=mean_rt_ms, baseline_rt_ms=<below>, task_difficulty, session_index)`.
  The engine already gives a small speed bonus or penalty from RT. **For tasks whose raw_score already contains speed (Speed RT) or where speed is not the construct (Matrix), send `reaction_time_ms = baseline_rt_ms` to avoid double counting.**
- Order of games and countdown are chosen by the UI; show a 3-2-1 before each scored block.

| Task | Dimension | Trials | Scored time | `baseline_rt_ms` | RT passed to engine |
|---|---|---|---|---|---|
| Spatial N-Back | working_memory | 24 scored (+N lead-in) | 53-72 s | 650 (hit RT) | mean hit RT |
| Flanker arrows | inhibitory_control | 40 | 55-70 s | 520 | mean correct RT |
| Cued Task Switching | cognitive_flexibility | 36 | 65-80 s | 850 | mean correct RT |
| Speed RT (choice) | processing_speed | 60 | 60-75 s | `b_k` (below) | = baseline (neutral) |
| Matrix Puzzle | inductive_reasoning | 6 items | up to 84 s | 9000 | = baseline (neutral) |

Flanker replaces Stroop (language-independent, no colour-perception confound); `task_id` stays `"stroop"` in the schema enum, or add `"flanker"` to `TaskId` (preferred, schema v1.0.1).

---

## 1. Spatial N-Back (`nback_spatial`)
Stimulus: 3x3 grid, one cell highlighted 500 ms, then blank until the next onset (SOA). Response: "Match" button/Space if the cell equals the one N back; no response = "no match".
Sequence: N lead-in stimuli (no response), then 24 scored: exactly 8 targets, 4 lures (cell equal to N±1 back, counts as non-target), 12 other; no more than 3 targets in a row; no immediate repeats unless target.

| `task_difficulty` | N | SOA (ms) |
|---|---|---|
| 0.5 | 1 | 3000 |
| 0.75 | 1 | 2200 |
| 1.0 | 2 | 2800 |
| 1.5 | 3 | 2800 |
| 2.0 | 3 | 2200 |

Response window = SOA. `condition`: `target` / `non_target`; `level` = N.
**Key metric: d′** with log-linear correction:
```
H  = (hits + 0.5) / (8 + 1)          # 8 targets
FA = (false_alarms + 0.5) / (16 + 1) # 16 non-targets
d' = Φ⁻¹(H) − Φ⁻¹(FA)                # Φ⁻¹ = inverse normal CDF (Acklam approx.)
raw_score = 100 * clip(d' / 3.4)     # max attainable d' ≈ 3.48
```
Extra reported: hit rate, FA rate, lure FA rate. `mean_rt_ms` = mean RT of hits (if 0 hits, use `baseline_rt_ms`).

## 2. Flanker arrows (`stroop` / `flanker`)
Stimulus: row of 5 arrows (←/→); respond to the centre arrow's direction (two buttons / ←→ keys). Fixation 400 ms, stimulus until response or deadline, ITI 300 ms.
Congruent `→→→→→`, incongruent `←←→←←`. Balanced left/right, no more than 3 same-condition in a row.

| `task_difficulty` | % incongruent | deadline (ms) |
|---|---|---|
| 0.5 | 40 | 1800 |
| 0.75 | 50 | 1600 |
| 1.0 | 50 | 1400 |
| 1.5 | 60 | 1200 |
| 2.0 | 70 | 1000 |

`condition`: `congruent` / `incongruent`.
**Key metric: interference `I = median RT(incong, correct) − median RT(cong, correct)` (ms).**
```
acc_inc = correct_incong / n_incong          # in [0,1]
I_eff   = max(0, I)                          # negative = no interference
raw_score = 100 * clip(1 − I_eff / 250) * acc_inc
```
If fewer than 5 correct incongruent trials: `raw_score = 100 * 0 = 0` and set `behavior.abandoned_early = true` only if the user quit; otherwise keep the score (low accuracy is information).

## 3. Cued Task Switching (`task_switching`)
Stimulus: digit 1-9 except 5. Cue (shown before the digit, then stays): **parity** (blue circle: odd/even) or **magnitude** (orange square: <5 / >5). Two response buttons whose meaning depends on the cue (labels shown on screen).
Sequence: 36 trials, exactly 50% switch / 50% repeat (first trial excluded from switch/repeat stats), no more than 3 repeats of the same task in a row. Response deadline 2500 ms, ITI 300 ms.

| `task_difficulty` | cue-target interval CTI (ms) |
|---|---|
| 0.5 | 1000 |
| 0.75 | 700 |
| 1.0 | 500 |
| 1.5 | 300 |
| 2.0 | 150 |

`condition`: `switch` / `repeat`.
**Key metric: relative switch cost**
```
SC     = median RT(switch, correct) − median RT(repeat, correct)   # ms
SC_rel = max(0, SC) / median RT(repeat, correct)
acc_sw = correct_switch / n_switch
raw_score = 100 * clip(1 − SC_rel / 0.6) * acc_sw
```
(Typical SC_rel is 0.1-0.35. Normalising by repeat RT removes the slow-responder bias.)

## 4. Speed RT / Choice reaction (`choice_rt`)
Stimulus: k placeholder boxes in a row; one lights up (green); press the matching key/tap. ISI uniform random 400-900 ms. 60 trials, deadline 2000 ms. Every 10th trial has a longer ISI (900-1400 ms) to limit anticipation.

| `task_difficulty` | k choices | extra |
|---|---|---|
| 0.5 | 2 | – |
| 0.75 | 3 | – |
| 1.0 | 4 | – |
| 1.5 | 6 | – |
| 2.0 | 6 | grey decoy flashes (50 ms) on 30% of trials before the target |

Hick-law reference RT (this is `baseline_rt_ms`): `b_k = 230 + 130·log2(k)` → k=2: 360, 3: 436, 4: 490, 6: 566 ms.
`condition`: `none`. **Key metric: median correct RT.**
```
rel   = median_rt / b_k
S_rt  = clip((1.6 − rel) / 0.9)               # rel ≤ 0.7 → 1, rel ≥ 1.6 → 0
acc   = correct / valid_trials               # in [0,1]
raw_score = 100 * S_rt * acc²                # squared accuracy punishes guessing
```
Send `reaction_time_ms = baseline_rt_ms = b_k` to the engine. Also report `isv` and throughput `correct_per_min`. Calibration: show a 10-tap latency test once per device and store `device_class`; subtract nothing, but the coach never compares devices.

## 5. Matrix Puzzle (`matrix_reasoning`)
Procedurally generated 3x3 matrices (seeded; seed logged, never reused across sessions). Choose 1 of 6 options. 6 items, cap 14 s per item (timeout = incorrect, `rt_ms: null`). Item rule count `L_i ∈ {1,2,3}` (rules: shape progression, colour/fill alternation, count increment; 3-rule items add 1 distractor attribute).

| `task_difficulty` | item levels L (6 items, shuffled) |
|---|---|
| 0.5 | 1,1,1,1,1,1 |
| 0.75 | 1,1,1,1,2,2 |
| 1.0 | 1,1,2,2,2,2 |
| 1.5 | 1,2,2,2,3,3 |
| 2.0 | 2,2,3,3,3,3 |

Distractor options must each violate exactly one rule (no random distractors). `level` = L_i, `condition`: `none`.
**Key metric: weighted accuracy with guess correction**
```
p = Σ_i L_i · correct_i / Σ_i L_i
raw_score = 100 * clip((p − 1/6) / (1 − 1/6))
```
Send `reaction_time_ms = baseline_rt_ms = 9000`. Report mean item RT in `mean_rt_ms` for information. With only 6 items the estimate is noisy.

---

## Calibration notes
- The engine uses one `SIGMA_NOISE_BASE`. Recommended per-dimension noise scale: inductive_reasoning ×1.4 (6 items), inhibitory_control ×1.2 and cognitive_flexibility ×1.2 (difference scores), others ×1.0. Add as a `noise_scale` argument (default 1.0) if pilot variance confirms it.
- Pilot targets: median `raw_score` ≈ 65-75 at the coach-chosen level; < 5% floor (0) or ceiling (100) scores. Report the per-level distributions.
- Log test-retest correlation of `raw_score` per game; flag any game with r < 0.5.
