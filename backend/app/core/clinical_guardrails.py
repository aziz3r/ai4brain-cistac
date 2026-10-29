"""
AI4BRAIN Clinical Vocabulary Guardrails
Strict non-clinical compliance enforcement for IEEE CISTAC 1.0.
Detects medical, psychiatric, diagnostic, and pathological terminology.
"""

import re
from typing import List, Tuple

FORBIDDEN_CLINICAL_TERMS = [
    # English terms
    r"\badhd\b", r"\badd\b", r"\bautism\b", r"\basperger\b", r"\bdyslexi[a-z]*\b",
    r"\bdyscalculi[a-z]*\b", r"\bdyspraxi[a-z]*\b", r"\bdepressi[a-z]*\b",
    r"\banxiety\b", r"\bbipolar\b", r"\bschizo[a-z]*\b", r"\bpatient[s]?\b",
    r"\bpatholog[a-z]*\b", r"\bdiagnos[a-z]*\b", r"\bsyndrome[s]?\b",
    r"\bdisorder[s]?\b", r"\bimpairment[s]?\b", r"\bdeficit[s]?\b",
    r"\bclinical\b", r"\btherapy\b", r"\btherapeutic\b", r"\btreatment[s]?\b",
    r"\bcure[s]?\b", r"\bmedicat[a-z]*\b", r"\bpharma[a-z]*\b", r"\bdementia\b",
    r"\balzheimer[a-z]*\b", r"\bneurodiverg[a-z]*\b", r"\bhandicap[s]?\b",
    r"\bmental health condition\b", r"\bpsychiatr[a-z]*\b",
    
    # French terms (from contracts/i18n_copy.json guardrails_fr_banned)
    r"\btdah\b", r"\bautisme\b", r"\bdyslexi[a-zà-ÿ]*\b", r"\bdyscalculi[a-zà-ÿ]*\b",
    r"\bd[ée]pressi[a-zà-ÿ]*\b", r"\banxi[ée]t[ée](\s+g[ée]n[ée]ralis[ée]e)?\b",
    r"\btrouble[s]?\b", r"\bd[ée]ficit[s]?\b",
    r"\bpathologie[s]?\b", r"\bpathologique[s]?\b", r"\bdiagnostic[s]?\b",
    r"\bsyndrome[s]?\b", r"\bpatient[s]?\b",
    r"\bth[ée]rapie[s]?\b", r"\btraitement[s]?\b", r"\bclinique[s]?\b",
    r"\bpsychiatrique[s]?\b", r"\bsympt[oô]me[s]?\b", r"\bhandicap[s]?\b"
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in FORBIDDEN_CLINICAL_TERMS]


def find_clinical_terms(text: str) -> List[str]:
    """Returns all forbidden clinical terms found in the input text."""
    matches = []
    for pattern in COMPILED_PATTERNS:
        found = pattern.findall(text)
        if found:
            matches.extend(found)
    return list(set(matches))


def contains_clinical_term(text: str) -> bool:
    """Returns True if any forbidden clinical or diagnostic term is present."""
    return len(find_clinical_terms(text)) > 0


def sanitize_or_verify_text(text: str) -> Tuple[bool, List[str]]:
    """Returns (is_valid, detected_violations)."""
    violations = find_clinical_terms(text)
    return (len(violations) == 0, violations)
