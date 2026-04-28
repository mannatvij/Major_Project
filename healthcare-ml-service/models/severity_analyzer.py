"""
Rule-based severity detector used alongside the trained severity classifier.

Why both? The ML severity model sees only the bag of words and can be fooled by
phrases like "my headache is NOT severe". A tiny rule layer covers:
  * Emergency red-flag phrases (always "high")
  * Numeric 1-10 scales (explicit patient rating)
  * Negation of severity adjectives
"""
import re

EMERGENCY_RED_FLAGS = [
    "crushing chest pain", "chest pain radiating", "cannot breathe",
    "can't breathe", "difficulty breathing", "shortness of breath",
    "loss of consciousness", "unconscious", "blacked out", "face drooping",
    "slurred speech", "sudden numbness", "worst headache of my life",
    "vomiting blood", "blood in stool", "seizure", "stroke", "heart attack",
    "suicidal", "self harm", "cannot move", "can't move", "paralysis",
    "sudden vision loss",
]

SEVERITY_KEYWORDS = {
    "high": [
        "severe", "extreme", "unbearable", "worst", "agonizing",
        "excruciating", "emergency", "cannot", "can't", "unable",
        "blood", "collapse", "intense",
    ],
    "medium": [
        "moderate", "persistent", "frequent", "concerning", "bothering",
        "uncomfortable", "ongoing", "chronic", "constant",
    ],
    "low": [
        "mild", "slight", "occasional", "minor", "little", "manageable",
        "tolerable", "barely", "hardly",
    ],
}


def extract_numeric_scale(text: str) -> str | None:
    """Patient gave 'x/10' or plain 1-10 scale. Return severity bucket or None."""
    m = re.search(r"\b(\d{1,2})\s*(?:/|out of)\s*10\b", text)
    if m:
        n = int(m.group(1))
        return _bucket_from_1_to_10(n)

    m = re.search(r"\b(\d)\s*(?:/|out of)\s*5\b", text)
    if m:
        n = int(m.group(1))
        return _bucket_from_1_to_5(n)

    # Bare digit reply (1-10) — only when the reply is essentially just a number
    if re.fullmatch(r"\s*(\d{1,2})\s*\.?\s*", text):
        n = int(text.strip().rstrip("."))
        if 1 <= n <= 10:
            return _bucket_from_1_to_10(n)

    return None


def _bucket_from_1_to_10(n: int) -> str:
    if n >= 8:
        return "high"
    if n >= 5:
        return "medium"
    return "low"


def _bucket_from_1_to_5(n: int) -> str:
    if n >= 4:
        return "high"
    if n == 3:
        return "medium"
    return "low"


def detect_red_flag(text: str) -> bool:
    t = text.lower()
    return any(flag in t for flag in EMERGENCY_RED_FLAGS)


def rule_based_severity(text: str) -> str | None:
    """Return severity bucket from rules, or None if no clear signal."""
    t = text.lower()

    if detect_red_flag(t):
        return "high"

    scale = extract_numeric_scale(t)
    if scale:
        return scale

    # Negated high-severity phrases ("not severe", "no severe pain") -> bump down
    for kw in SEVERITY_KEYWORDS["high"]:
        if re.search(rf"\b(?:not|no|isn'?t|wasn'?t)\b[^.]*\b{re.escape(kw)}\b", t):
            return "low"

    for bucket, kws in SEVERITY_KEYWORDS.items():
        if any(re.search(rf"\b{re.escape(kw)}\b", t) for kw in kws):
            return bucket

    return None


def combine_severity(rule: str | None, ml: str, ml_confidence: float) -> str:
    """
    Rule wins when it fires — it's high-precision.
    Otherwise trust ML when confident, fall back to 'medium' when not.
    """
    if rule:
        return rule
    if ml_confidence >= 0.45:
        return ml
    return "medium"
