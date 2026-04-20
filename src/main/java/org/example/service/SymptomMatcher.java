package org.example.service;

import org.example.dto.MatchResult;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Hospital-style triage engine — three routing tiers:
 *
 *  1. Emergency   → always route directly to the relevant specialist (no intensity check)
 *  2. GP-Direct   → always route to General Physician (common cold/flu/fever symptoms)
 *  3. Conditional → ask intensity first, then decide (mild → GP, severe → specialist)
 *  4. Always-Spec → Psychiatry, Pediatrics — bypass GP regardless of intensity
 */
@Service
public class SymptomMatcher {

    private static final String GP = "General Physician";

    // ─── 1. Emergency bucket ─────────────────────────────────────────────────
    // Serious/acute — route to specialist immediately, skip intensity question

    private static final Map<String, List<String>> EMERGENCY = new LinkedHashMap<>();
    static {
        EMERGENCY.put("Cardiology", List.of(
            "chest pain", "heart attack", "cardiac arrest", "chest pressure",
            "angina", "radiating arm pain", "left arm pain", "jaw pain",
            "heart palpitation", "irregular heartbeat", "palpitation",
            "shortness of breath", "cardiac", "heart rate"
        ));
        EMERGENCY.put("Neurology", List.of(
            "stroke", "paralysis", "seizure", "blackout", "loss of consciousness",
            "face drooping", "slurred speech", "sudden numbness", "sudden confusion",
            "sudden vision loss"
        ));
    }

    // ─── 2. GP-Direct bucket ─────────────────────────────────────────────────
    // Routine / self-limiting — General Physician is the right first stop

    private static final List<String> GP_DIRECT = List.of(
        "fever", "cold", "cough", "flu", "sore throat", "runny nose",
        "sneezing", "body ache", "body pain", "chills", "malaise",
        "general weakness", "fatigue", "tired", "weakness", "viral",
        "blocked nose", "nasal discharge", "temperature", "throat infection",
        "common cold", "mild fever"
    );

    // ─── 3. Conditional bucket ───────────────────────────────────────────────
    // Ambiguous — could be GP or specialist depending on severity

    private static final Map<String, List<String>> CONDITIONAL = new LinkedHashMap<>();
    static {
        CONDITIONAL.put("Neurology", List.of(
            "headache", "migraine", "dizziness", "vertigo", "head pain",
            "numbness", "tingling", "tremor", "memory loss", "confusion",
            "brain", "fainting"
        ));
        CONDITIONAL.put("Gastroenterology", List.of(
            "stomach pain", "nausea", "vomiting", "diarrhea", "constipation",
            "acidity", "heartburn", "indigestion", "abdominal pain", "bloating",
            "stomach ache", "food poisoning", "loose motion", "gas", "ibs", "bowel"
        ));
        CONDITIONAL.put("Orthopedics", List.of(
            "back pain", "joint pain", "knee pain", "shoulder pain",
            "bone pain", "arthritis", "muscle pain", "sprain", "hip pain",
            "neck pain", "ankle pain", "sports injury", "stiff joint",
            "spine", "slip disc", "swollen knee"
        ));
        CONDITIONAL.put("Dermatology", List.of(
            "rash", "acne", "eczema", "itching", "hives", "psoriasis",
            "skin infection", "allergic reaction", "burning skin",
            "dry skin", "dermatitis", "blister", "fungal", "pimple",
            "skin redness", "mole", "wart"
        ));
        CONDITIONAL.put("ENT", List.of(
            "ear pain", "throat pain", "hearing loss", "tinnitus",
            "sinus", "ear infection", "tonsillitis", "hoarse voice", "earache",
            "ear ringing", "difficulty swallowing", "nose bleed", "blocked ear",
            "nasal congestion", "snoring", "stuffy nose"
        ));
        CONDITIONAL.put("Ophthalmology", List.of(
            "eye pain", "vision problem", "blurry vision", "red eyes",
            "eye infection", "pink eye", "watery eyes", "eye strain",
            "double vision", "itchy eyes", "eye discharge", "sight problem",
            "cataract", "glaucoma"
        ));
    }

    // ─── 4. Always-Specialist bucket ─────────────────────────────────────────
    // Specific enough that a GP referral would just delay care

    private static final Map<String, List<String>> ALWAYS_SPECIALIST = new LinkedHashMap<>();
    static {
        ALWAYS_SPECIALIST.put("Psychiatry", List.of(
            "anxiety", "depression", "stress", "panic attack", "mental health",
            "mood swing", "hopeless", "suicidal", "bipolar", "ocd", "ptsd",
            "psychosis", "sleep disorder", "hallucination", "phobia",
            "overthinking", "nervousness", "insomnia"
        ));
        ALWAYS_SPECIALIST.put("Pediatrics", List.of(
            "child", "infant", "baby", "kid", "toddler", "newborn",
            "vaccination", "pediatric", "my son", "my daughter", "children"
        ));
    }

    // ─── Advice snippets per specialization ──────────────────────────────────

    private static final Map<String, String> ADVICE = Map.ofEntries(
        Map.entry("Cardiology",        "⚠️ If you experience severe chest pain, call emergency services immediately."),
        Map.entry("Neurology",         "💡 Note when symptoms start and how long they last — this is vital for diagnosis."),
        Map.entry("Orthopedics",       "💡 Rest the affected area and apply ice to reduce swelling."),
        Map.entry("Dermatology",       "💡 Avoid scratching; keep the skin clean and dry."),
        Map.entry("General Physician", "💡 Stay hydrated, rest well, and monitor your temperature."),
        Map.entry("Gastroenterology",  "💡 Stay hydrated and avoid heavy, spicy, or oily meals for now."),
        Map.entry("ENT",               "💡 Warm salt-water gargles can ease throat and sinus discomfort."),
        Map.entry("Ophthalmology",     "💡 Avoid rubbing your eyes and limit screen exposure."),
        Map.entry("Pediatrics",        "💡 Monitor the child's temperature and keep them comfortable."),
        Map.entry("Psychiatry",        "💡 Seeking help for mental health is a sign of strength, not weakness.")
    );

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * First turn: analyse the patient's message and decide routing.
     * If {@code requiresFollowUp} is true, the caller must ask for intensity
     * and then call {@link #resolveWithIntensity}.
     */
    public MatchResult analyze(String userInput) {
        String text = userInput.toLowerCase(Locale.ROOT).trim();

        // 1 — Emergency: route directly, no intensity check
        for (var entry : EMERGENCY.entrySet()) {
            List<String> hits = matchAll(text, entry.getValue());
            if (!hits.isEmpty()) {
                String spec = entry.getKey();
                String msg = "⚠️ **These symptoms may indicate a serious condition.**\n\n" +
                    "Based on what you described (" + joinKeywords(hits) + "), " +
                    "you should see a **" + spec + "** specialist as soon as possible — " +
                    "do not wait for symptoms to worsen.\n\n" +
                    ADVICE.getOrDefault(spec, "") + "\n\n" +
                    "Would you like to see available **" + spec + "** doctors?";
                return new MatchResult(spec, 95, hits, msg, false, null);
            }
        }

        // 2 — Always-specialist (Psychiatry, Pediatrics)
        for (var entry : ALWAYS_SPECIALIST.entrySet()) {
            List<String> hits = matchAll(text, entry.getValue());
            if (!hits.isEmpty()) {
                String spec = entry.getKey();
                String msg = "Based on your description (" + joinKeywords(hits) + "), " +
                    "I recommend consulting a **" + spec + "** specialist directly.\n\n" +
                    ADVICE.getOrDefault(spec, "") + "\n\n" +
                    "Would you like to see available **" + spec + "** doctors?";
                return new MatchResult(spec, 80, hits, msg, false, null);
            }
        }

        // 3 — GP-direct: common cold / flu / fever → no specialist needed
        List<String> gpHits = matchAll(text, GP_DIRECT);
        if (!gpHits.isEmpty()) {
            String msg = "Based on your symptoms (" + joinKeywords(gpHits) + "), " +
                "these are typically managed by a **General Physician**.\n\n" +
                "You don't need a specialist right away — rest, hydration, and basic medication " +
                "usually resolve these.\n\n" +
                ADVICE.get(GP) + "\n\n" +
                "Would you like to see available **General Physician** doctors?";
            return new MatchResult(GP, 70, gpHits, msg, false, null);
        }

        // 4 — Conditional: ask intensity before routing
        for (var entry : CONDITIONAL.entrySet()) {
            List<String> hits = matchAll(text, entry.getValue());
            if (!hits.isEmpty()) {
                String spec = entry.getKey();
                String msg = "I can see you're experiencing **" + joinKeywords(hits) + "**.\n\n" +
                    "To recommend the right doctor, please rate the severity:\n\n" +
                    "**1** – Very mild, barely noticeable\n" +
                    "**2** – Mild, manageable without much discomfort\n" +
                    "**3** – Moderate, affecting daily routine\n" +
                    "**4** – Quite severe, hard to ignore\n" +
                    "**5** – Very severe / unbearable\n\n" +
                    "*(Reply with a number 1–5, or say **mild**, **moderate**, or **severe**)*";
                return new MatchResult(spec, 60, hits, msg, true, spec);
            }
        }

        // 5 — Fallback
        String msg = "I couldn't identify specific symptoms from your description. " +
            "A **General Physician** can do a thorough evaluation and refer you " +
            "to a specialist if needed.\n\n" +
            ADVICE.get(GP) + "\n\n" +
            "Would you like to see available **General Physician** doctors?";
        return new MatchResult(GP, 10, Collections.emptyList(), msg, false, null);
    }

    /**
     * Second turn: the patient just replied with their intensity (scale 1–5).
     *   1–2  → General Physician (mild)
     *   3    → General Physician, mention specialist referral if needed (moderate)
     *   4–5  → Specialist directly (severe)
     */
    public MatchResult resolveWithIntensity(String userInput,
                                            String pendingSpec,
                                            List<String> keywords) {
        int intensity = parseIntensity(userInput.toLowerCase(Locale.ROOT).trim());

        if (intensity >= 4) {
            // 4 or 5 → route to specialist
            String msg = "With a severity of **" + intensity + "/5**, your symptoms are serious enough " +
                "to warrant a **" + pendingSpec + "** specialist.\n\n" +
                ADVICE.getOrDefault(pendingSpec, "") + "\n\n" +
                "Would you like to see available **" + pendingSpec + "** doctors?";
            return new MatchResult(pendingSpec, 85, keywords, msg, false, null);

        } else if (intensity == 3) {
            // 3 → moderate, start with GP, escalate if needed
            String msg = "At severity **3/5**, a **General Physician** is the right first stop. " +
                "They can assess you and refer you to a **" + pendingSpec + "** specialist if needed.\n\n" +
                ADVICE.get(GP) + "\n\n" +
                "Would you like to see available **General Physician** doctors?";
            return new MatchResult(GP, 65, keywords, msg, false, null);

        } else {
            // 1 or 2 → mild, GP is sufficient
            String msg = "At severity **" + intensity + "/5**, your symptoms are mild. " +
                "A **General Physician** can handle this — no specialist needed right now.\n\n" +
                ADVICE.get(GP) + "\n\n" +
                "Would you like to see available **General Physician** doctors?";
            return new MatchResult(GP, 70, keywords, msg, false, null);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /** Return every keyword from {@code candidates} that appears in {@code text}. */
    private List<String> matchAll(String text, List<String> candidates) {
        List<String> hits = new ArrayList<>();
        for (String kw : candidates) {
            if (text.contains(kw)) hits.add(kw);
        }
        return hits;
    }

    /** Format up to 3 keywords for display. */
    private String joinKeywords(List<String> keywords) {
        List<String> shown = keywords.subList(0, Math.min(3, keywords.size()));
        String joined = String.join(", ", shown);
        return keywords.size() > 3 ? joined + ", …" : joined;
    }

    /**
     * Parse an intensity on the 1–5 scale from free text.
     * Handles digits 1–5 directly; maps verbal descriptors to that scale.
     * Defaults to 3 (moderate) when nothing can be parsed.
     */
    private int parseIntensity(String text) {
        // Explicit digit — check 5 down to 1 so longer matches win
        if (text.contains("5")) return 5;
        if (text.contains("4")) return 4;
        if (text.contains("3")) return 3;
        if (text.contains("2")) return 2;
        if (text.contains("1")) return 1;

        // Verbal → 5-point mapping
        if (text.contains("unbearable") || text.contains("extreme") ||
            text.contains("worst") || text.contains("very severe") ||
            text.contains("critical") || text.contains("cannot bear") ||
            text.contains("can't bear")) return 5;

        if (text.contains("severe") || text.contains("very bad") ||
            text.contains("really bad") || text.contains("intense") ||
            text.contains("high") || text.contains("strong") ||
            text.contains("significant") || text.contains("bad")) return 4;

        if (text.contains("moderate") || text.contains("medium") ||
            text.contains("average") || text.contains("manageable") ||
            text.contains("okay") || text.contains("ok") ||
            text.contains("not great")) return 3;

        if (text.contains("mild") || text.contains("slight") ||
            text.contains("minor") || text.contains("little") ||
            text.contains("low") || text.contains("not that bad") ||
            text.contains("bearable") || text.contains("tolerable")) return 2;

        if (text.contains("very mild") || text.contains("barely") ||
            text.contains("hardly") || text.contains("almost nothing")) return 1;

        // Default — treat as moderate
        return 3;
    }
}
