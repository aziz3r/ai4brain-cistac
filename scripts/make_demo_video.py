"""Record the AI4BRAIN demo video: scripted Playwright walkthrough of the real app + narration (macOS `say`).

Run with the backend venv (has Playwright) while the app is up on :3000 and :8000:
    cd backend && source .venv/bin/activate && python ../scripts/make_demo_video.py
Output: docs/video/ai4brain_demo.mp4 (narration in English, ~3.5-4 min).
Profile-based screens use the seeded demo personas (simulated data), and the video says so.
"""
import os
import re
import subprocess
import time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "video")
TMP = os.path.join(OUT, "_tmp")
BASE = "http://127.0.0.1:3000"
SLIDES = "file://" + os.path.join(OUT, "slides.html")
VOICE, RATE = "Daniel", 172


def say(text, path):
    subprocess.run(["say", "-v", VOICE, "-r", str(RATE), "-o", path, text], check=True)


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def scroll(page, px, seconds):
    steps = max(1, int(seconds * 20))
    for _ in range(steps):
        page.mouse.wheel(0, px / steps)
        page.wait_for_timeout(int(1000 / 20))


def click_if(page, locator, timeout=3000):
    try:
        locator.first.click(timeout=timeout)
        return True
    except Exception:
        return False


# ---- scene actions: (page, budget_seconds) -------------------------------------------------
def s_title(page, b):
    page.goto(SLIDES + "#title"); page.wait_for_timeout(int(b * 1000))


def s_problem(page, b):
    page.goto(SLIDES + "#problem"); page.wait_for_timeout(int(b * 1000))


def s_landing(page, b):
    page.goto(BASE + "/", wait_until="networkidle"); page.wait_for_timeout(1500)
    scroll(page, 1500, max(2, b - 3)); page.wait_for_timeout(1000)


def s_how(page, b):
    page.goto(BASE + "/how-it-works", wait_until="networkidle"); page.wait_for_timeout(1500)
    scroll(page, 1400, max(2, b - 3)); page.wait_for_timeout(1000)


def s_consent(page, b):
    page.goto(BASE + "/consent", wait_until="networkidle"); page.wait_for_timeout(2000)
    scroll(page, 500, 3); page.wait_for_timeout(1500)
    cb = page.locator("input[type=checkbox]")
    if cb.count():
        cb.first.check()
    page.wait_for_timeout(max(500, int((b - 8) * 1000)))


def s_game(page, b):
    page.goto(BASE + "/calibration", wait_until="networkidle"); page.wait_for_timeout(2500)
    page.mouse.wheel(0, 250); page.wait_for_timeout(2500)
    click_if(page, page.get_by_role("button", name=re.compile(r"^(Start|Commencer)", re.I)))
    page.wait_for_timeout(4000)  # 3-2-1
    t_end = time.time() + max(4, b - 9)
    while time.time() < t_end:
        page.keyboard.press("Space"); page.wait_for_timeout(1400)


def _persona(ctx_page, pid):
    ctx_page.evaluate(f"localStorage.setItem('ai4brain_user_id','{pid}')")


def s_results(page, b):
    page.goto(BASE + "/", wait_until="domcontentloaded"); _persona(page, "persona_steady_improver")
    page.goto(BASE + "/results", wait_until="networkidle"); page.wait_for_timeout(2500)
    scroll(page, 700, max(2, b - 4)); page.wait_for_timeout(1000)


def s_profile(page, b):
    page.goto(BASE + "/profile", wait_until="networkidle"); page.wait_for_timeout(2500)
    scroll(page, 1700, max(2, b - 4)); page.wait_for_timeout(1000)


def s_coach(page, b):
    page.goto(BASE + "/home", wait_until="networkidle"); page.wait_for_timeout(3000)
    click_if(page, page.get_by_role("button", name=re.compile(r"why|pourquoi", re.I)))
    page.wait_for_timeout(2000); scroll(page, 500, max(2, b - 8)); page.wait_for_timeout(1000)


def s_demo(page, b):
    page.goto(BASE + "/demo", wait_until="networkidle"); page.wait_for_timeout(2500)
    scroll(page, 600, max(2, b - 4)); page.wait_for_timeout(1000)


def s_privacy(page, b):
    page.goto(BASE + "/privacy", wait_until="networkidle"); page.wait_for_timeout(2500)
    scroll(page, 500, max(2, b - 4)); page.wait_for_timeout(1000)


def s_french(page, b):
    page.goto(BASE + "/", wait_until="networkidle"); page.wait_for_timeout(1500)
    click_if(page, page.get_by_role("button", name=re.compile(r"^FR$")))
    page.wait_for_timeout(2500); scroll(page, 900, max(2, b - 5)); page.wait_for_timeout(1000)


def s_math(page, b):
    page.goto(SLIDES + "#math"); page.wait_for_timeout(int(b * 1000))


def s_close(page, b):
    page.goto(SLIDES + "#close"); page.wait_for_timeout(int(b * 1000))


SCENES = [
    (s_title, "AI4BRAIN is a cognitive growth agent. Five short games, a probabilistic model of the player, and a coach that explains every recommendation. It is a learning tool, and it makes no medical claim of any kind."),
    (s_problem, "Most brain training apps give you a single score and no reasons. We wanted the opposite. Honest ranges instead of fake precision, explanations in plain language, and strong privacy by design. We measure five everyday skills: memory, focus, flexibility, speed and reasoning."),
    (s_landing, "This is the home page. It explains in three steps what the app does, gives an everyday example for each of the five skills, and states clearly that it is not a medical assessment. No camera, no microphone, no name, no email."),
    (s_how, "A dedicated page explains how a game becomes an estimate, what the range means, what the coach does, and what the app is not. Scientists can open a technical section with the full model."),
    (s_consent, "Before anything is stored, the player gives consent. The page lists what is collected, and what is not. The player chooses how long the data is kept, and the checkbox confirms that this is a learning tool."),
    (s_game, "Each game starts with a short briefing, then a countdown. This one is Grid Memory, a spatial N-back. Squares light up one at a time, and the player presses Same when a square matches the one from two steps earlier. The five games last about a minute each, and can be played with the keyboard."),
    (s_results, "After the five games, the profile appears as range lines, not a single number. The dot is the best estimate, the shaded part is the ninety-five percent range, and the label says how reliable it is. This screen uses a simulated demo profile."),
    (s_profile, "The profile page adds a projection of where each skill could go if the player keeps practising. The band widens with time, because the future is uncertain. It also shows the AI Collaboration Score, which looks at how the player works with the coach."),
    (s_coach, "The coach recommends the next game and explains why, using the player's own estimates. The choice is made by a deterministic policy, and the language model only explains it, so the explanation always matches the real cause. The player can ask why, or propose something else. Every sentence passes a clinical vocabulary filter, in English and in French."),
    (s_demo, "For evaluation, three seeded personas show how the model behaves. A steady improver, a variable responder with occasional lapses that the model damps, and a fatigue pattern that triggers a break suggestion."),
    (s_privacy, "Privacy is built in. The player can download all their data, or delete everything with a receipt, and data is purged automatically after the chosen retention period."),
    (s_french, "The whole interface is available in English and in French, with a simple switch in the header."),
    (s_math, "Under the hood, each skill is a Gaussian belief, updated after every session with a Kalman style Bayesian update. The observation accounts for task difficulty and speed. Measurement noise is higher in early sessions, a lapse beyond three standard deviations is damped, and a small drift term keeps the uncertainty from ever collapsing to zero. The collaboration score is the weighted sum of clarification, verification, iteration, autonomy and responsible use, with the exact formula from the challenge."),
    (s_close, "To be clear about what is validated: the engine, scoring, privacy controls and tests are implemented, and reliability figures come from simulation. A study with real participants is the next step. Thank you for watching."),
]


def main():
    os.makedirs(TMP, exist_ok=True)
    auds = []
    for i, (_, txt) in enumerate(SCENES):
        p = os.path.join(TMP, f"a{i:02d}.aiff"); say(txt, p); auds.append((p, duration(p)))
    print("narration total: %.1fs" % sum(d for _, d in auds))

    starts = []
    with sync_playwright() as pw:
        br = pw.chromium.launch(headless=True)
        ctx = br.new_context(viewport={"width": 1280, "height": 720}, locale="en-US",
                             record_video_dir=TMP, record_video_size={"width": 1280, "height": 720})
        ctx.add_init_script("localStorage.setItem('ai4brain_lang','en');"
                            "if(!localStorage.getItem('ai4brain_user_id'))localStorage.setItem('ai4brain_user_id','persona_steady_improver');")
        page = ctx.new_page(); t0 = time.time()
        for (fn, _), (_, d) in zip(SCENES, auds):
            budget = d + 0.8
            t_s = time.time(); starts.append(t_s - t0)
            try:
                fn(page, budget)
            except Exception as e:
                print("scene", fn.__name__, "error:", e)
            left = budget - (time.time() - t_s)
            if left > 0:
                page.wait_for_timeout(int(left * 1000))
        vid = page.video.path()
        ctx.close(); br.close()

    inputs, filt, labels = [], [], []
    for i, ((p, _), st) in enumerate(zip(auds, starts)):
        inputs += ["-i", p]
        filt.append(f"[{i + 1}:a]adelay={int((st + 0.35) * 1000)}|{int((st + 0.35) * 1000)}[a{i}]"); labels.append(f"[a{i}]")
    fc = ";".join(filt) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:normalize=0[aout]"
    out = os.path.join(OUT, "ai4brain_demo.mp4")
    subprocess.run(["ffmpeg", "-y", "-i", vid, *inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-c:a", "aac", "-b:a", "128k",
                    "-shortest", out], check=True, capture_output=True)
    print("video:", out, "%.1fs" % duration(out))


if __name__ == "__main__":
    main()
