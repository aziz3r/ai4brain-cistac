"""
Playwright automated screenshot capture suite.
Validates acceptance requirements on real Chromium browser:
- Both French (FR) and English (EN)
- Both Desktop (1280x850) and Mobile (390x844)
- Full suite of key screens (landing, how it works, consent, briefings, game, results, home, profile, privacy)
"""

import os
import re
import sys
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "screenshots")
BASE_URL = "http://127.0.0.1:3000"

VIEWPORTS = {
    "desktop": {"width": 1280, "height": 900},
    "mobile": {"width": 390, "height": 844, "is_mobile": True, "has_touch": True}
}

LANGUAGES = ["fr", "en"]


def capture_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for vp_name in VIEWPORTS:
        for lang in LANGUAGES:
            os.makedirs(os.path.join(OUTPUT_DIR, f"{vp_name}_{lang}"), exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for vp_name, vp_config in VIEWPORTS.items():
            for lang in LANGUAGES:
                print(f"\nCapturing {vp_name.upper()} - {lang.upper()}...")
                context = browser.new_context(
                    viewport={"width": vp_config["width"], "height": vp_config["height"]},
                    is_mobile=vp_config.get("is_mobile", False),
                    has_touch=vp_config.get("has_touch", False),
                    locale="fr-FR" if lang == "fr" else "en-US"
                )

                # Set language in localStorage before each page load
                init_script = f"""
                localStorage.setItem('ai4brain_lang', '{lang}');
                localStorage.setItem('ai4brain_user_id', 'persona_steady_improver');
                """
                context.add_init_script(init_script)
                page = context.new_page()

                folder = os.path.join(OUTPUT_DIR, f"{vp_name}_{lang}")

                # 1. Landing Page (/)
                page.goto(f"{BASE_URL}/", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "01_landing.png"), full_page=True)
                print(f"  01_landing.png")

                # 2. How it works (/how-it-works)
                page.goto(f"{BASE_URL}/how-it-works", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "02_how_it_works.png"), full_page=True)
                print(f"  02_how_it_works.png")

                # 3. Consent (/consent)
                page.goto(f"{BASE_URL}/consent", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "03_consent.png"), full_page=True)
                print(f"  03_consent.png")

                # 4. Game Briefing Screens (all 5 games in calibration flow)
                # Game 1: N-Back Grid Memory
                page.goto(f"{BASE_URL}/calibration", wait_until="networkidle")
                page.wait_for_timeout(500)
                page.screenshot(path=os.path.join(folder, "04_briefing_1_nback.png"))
                print(f"  04_briefing_1_nback.png")

                # Skip to Game 2: Flanker Arrows
                skip_btn = page.locator("button:has-text('Passer'), button:has-text('Skip')").first
                if skip_btn.is_visible():
                    skip_btn.click()
                    page.wait_for_timeout(600)
                    page.screenshot(path=os.path.join(folder, "04_briefing_2_flanker.png"))
                    print(f"  04_briefing_2_flanker.png")

                    # Skip to Game 3: Rule Switch
                    skip_btn.click()
                    page.wait_for_timeout(600)
                    page.screenshot(path=os.path.join(folder, "04_briefing_3_task_switch.png"))
                    print(f"  04_briefing_3_task_switch.png")

                    # Skip to Game 4: Quick Reaction
                    skip_btn.click()
                    page.wait_for_timeout(600)
                    page.screenshot(path=os.path.join(folder, "04_briefing_4_choice_rt.png"))
                    print(f"  04_briefing_4_choice_rt.png")

                    # Skip to Game 5: Pattern Puzzle
                    skip_btn.click()
                    page.wait_for_timeout(600)
                    page.screenshot(path=os.path.join(folder, "04_briefing_5_matrix.png"))
                    print(f"  04_briefing_5_matrix.png")

                # 5. One Game In Progress
                # Reload calibration and click Start on game 1
                page.goto(f"{BASE_URL}/calibration", wait_until="networkidle")
                start_game_btn = page.get_by_role("button", name=re.compile(r"^(Commencer|Start)$")).first
                if start_game_btn.is_visible():
                    start_game_btn.scroll_into_view_if_needed()
                    page.wait_for_timeout(500)
                    try:
                        start_game_btn.click(timeout=8000)
                    except Exception as exc:
                        print("  game start not clickable on this viewport:", str(exc)[:80])
                        start_game_btn.click(force=True)
                    # Wait for countdown (3-2-1) to reach playing state
                    page.wait_for_timeout(3200)
                    page.screenshot(path=os.path.join(folder, "05_game_in_progress.png"))
                    print(f"  05_game_in_progress.png")

                # 6. Results Page with Range Lines (/results)
                page.goto(f"{BASE_URL}/results", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "06_results_range_lines.png"), full_page=True)
                print(f"  06_results_range_lines.png")

                # 7. Home Page - New User (/home?new=true)
                page.goto(f"{BASE_URL}/home?new=true", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "07_home_new_user.png"), full_page=True)
                print(f"  07_home_new_user.png")

                # 7b. Home Page - Returning User (/home)
                page.goto(f"{BASE_URL}/home", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "07_home_returning_user.png"), full_page=True)
                print(f"  07_home_returning_user.png")

                # 8. Profile Page with Range Lines, Projection Cone, Collab Card (/profile)
                page.goto(f"{BASE_URL}/profile", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "08_profile_full.png"), full_page=True)
                print(f"  08_profile_full.png")

                # 9. Privacy (/privacy)
                page.goto(f"{BASE_URL}/privacy", wait_until="networkidle")
                page.screenshot(path=os.path.join(folder, "09_privacy.png"), full_page=True)
                print(f"  09_privacy.png")

                # 10. Language Switch Header Component
                header_el = page.locator("header")
                if header_el.is_visible():
                    header_el.screenshot(path=os.path.join(folder, "10_lang_switch_header.png"))
                    print(f"  10_lang_switch_header.png")

                context.close()

        browser.close()
    print("\nAll real Playwright screenshots captured successfully!")


if __name__ == "__main__":
    capture_all()
