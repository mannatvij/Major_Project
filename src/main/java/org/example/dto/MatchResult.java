package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchResult {

    /** Final routing target, e.g. "General Physician", "Gastroenterology" */
    private String specialization;

    private int confidenceScore;

    private List<String> matchedKeywords;

    private String responseMessage;

    /**
     * True when the bot has asked for intensity and is waiting for the patient
     * to respond before making a final routing decision.
     */
    private boolean requiresFollowUp;

    /**
     * The specialist we would route to if intensity turns out to be high.
     * Null when requiresFollowUp is false.
     */
    private String pendingCategory;
}
