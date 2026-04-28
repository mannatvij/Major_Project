package org.example.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response shape from the Python ML service (app.py).
 * Maps directly to the JSON body of {@code /chat/message} and {@code /chat/start}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MLChatResponse {

    private String  sessionId;
    private String  message;

    // Lombok turns `isComplete` into setComplete()/isComplete(), which Jackson
    // maps to JSON key "complete". The Python service emits "isComplete", so
    // we pin the JSON name explicitly — otherwise the doctor lookup below
    // silently never fires on the final turn.
    @JsonProperty("isComplete")
    private boolean isComplete;

    private String  state;

    private String recommendedSpecialization;
    private String severity;
    private Double severityConfidence;
    private String severitySource;
    private Boolean needsEmergency;

    private List<Map<String, Object>> recommendations;
    private Map<String, Object>       collected;
}
