# AI4BRAIN — Cognitive Growth Agent

CISTAC 1.0 challenge (IEEE Computational Intelligence Society, Tunisia Chapter).
Five one-minute games estimate five **functional, non-clinical** skills (Memory, Focus, Flexibility, Speed, Reasoning). Each skill is a Gaussian belief with an explicit range that narrows with practice. A coach recommends the next game and explains why in plain language (English or French).

> Learning-support tool. Not a medical or psychological assessment. No camera, no microphone, no name or e-mail.

## Deliverables
| Item | Where |
|---|---|
| Technical report (IEEE, LaTeX) | `docs/ieee_report/main.tex`, compiled PDF `docs/ieee_report/AI4BRAIN_report.pdf` |
| Demo video (narrated walkthrough) | `docs/video/ai4brain_demo.mp4`, script `scripts/make_demo_video.py` |
| Screenshots (real browser captures, FR/EN, desktop/mobile) | `docs/screenshots/` |
| Data contracts (JSON Schema, Pydantic v2, TypeScript) | `contracts/`, `backend/app/models/schemas.py`, `frontend/src/types/contracts.ts` |

## What is in the box
- **Brain Twin** (`backend/app/core/engine.py`): Kalman-type Bayesian update per skill with difficulty credit, speed–accuracy guard, session-dependent noise, drift floor and outlier damping.
- **Coach** (`coach_policy.py`, `coach_prompt.py`): a deterministic policy decides; an optional LLM only verbalises the decision; every text passes an EN/FR clinical-vocabulary guardrail; template fallback when no API key.
- **AI Collaboration Score** (`ai_collab.py`): `0.20 C + 0.25 V + 0.20 I + 0.20 A + 0.15 R` from interaction logs, with shrinkage toward 50.
- **Privacy**: consent gate, retention choice, export, hard delete with receipt, purge routine, non-biometric mode.
- **Frontend**: Next.js 14, bilingual (FR/EN), five games, range-line profile, projection cone.

## Run locally
```bash
# backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python -m pytest -q          # 19 tests
cd .. && cp .env.example .env              # optional: add ANTHROPIC_API_KEY for LLM wording
# both servers
bash start.sh                              # http://localhost:3000 (API on :8000)
```
Reproduce the report figures: `python3 scripts/report_figures.py`. Rebuild the report: `cd docs/ieee_report && tectonic main.tex`.

## Honest status
- Engine, scoring, privacy controls and tests are implemented.
- Reliability and coverage figures in the report come from **simulation**, not from human participants.
- A usability study and a validation study with real participants have **not** been run.
- Some interface strings were still untranslated at the time of writing.
- The prototype has no user authentication: the pseudonymous id acts as a bearer secret for export and deletion. The purge endpoint needs the `ADMIN_TOKEN` secret (`X-Admin-Token` header) and is disabled if none is set.
- Demo personas (`/demo`) use seeded, simulated data.

