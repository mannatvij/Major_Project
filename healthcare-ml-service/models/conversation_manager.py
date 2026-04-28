"""
Multi-turn dialog state machine for the symptom triage chatbot.

Flow:
    STARTED  -- user describes symptoms -->  AWAITING_SEVERITY   (or FINAL if red-flag)
    AWAITING_SEVERITY -- severity reply -->  AWAITING_DURATION
    AWAITING_DURATION -- duration reply -->  AWAITING_ADDITIONAL
    AWAITING_ADDITIONAL -- additional reply --> FINAL (routing decision)

The state machine doesn't make the classification decision itself — it just
collects text. `app.py` feeds the combined text to the trained pipelines.
"""
import random
from dataclasses import dataclass, field

from .severity_analyzer import detect_red_flag


STATE_STARTED = "started"
STATE_AWAITING_SEVERITY = "awaiting_severity"
STATE_AWAITING_DURATION = "awaiting_duration"
STATE_AWAITING_ADDITIONAL = "awaiting_additional"
STATE_FINAL = "final"

# Short replies that mean "no further info" — treat as empty
SKIP_RESPONSES = {
    "no", "none", "nothing", "skip", "na", "n/a", "no idea", "not sure",
    "don't know", "dont know", "idk",
}

SEVERITY_PROMPTS = [
    "How severe is it? You can answer with a number from 1 (mild) to 10 (unbearable), or use words like mild, moderate, or severe.",
    "On a scale of 1 to 10, how severe is your discomfort? (Or say mild, moderate, or severe.)",
]

DURATION_PROMPTS = [
    "How long have you been experiencing this? (e.g. 'since this morning', '3 days', 'a few weeks')",
    "When did these symptoms start? You can answer in hours, days, or weeks.",
]

ADDITIONAL_PROMPTS = [
    "Are you experiencing any other symptoms alongside this? (Say 'none' if not.)",
    "Is there anything else bothering you — nausea, fever, dizziness, anything else? (Say 'none' if not.)",
]


@dataclass
class ConversationManager:
    state: str = STATE_STARTED
    main_symptoms: str = ""
    severity_text: str = ""
    duration_text: str = ""
    additional_text: str = ""
    red_flag: bool = False

    def is_ready_for_recommendation(self) -> bool:
        return self.state == STATE_FINAL

    def next_prompt(self) -> str | None:
        if self.state == STATE_AWAITING_SEVERITY:
            return random.choice(SEVERITY_PROMPTS)
        if self.state == STATE_AWAITING_DURATION:
            return random.choice(DURATION_PROMPTS)
        if self.state == STATE_AWAITING_ADDITIONAL:
            return random.choice(ADDITIONAL_PROMPTS)
        return None

    def ingest(self, user_text: str) -> None:
        user_text = (user_text or "").strip()

        if self.state == STATE_STARTED:
            self.main_symptoms = user_text
            # Red-flag shortcut: skip follow-ups and go straight to recommendation
            if detect_red_flag(user_text):
                self.red_flag = True
                self.state = STATE_FINAL
            else:
                self.state = STATE_AWAITING_SEVERITY
            return

        if self.state == STATE_AWAITING_SEVERITY:
            self.severity_text = user_text
            self.state = STATE_AWAITING_DURATION
            return

        if self.state == STATE_AWAITING_DURATION:
            self.duration_text = user_text
            self.state = STATE_AWAITING_ADDITIONAL
            return

        if self.state == STATE_AWAITING_ADDITIONAL:
            self.additional_text = "" if user_text.lower() in SKIP_RESPONSES else user_text
            self.state = STATE_FINAL
            return

    def combined_text_for_model(self) -> str:
        """Everything the classifier should see."""
        parts = [self.main_symptoms, self.severity_text, self.additional_text]
        return " ".join(p for p in parts if p).strip()

    def severity_hint_text(self) -> str:
        """The text most likely to contain a severity signal."""
        return f"{self.main_symptoms} {self.severity_text}".strip()

    def snapshot(self) -> dict:
        return {
            "state": self.state,
            "main_symptoms": self.main_symptoms,
            "severity_text": self.severity_text,
            "duration_text": self.duration_text,
            "additional_text": self.additional_text,
            "red_flag": self.red_flag,
        }

    def reset(self) -> None:
        self.state = STATE_STARTED
        self.main_symptoms = ""
        self.severity_text = ""
        self.duration_text = ""
        self.additional_text = ""
        self.red_flag = False
