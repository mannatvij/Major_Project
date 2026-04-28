"""
Flask API for the Smart Healthcare symptom-triage chatbot.

Endpoints:
    GET  /health                      healthcheck
    POST /chat/start      {sessionId} welcome message, resets server-side state
    POST /chat/message    {sessionId,message}  next prompt or final recommendation
    POST /chat/reset/<sessionId>      clears state for that session
    POST /predict         {text}      one-shot classification (no conversation)

Contract with the Java backend:
    * Java owns session identity (it passes its Mongo chat_session._id as sessionId).
    * Python stores only the in-memory ConversationManager keyed by that sessionId.
    * Every response includes an 'isComplete' flag — Java only shows doctor cards
      when isComplete == true.
"""
import os
import sys
from threading import Lock

import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from models.conversation_manager import ConversationManager
from models.severity_analyzer import (
    combine_severity,
    detect_red_flag,
    rule_based_severity,
)
from training.train_model import preprocess

SPEC_MODEL_PATH = os.path.join(HERE, "training", "trained_specialization_model.pkl")
SEV_MODEL_PATH = os.path.join(HERE, "training", "trained_severity_model.pkl")

app = Flask(__name__)
CORS(app)

print("[startup] Loading ML models...")
if not (os.path.exists(SPEC_MODEL_PATH) and os.path.exists(SEV_MODEL_PATH)):
    print(
        f"[FATAL] Trained models not found. Run `python training/train_model.py` first.",
        file=sys.stderr,
    )
    sys.exit(1)

specialization_model = joblib.load(SPEC_MODEL_PATH)
severity_model = joblib.load(SEV_MODEL_PATH)
print("[startup] Models loaded.")

conversations: dict[str, ConversationManager] = {}
_conv_lock = Lock()


# ─── Core prediction ─────────────────────────────────────────────────────────


# Pull the word-level TF-IDF out of the FeatureUnion so we can measure whether
# the input contains any known medical vocabulary (char n-grams would fire on
# arbitrary letter sequences and over-estimate coverage).
_SPEC_FEATURES = specialization_model.named_steps["features"]
_SPEC_WORD_VECTORIZER = dict(_SPEC_FEATURES.transformer_list)["word"]


def _vocabulary_coverage(processed_text: str) -> float:
    """
    Sum of TF-IDF weights over known word tokens. Near-zero means the patient
    used only words the model has never seen (gibberish, greetings, etc.).
    """
    vec = _SPEC_WORD_VECTORIZER.transform([processed_text])
    return float(vec.sum())


def predict(combined_text: str, severity_hint: str) -> dict:
    """Run both classifiers and return a structured result."""
    processed = preprocess(combined_text) or "unknown"
    vocab_weight = _vocabulary_coverage(processed)

    spec_proba = specialization_model.predict_proba([processed])[0]
    spec_classes = specialization_model.classes_
    top_idx = np.argsort(spec_proba)[::-1][:3]
    top_recommendations = [
        {"specialization": spec_classes[i], "confidence": float(spec_proba[i])}
        for i in top_idx
    ]
    primary = top_recommendations[0]["specialization"]
    top_conf = top_recommendations[0]["confidence"]
    second_conf = top_recommendations[1]["confidence"] if len(top_recommendations) > 1 else 0.0
    margin = top_conf - second_conf

    sev_proba = severity_model.predict_proba([processed])[0]
    sev_classes = list(severity_model.classes_)
    sev_ml = sev_classes[int(np.argmax(sev_proba))]
    sev_conf = float(np.max(sev_proba))

    rule_sev = rule_based_severity(severity_hint or combined_text)
    severity = combine_severity(rule_sev, sev_ml, sev_conf)
    red_flag = detect_red_flag(combined_text) or detect_red_flag(severity_hint)

    # Low-confidence fallback. Two signals:
    #   * vocab_weight: sum of TF-IDF word-weights — near zero means the input
    #     uses words the model has never seen (gibberish, greetings, etc.).
    #   * top_conf + margin: the classifier is itself unsure.
    # Only route to General Physician when *both* fire — otherwise a genuinely
    # sharp prediction like "migraine with aura" isn't second-guessed.
    low_vocab = vocab_weight < 0.35
    weak_pick = top_conf < 0.30 and margin < 0.08
    low_confidence = (not red_flag) and (low_vocab or weak_pick)
    if low_confidence:
        primary = "General Physician"
        top_recommendations = [
            {"specialization": "General Physician", "confidence": top_conf},
            *[r for r in top_recommendations if r["specialization"] != "General Physician"],
        ][:3]

    return {
        "primary_specialization": primary,
        "top_recommendations": top_recommendations,
        "severity": severity,
        "severity_ml": sev_ml,
        "severity_confidence": sev_conf,
        "severity_source": "rule" if rule_sev else "ml",
        "low_confidence": low_confidence,
        "needs_emergency": red_flag or (severity == "high" and top_conf >= 0.35),
    }


def format_final_response(prediction: dict, red_flag: bool) -> str:
    spec = prediction["primary_specialization"]
    severity = prediction["severity"]
    low_conf = prediction.get("low_confidence", False)

    severity_line = {
        "high": "These symptoms may indicate a serious condition that needs prompt medical attention.",
        "medium": "Your symptoms warrant a proper medical evaluation soon.",
        "low": "Your symptoms appear mild, but a check-up is still a good idea.",
    }[severity]

    lines = [severity_line, ""]

    if low_conf:
        lines.append(
            "I couldn't clearly identify a specialist from your description, "
            "so I'd recommend starting with a **General Physician** — they can examine you "
            "and refer you to a specialist if needed."
        )
    else:
        lines.append(f"Based on what you've told me, I recommend consulting a **{spec}** specialist.")

    if red_flag or prediction["needs_emergency"]:
        lines.append("")
        lines.append("If your symptoms worsen or you feel unsafe, please seek emergency care immediately.")

    lines.append("")
    lines.append(f"Here are available **{spec}** doctors you can book:")
    return "\n".join(lines)


# ─── Routes ──────────────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "healthcare-ml",
        "specializations": list(specialization_model.classes_),
        "active_sessions": len(conversations),
    })


@app.route("/chat/start", methods=["POST"])
def chat_start():
    data = request.get_json(force=True) or {}
    session_id = data.get("sessionId")
    if not session_id:
        return jsonify({"error": "sessionId required"}), 400

    with _conv_lock:
        conversations[session_id] = ConversationManager()

    return jsonify({
        "sessionId": session_id,
        "message": (
            "Hello! 👋 I'm your AI health assistant.\n\n"
            "Please describe your symptoms in your own words — be as specific as you can. "
            "For example: *'I've had a sharp headache behind my eyes for two days, with some nausea.'*"
        ),
        "isComplete": False,
        "state": "started",
    })


@app.route("/chat/message", methods=["POST"])
def chat_message():
    data = request.get_json(force=True) or {}
    session_id = data.get("sessionId")
    user_message = data.get("message", "")
    if not session_id:
        return jsonify({"error": "sessionId required"}), 400

    with _conv_lock:
        conv = conversations.get(session_id)
        if conv is None:
            conv = ConversationManager()
            conversations[session_id] = conv

    conv.ingest(user_message)

    if not conv.is_ready_for_recommendation():
        return jsonify({
            "sessionId": session_id,
            "message": conv.next_prompt(),
            "isComplete": False,
            "state": conv.state,
        })

    prediction = predict(conv.combined_text_for_model(), conv.severity_hint_text())
    message = format_final_response(prediction, conv.red_flag)

    return jsonify({
        "sessionId": session_id,
        "message": message,
        "isComplete": True,
        "state": conv.state,
        "recommendations": prediction["top_recommendations"],
        "recommendedSpecialization": prediction["primary_specialization"],
        "severity": prediction["severity"],
        "severityConfidence": prediction["severity_confidence"],
        "severitySource": prediction["severity_source"],
        "needsEmergency": prediction["needs_emergency"],
        "collected": conv.snapshot(),
    })


@app.route("/chat/reset/<session_id>", methods=["POST"])
def chat_reset(session_id: str):
    with _conv_lock:
        conversations.pop(session_id, None)
    return jsonify({"sessionId": session_id, "message": "reset"})


@app.route("/predict", methods=["POST"])
def one_shot_predict():
    """Stateless endpoint — useful for Java fallback or tests."""
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "text required"}), 400
    prediction = predict(text, text)
    return jsonify(prediction)


if __name__ == "__main__":
    print("[startup] Healthcare ML Service on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
