"""
End-to-end smoke test against a running Flask service at http://localhost:5000.

Runs real multi-turn conversations and prints the expected/predicted
specialization for a handful of canonical cases, plus a single-turn
/predict accuracy sweep.
"""
import sys
import time
import uuid

import requests

BASE = "http://localhost:5000"


def wait_for_service(timeout_s: int = 20) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE}/health", timeout=2)
            if r.ok:
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(0.5)
    return False


def run_conversation(symptoms: str, severity: str, duration: str, additional: str) -> dict:
    sid = str(uuid.uuid4())
    requests.post(f"{BASE}/chat/start", json={"sessionId": sid}, timeout=5)

    r = requests.post(f"{BASE}/chat/message", json={"sessionId": sid, "message": symptoms}, timeout=5).json()
    if r.get("isComplete"):
        return r  # red-flag shortcut
    r = requests.post(f"{BASE}/chat/message", json={"sessionId": sid, "message": severity}, timeout=5).json()
    if r.get("isComplete"):
        return r
    r = requests.post(f"{BASE}/chat/message", json={"sessionId": sid, "message": duration}, timeout=5).json()
    if r.get("isComplete"):
        return r
    r = requests.post(f"{BASE}/chat/message", json={"sessionId": sid, "message": additional}, timeout=5).json()
    return r


CONVERSATIONAL_CASES = [
    {
        "name": "Classic heart attack pattern",
        "symptoms": "severe chest pain radiating to my left arm",
        "severity": "9/10 unbearable",
        "duration": "started 30 minutes ago",
        "additional": "sweating and nausea",
        "expected_specialization": "Cardiology",
        "expected_severity": "high",
    },
    {
        "name": "Migraine with aura",
        "symptoms": "pounding headache with vision problems",
        "severity": "severe",
        "duration": "3 hours",
        "additional": "nausea and light sensitivity",
        "expected_specialization": "Neurology",
        "expected_severity": "high",
    },
    {
        "name": "Chronic back pain",
        "symptoms": "chronic back pain when sitting",
        "severity": "moderate 5/10",
        "duration": "past 2 months",
        "additional": "stiffness in the morning",
        "expected_specialization": "Orthopedics",
        "expected_severity": "medium",
    },
    {
        "name": "Mild cold",
        "symptoms": "mild cold and runny nose",
        "severity": "mild",
        "duration": "2 days",
        "additional": "some sneezing",
        "expected_specialization": "General Physician",
        "expected_severity": "low",
    },
    {
        "name": "Severe skin rash",
        "symptoms": "severe skin rash spreading all over my back",
        "severity": "very bad",
        "duration": "started yesterday",
        "additional": "intense itching and burning",
        "expected_specialization": "Dermatology",
        "expected_severity": "high",
    },
    {
        "name": "Anxiety and panic",
        "symptoms": "severe anxiety with panic attacks",
        "severity": "high",
        "duration": "worsening for a month",
        "additional": "insomnia and racing thoughts",
        "expected_specialization": "Psychiatry",
        "expected_severity": "high",
    },
    {
        "name": "Child with fever",
        "symptoms": "my child has high fever and a rash",
        "severity": "severe",
        "duration": "since last night",
        "additional": "lethargy and vomiting",
        "expected_specialization": "Pediatrics",
        "expected_severity": "high",
    },
    {
        "name": "Stomach pain",
        "symptoms": "severe stomach pain and vomiting",
        "severity": "8/10",
        "duration": "4 hours",
        "additional": "none",
        "expected_specialization": "Gastroenterology",
        "expected_severity": "high",
    },
    {
        "name": "Ear infection",
        "symptoms": "severe ear pain with discharge",
        "severity": "very painful",
        "duration": "2 days",
        "additional": "some hearing loss",
        "expected_specialization": "ENT",
        "expected_severity": "high",
    },
    {
        "name": "Blurry vision",
        "symptoms": "blurry vision getting worse over time",
        "severity": "moderate",
        "duration": "few weeks",
        "additional": "eye strain and headaches",
        "expected_specialization": "Ophthalmology",
        "expected_severity": "medium",
    },
]


def run_conversational_suite() -> tuple[int, int]:
    print("\n=== Conversational end-to-end tests ===")
    passed_spec = 0
    passed_sev = 0
    for case in CONVERSATIONAL_CASES:
        result = run_conversation(
            case["symptoms"], case["severity"], case["duration"], case["additional"]
        )
        if not result.get("isComplete"):
            print(f"  [{case['name']}] ❌ conversation did not complete: {result}")
            continue

        predicted_spec = result.get("recommendedSpecialization")
        predicted_sev = result.get("severity")
        spec_ok = predicted_spec == case["expected_specialization"]
        sev_ok = predicted_sev == case["expected_severity"]
        passed_spec += int(spec_ok)
        passed_sev += int(sev_ok)
        mark_s = "PASS" if spec_ok else "FAIL"
        mark_v = "PASS" if sev_ok else "FAIL"
        print(
            f"  [{case['name']}]\n"
            f"    spec {mark_s} expected={case['expected_specialization']:<20} got={predicted_spec}\n"
            f"    sev  {mark_v} expected={case['expected_severity']:<6} got={predicted_sev}"
        )

    print(
        f"\n  Specialization: {passed_spec}/{len(CONVERSATIONAL_CASES)}"
        f"   Severity: {passed_sev}/{len(CONVERSATIONAL_CASES)}"
    )
    return passed_spec, passed_sev


ONE_SHOT_CASES = [
    ("sudden crushing chest pain sweating", "Cardiology"),
    ("migraine nausea sensitivity to light", "Neurology"),
    ("twisted ankle swelling after football", "Orthopedics"),
    ("eczema flare up itching", "Dermatology"),
    ("fever 102 body ache cough", "General Physician"),
    ("acid reflux and heartburn after meals", "Gastroenterology"),
    ("sinus infection blocked nose headache", "ENT"),
    ("red painful eye with discharge", "Ophthalmology"),
    ("baby won't stop crying and has fever", "Pediatrics"),
    ("panic attacks and racing heart", "Psychiatry"),
    # Regression — user reported this being misclassified as Psychiatry.
    ("headache on scale of 3 out of 10 for a week", "Neurology"),
    ("mild headache for a few days", "Neurology"),
]


def run_one_shot_suite() -> int:
    print("\n=== One-shot /predict sweep ===")
    passed = 0
    for text, expected in ONE_SHOT_CASES:
        r = requests.post(f"{BASE}/predict", json={"text": text}, timeout=5).json()
        got = r.get("primary_specialization")
        conf = r.get("top_recommendations", [{}])[0].get("confidence", 0.0)
        sev = r.get("severity")
        ok = got == expected
        passed += int(ok)
        mark = "PASS" if ok else "FAIL"
        print(f"  {mark} '{text}' -> {got} ({conf:.0%}) sev={sev}  expected={expected}")
    print(f"\n  Accuracy: {passed}/{len(ONE_SHOT_CASES)}")
    return passed


if __name__ == "__main__":
    if not wait_for_service():
        print("[FATAL] ML service not reachable at http://localhost:5000", file=sys.stderr)
        sys.exit(1)

    s_passed, v_passed = run_conversational_suite()
    o_passed = run_one_shot_suite()

    total_passed = s_passed + o_passed
    total = len(CONVERSATIONAL_CASES) + len(ONE_SHOT_CASES)
    print(f"\nOverall specialization accuracy: {total_passed}/{total} ({total_passed/total:.0%})")
    sys.exit(0 if total_passed >= int(0.8 * total) else 1)
