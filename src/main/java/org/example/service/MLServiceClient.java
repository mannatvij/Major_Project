package org.example.service;

import lombok.extern.slf4j.Slf4j;
import org.example.dto.MLChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Thin HTTP client for the Python ML service (healthcare-ml-service/app.py).
 *
 * <p>Kept intentionally stateless — all session state lives in the Python
 * process, keyed by the Spring-side {@code ChatSession._id}.
 *
 * <p>Failure handling: every call returns a nullable {@link MLChatResponse}.
 * {@code null} means the ML service is unreachable and the caller should fall
 * back to the rule-based {@link SymptomMatcher}. A lightweight circuit-breaker
 * prevents hammering the service when it's down.
 */
@Service
@Slf4j
public class MLServiceClient {

    private final RestTemplate restTemplate;
    private final String       baseUrl;
    private final boolean      enabled;

    private final AtomicBoolean circuitOpen = new AtomicBoolean(false);
    private volatile long       circuitOpenedAt = 0L;
    private static final long   CIRCUIT_COOLDOWN_MS = 30_000L;

    public MLServiceClient(RestTemplateBuilder builder,
                           @Value("${ml.service.url:http://localhost:5000}") String baseUrl,
                           @Value("${ml.service.enabled:true}") boolean enabled) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(2))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.enabled = enabled;
        log.info("MLServiceClient: enabled={}, url={}", enabled, this.baseUrl);
    }

    public boolean isAvailable() {
        if (!enabled) return false;
        if (circuitOpen.get() && System.currentTimeMillis() - circuitOpenedAt < CIRCUIT_COOLDOWN_MS) {
            return false;
        }
        return true;
    }

    /** POST /chat/start — returns null on failure (caller falls back to local logic). */
    public MLChatResponse startConversation(String sessionId) {
        if (!isAvailable()) return null;
        return postOrNull("/chat/start", Map.of("sessionId", sessionId));
    }

    /** POST /chat/message — returns null on failure. */
    public MLChatResponse sendMessage(String sessionId, String message) {
        if (!isAvailable()) return null;
        return postOrNull("/chat/message",
                Map.of("sessionId", sessionId, "message", message));
    }

    /** POST /chat/reset — fire-and-forget. */
    public void resetSession(String sessionId) {
        if (!isAvailable()) return;
        try {
            restTemplate.postForEntity(baseUrl + "/chat/reset/" + sessionId, null, Void.class);
        } catch (Exception e) {
            log.debug("ML reset failed for {}: {}", sessionId, e.getMessage());
        }
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    private MLChatResponse postOrNull(String path, Map<String, ?> body) {
        try {
            ResponseEntity<MLChatResponse> response = restTemplate.postForEntity(
                    baseUrl + path, body, MLChatResponse.class);
            closeCircuit();
            if (response.getStatusCode() != HttpStatus.OK) {
                log.warn("ML {} returned {}", path, response.getStatusCode());
                return null;
            }
            return response.getBody();
        } catch (ResourceAccessException e) {
            tripCircuit("ML service unreachable at " + baseUrl + path + ": " + e.getMessage());
            return null;
        } catch (Exception e) {
            log.warn("ML {} failed: {}", path, e.getMessage());
            return null;
        }
    }

    private void tripCircuit(String reason) {
        if (!circuitOpen.getAndSet(true)) {
            log.warn("ML circuit OPEN — will fall back to rule-based matcher for {}s. Reason: {}",
                    CIRCUIT_COOLDOWN_MS / 1000, reason);
        }
        circuitOpenedAt = System.currentTimeMillis();
    }

    private void closeCircuit() {
        if (circuitOpen.getAndSet(false)) {
            log.info("ML circuit CLOSED — service is responding again");
        }
    }
}
