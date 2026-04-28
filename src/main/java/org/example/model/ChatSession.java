package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chat_sessions")
public class ChatSession {

    @Id
    private String id;

    @Indexed
    private String patientId;

    private List<Message> messages = new ArrayList<>();

    private LocalDateTime timestamp;

    /** Specialization recommended by the AI triage chatbot, e.g. "Cardiology" */
    private String recommendedSpecialization;

    /** Keywords detected during this session */
    private List<String> detectedSymptoms = new ArrayList<>();

    /** False once the patient starts a new session */
    private boolean active = true;

    /**
     * True when the bot asked for intensity and is waiting for the patient's reply
     * before making the final routing decision.
     */
    private boolean awaitingIntensity;

    /**
     * Specialist we would route to if the patient reports high intensity.
     * Null when awaitingIntensity is false.
     */
    private String pendingSpecialization;

    /**
     * Keywords matched in the previous turn — carried forward to the intensity response.
     */
    private List<String> pendingKeywords = new ArrayList<>();

    /**
     * True when this session is being driven by the Python ML service.
     * False means the rule-based {@code SymptomMatcher} is handling it.
     */
    private boolean useMlService;
}
