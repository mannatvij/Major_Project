# Healthcare ML Service

Python Flask microservice that provides ML-powered symptom triage for the Smart Healthcare Spring Boot backend.

## Architecture

```
Spring Boot (port 8080)  --REST-->  Flask ML Service (port 5000)  -->  RandomForest models (pickled)
```

The Java backend calls this service through `MLServiceClient`. If the Python service is unavailable, Java falls back to the rule-based `SymptomMatcher` so the chat never breaks.

## Files

| File | Purpose |
| ---- | ------- |
| `app.py` | Flask API: `/health`, `/chat/start`, `/chat/message`, `/chat/reset`, `/predict` |
| `models/conversation_manager.py` | Multi-turn dialog state machine (symptom -> severity -> duration -> additional -> recommendation) |
| `models/severity_analyzer.py` | Rule-based severity extraction used to complement the severity ML model |
| `training/train_model.py` | Builds TF-IDF + RandomForest pipelines for specialization & severity |
| `training/medical_data.csv` | 250+ labelled symptom rows |
| `training/trained_specialization_model.pkl` | Output of training (generated) |
| `training/trained_severity_model.pkl` | Output of training (generated) |
| `test_ml_service.py` | Smoke test against a running service |

## Setup

```bash
cd healthcare-ml-service
pip install -r requirements.txt

# Train (writes .pkl files into training/)
python training/train_model.py

# Run the API
python app.py
```

The service listens on `http://localhost:5000`.

## Spring Boot integration

Set in `application.properties`:

```properties
ml.service.url=http://localhost:5000
ml.service.enabled=true
```

If `ml.service.enabled=false` the Java layer uses the legacy `SymptomMatcher` only.

## Notes

- Deliberately avoids spaCy / NLTK downloads so the service spins up on any machine with stock scikit-learn. TF-IDF with scikit-learn's built-in English stopword list is sufficient for this domain.
- Sessions live in memory. For production, swap `conversations` dict for Redis or re-use the Mongo `ChatSession` the Java layer already stores.
