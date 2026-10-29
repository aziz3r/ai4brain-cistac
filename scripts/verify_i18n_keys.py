#!/usr/bin/env python3
"""
Recursively verifies that frontend/src/locales/en.json and
frontend/src/locales/fr.json have the exact same hierarchy and keys.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "frontend" / "src" / "locales" / "en.json"
FR_PATH = ROOT / "frontend" / "src" / "locales" / "fr.json"

def get_all_keys(data, prefix=""):
    keys = set()
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            if isinstance(v, dict):
                keys.update(get_all_keys(v, full_key))
    return keys

def main():
    if not EN_PATH.exists() or not FR_PATH.exists():
        print(f"Error: Missing locale file at {EN_PATH} or {FR_PATH}")
        sys.exit(1)

    with open(EN_PATH, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    with open(FR_PATH, "r", encoding="utf-8") as f:
        fr_data = json.load(f)

    en_keys = get_all_keys(en_data)
    fr_keys = get_all_keys(fr_data)

    diff_en = en_keys - fr_keys
    diff_fr = fr_keys - en_keys

    has_error = False
    if diff_en:
        print(f"Keys present in EN but missing in FR ({len(diff_en)}):")
        for k in sorted(diff_en):
            print(f"  - {k}")
        has_error = True

    if diff_fr:
        print(f"Keys present in FR but missing in EN ({len(diff_fr)}):")
        for k in sorted(diff_fr):
            print(f"  - {k}")
        has_error = True

    if not has_error:
        print(f"SUCCESS: Both locale files match perfectly with {len(en_keys)} identical keys.")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
