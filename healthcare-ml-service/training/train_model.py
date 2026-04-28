"""
Train specialization + severity classifiers on medical_data.csv.

The pipeline is a FeatureUnion of word (1-2 grams) + char_wb (3-5 grams) TF-IDF
vectors, fed into a LogisticRegression. For short medical descriptions this is
noticeably more stable than RandomForest — it handles typos ("palpatations"),
partial stems ("migrainous"), and gives well-calibrated probabilities so the
"low confidence → General Physician" fallback in app.py can actually trust the
numbers it sees.
"""

import os
import re
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "medical_data.csv")
SPEC_MODEL_PATH = os.path.join(HERE, "trained_specialization_model.pkl")
SEV_MODEL_PATH = os.path.join(HERE, "trained_severity_model.pkl")

# Lightweight medical-synonym and typo normalisation so "cant" == "cannot", etc.
_SYN = {
    r"\bcan't\b": "cannot",
    r"\bcant\b": "cannot",
    r"\bwon't\b": "will not",
    r"\bdon't\b": "do not",
    r"\bdoesnt\b": "does not",
    r"\bisnt\b": "is not",
    r"\bwasnt\b": "was not",
    r"\bhavent\b": "have not",
    r"\bpalpitations?\b": "palpitation",
    r"\bpalpatation[s]?\b": "palpitation",
    r"\bstomach\s*ache\b": "stomach ache",
    r"\bstomachache\b": "stomach ache",
    r"\btummy\b": "stomach",
    r"\bbelly\b": "stomach",
    r"\bheadaches?\b": "headache",
    r"\bmigraines?\b": "migraine",
    r"\bvomitting\b": "vomiting",
    r"\bdiarrhoea\b": "diarrhea",
    r"\bloose motion[s]?\b": "diarrhea",
    r"\bbreathlessness\b": "shortness of breath",
    r"\bbp\b": "blood pressure",
    r"\bhb\b": "hemoglobin",
    r"\bgerd\b": "acid reflux",
    r"\bviral\b": "viral infection",
    r"\bflu\b": "influenza",
}


def preprocess(text: str) -> str:
    text = (text or "").lower().strip()
    for pat, repl in _SYN.items():
        text = re.sub(pat, repl, text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def build_specialization_pipeline() -> Pipeline:
    return Pipeline([
        ("features", FeatureUnion([
            ("word", TfidfVectorizer(
                analyzer="word",
                ngram_range=(1, 2),
                min_df=1,
                sublinear_tf=True,
                stop_words="english",
                max_features=6000,
            )),
            ("char", TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(3, 5),
                min_df=1,
                sublinear_tf=True,
                max_features=4000,
            )),
        ])),
        ("clf", LogisticRegression(
            C=4.0,
            class_weight="balanced",
            max_iter=2000,
            solver="lbfgs",
            random_state=42,
        )),
    ])


def build_severity_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            stop_words="english",
            max_features=3000,
        )),
        ("clf", LogisticRegression(
            C=2.0,
            class_weight="balanced",
            max_iter=1000,
            solver="lbfgs",
            random_state=42,
        )),
    ])


def train() -> None:
    if not os.path.exists(DATA_PATH):
        print(f"[FATAL] {DATA_PATH} not found", file=sys.stderr)
        sys.exit(1)

    print(f"[1/5] Loading {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"      {len(df)} rows, {df['specialization'].nunique()} specializations")
    print(df["specialization"].value_counts().to_string())

    print("[2/5] Preprocessing text")
    df["processed"] = df["symptom_text"].apply(preprocess)
    df["additional_symptoms"] = df["additional_symptoms"].fillna("").astype(str)
    df["combined"] = (
        df["processed"]
        + " "
        + df["additional_symptoms"].apply(preprocess)
    )

    X = df["combined"].values
    y_spec = df["specialization"].values
    y_sev = df["severity"].values

    X_train, X_test, y_spec_tr, y_spec_te, y_sev_tr, y_sev_te = train_test_split(
        X, y_spec, y_sev, test_size=0.2, random_state=42, stratify=y_spec
    )

    print("[3/5] Training specialization classifier")
    spec_pipe = build_specialization_pipeline()
    spec_pipe.fit(X_train, y_spec_tr)
    spec_pred = spec_pipe.predict(X_test)
    spec_acc = accuracy_score(y_spec_te, spec_pred)

    print("[4/5] Training severity classifier")
    sev_pipe = build_severity_pipeline()
    sev_pipe.fit(X_train, y_sev_tr)
    sev_pred = sev_pipe.predict(X_test)
    sev_acc = accuracy_score(y_sev_te, sev_pred)

    print("\n=== SPECIALIZATION MODEL ===")
    print(f"Test accuracy: {spec_acc:.2%}")
    print(classification_report(y_spec_te, spec_pred, zero_division=0))

    print("=== SEVERITY MODEL ===")
    print(f"Test accuracy: {sev_acc:.2%}")
    print(classification_report(y_sev_te, sev_pred, zero_division=0))

    # Refit on full data so the deployed model uses every labelled example
    print("[5/5] Refitting on full dataset and persisting models")
    spec_pipe.fit(X, y_spec)
    sev_pipe.fit(X, y_sev)

    joblib.dump(spec_pipe, SPEC_MODEL_PATH)
    joblib.dump(sev_pipe, SEV_MODEL_PATH)
    print(f"      Wrote {SPEC_MODEL_PATH}")
    print(f"      Wrote {SEV_MODEL_PATH}")
    print("[done]")


if __name__ == "__main__":
    train()
