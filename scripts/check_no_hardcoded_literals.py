#!/usr/bin/env python3
"""
CI Script: Verify zero accented characters exist inside JSX text or string literals
in all .tsx / .ts files under frontend/src/ (excluding frontend/src/locales/).
"""

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "frontend" / "src"

ACCENTED_RE = re.compile(r'[éèêëàâäôöûüïîçÉÈÊËÀÂÄÔÖÛÜÏÎÇ«»]')

def check_file(path: Path) -> list:
    violations = []
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_multiline_comment = False
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()

        # Handle multi-line comment state
        if in_multiline_comment:
            if "*/" in stripped:
                in_multiline_comment = False
            continue
        if stripped.startswith("/*"):
            if "*/" not in stripped:
                in_multiline_comment = True
            continue

        # Single-line comment
        if stripped.startswith("//") or stripped.startswith("*"):
            continue

        # Check line for accents
        if ACCENTED_RE.search(line):
            # Check if accent is inside a comment on that line
            if "//" in line:
                code_part, comment_part = line.split("//", 1)
                if not ACCENTED_RE.search(code_part):
                    continue
            violations.append((idx, stripped))

    return violations

def main():
    failed = False
    total_files = 0
    total_violations = 0

    for root, dirs, files in os.walk(SRC_DIR):
        if "locales" in root:
            continue
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts"):
                total_files += 1
                p = Path(root) / file
                v = check_file(p)
                if v:
                    failed = True
                    rel_p = p.relative_to(ROOT)
                    print(f"\n[FAIL] {rel_p}:")
                    for line_num, code in v:
                        print(f"  L{line_num}: {code}")
                        total_violations += 1

    if failed:
        print(f"\nFAILED: Found {total_violations} accented characters in {total_files} files.")
        sys.exit(1)
    else:
        print(f"\nSUCCESS: Checked {total_files} files. Zero accented characters in JSX/literals.")
        sys.exit(0)

if __name__ == "__main__":
    main()
