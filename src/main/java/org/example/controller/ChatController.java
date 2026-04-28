package org.example.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.ChatMessageRequest;
import org.example.dto.ChatResponse;
import org.example.dto.DoctorResponse;
import org.example.dto.MLChatResponse;
import org.example.dto.MatchResult;
import org.example.exception.AppException;
import org.example.model.ChatSession;
import org.example.model.Doctor;
import org.example.model.Message;
import org.example.model.User;
import org.example.repository.ChatSessionRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.UserRepository;
import org.example.service.MLServiceClient;
import org.example.service.SymptomMatcher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Chat endpoints. Delegates to the Python ML service when available;
 * falls back to the rule-based {@link SymptomMatcher} when it isn't, so the
 * chatbot never goes fully offline.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SymptomMatcher        symptomMatcher;
    private final MLServiceClient       mlServiceClient;
    private final ChatSessionRepository chatSessionRepository;
    private final DoctorRepository      doctorRepository;
    private final UserRepository        userRepository;

    private static final String DEFAULT_WELCOME =
            "Hello! 👋 I'm your AI health assistant.\n\n" +
            "Describe your symptoms in your own words and I'll guide you to the right doctor. " +
            "I'll ask a couple of quick follow-up questions so I can make a good recommendation.\n\n" +
            "For example:\n" +
            "• \"I have a bad headache and dizziness\"\n" +
            "• \"My chest hurts when I breathe\"\n" +
            "• \"I've had fever and a cough for two days\"";

    // ─── Start a new session ──────────────────────────────────────────────────

    @PostMapping("/start")
    public ResponseEntity<ChatResponse> startChat(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails.getUsername());

        // Close any currently-active session
        chatSessionRepository.findByPatientIdAndActive(user.getId(), true).forEach(s -> {
            s.setActive(false);
            chatSessionRepository.save(s);
            mlServiceClient.resetSession(s.getId());
        });

        ChatSession session = new ChatSession();
        session.setPatientId(user.getId());
        session.setMessages(new ArrayList<>());
        session.setTimestamp(LocalDateTime.now());
        session.setActive(true);
        session.setDetectedSymptoms(new ArrayList<>());
        session.setAwaitingIntensity(false);
        session.setPendingKeywords(new ArrayList<>());
        session.setUseMlService(false);
        session = chatSessionRepository.save(session);

        // Try ML welcome first; fall back to the canned one
        MLChatResponse mlStart = mlServiceClient.startConversation(session.getId());
        String welcomeText = (mlStart != null && mlStart.getMessage() != null)
                ? mlStart.getMessage()
                : DEFAULT_WELCOME;
        session.setUseMlService(mlStart != null);

        Message welcome = new Message("bot", welcomeText, LocalDateTime.now());
        session.getMessages().add(welcome);
        chatSessionRepository.save(session);

        return ResponseEntity.ok(
                new ChatResponse(session.getId(), welcome, null, Collections.emptyList()));
    }

    // ─── Process a patient message ────────────────────────────────────────────

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(
            @RequestBody ChatMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        ChatSession session = chatSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new AppException("Chat session not found", HttpStatus.NOT_FOUND));

        Message userMsg = new Message("patient", request.getMessage(), LocalDateTime.now());
        session.getMessages().add(userMsg);

        // Prefer ML service when this session is using it
        if (session.isUseMlService()) {
            MLChatResponse ml = mlServiceClient.sendMessage(session.getId(), request.getMessage());
            if (ml != null) {
                return ResponseEntity.ok(handleMlResponse(session, ml));
            }
            // ML just went down mid-conversation — fall through to the rule-based matcher
            log.warn("ML service unavailable mid-session {}; falling back to SymptomMatcher", session.getId());
            session.setUseMlService(false);
            session.setAwaitingIntensity(false);
            session.setPendingSpecialization(null);
            session.setPendingKeywords(new ArrayList<>());
        }

        return ResponseEntity.ok(handleRuleBasedResponse(session, request.getMessage()));
    }

    // ─── ML-service path ──────────────────────────────────────────────────────

    private ChatResponse handleMlResponse(ChatSession session, MLChatResponse ml) {
        Message botMsg = new Message("bot", ml.getMessage(), LocalDateTime.now());
        session.getMessages().add(botMsg);

        List<DoctorResponse> doctors = Collections.emptyList();
        String specialization = null;

        if (ml.isComplete() && ml.getRecommendedSpecialization() != null) {
            specialization = ml.getRecommendedSpecialization();
            session.setRecommendedSpecialization(specialization);
            doctors = findDoctorsBySpecialization(specialization);
        }
        chatSessionRepository.save(session);

        return new ChatResponse(session.getId(), botMsg, specialization, doctors);
    }

    // ─── Rule-based fallback path ─────────────────────────────────────────────

    private ChatResponse handleRuleBasedResponse(ChatSession session, String userText) {
        MatchResult match;

        if (session.isAwaitingIntensity()) {
            match = symptomMatcher.resolveWithIntensity(
                    userText,
                    session.getPendingSpecialization(),
                    session.getPendingKeywords() != null
                            ? session.getPendingKeywords()
                            : Collections.emptyList());
            session.setAwaitingIntensity(false);
            session.setPendingSpecialization(null);
            session.setPendingKeywords(new ArrayList<>());
        } else {
            match = symptomMatcher.analyze(userText);
            if (match.isRequiresFollowUp()) {
                session.setAwaitingIntensity(true);
                session.setPendingSpecialization(match.getPendingCategory());
                session.setPendingKeywords(new ArrayList<>(match.getMatchedKeywords()));
            }
        }

        session.setRecommendedSpecialization(match.getSpecialization());
        if (session.getDetectedSymptoms() == null) session.setDetectedSymptoms(new ArrayList<>());
        if (match.getMatchedKeywords() != null) {
            session.getDetectedSymptoms().addAll(match.getMatchedKeywords());
        }

        Message botMsg = new Message("bot", match.getResponseMessage(), LocalDateTime.now());
        session.getMessages().add(botMsg);
        chatSessionRepository.save(session);

        List<DoctorResponse> doctors = Collections.emptyList();
        if (!match.isRequiresFollowUp()) {
            doctors = findDoctorsBySpecialization(match.getSpecialization());
        }

        return new ChatResponse(session.getId(), botMsg, match.getSpecialization(), doctors);
    }

    private List<DoctorResponse> findDoctorsBySpecialization(String specialization) {
        return doctorRepository.findBySpecializationIgnoreCase(specialization).stream()
                .filter(d -> d.getAvailableSlots() != null && !d.getAvailableSlots().isEmpty())
                .limit(4)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Chat history ─────────────────────────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<List<ChatSession>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails.getUsername());
        return ResponseEntity.ok(
                chatSessionRepository.findByPatientIdOrderByTimestampDesc(user.getId()));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private User resolveUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
    }

    private DoctorResponse toResponse(Doctor d) {
        return new DoctorResponse(
                d.getId(), d.getUsername(), d.getEmail(),
                d.getSpecialization(), d.getExperience(),
                d.getRating(), d.getAvailableSlots(), d.getFees(),
                d.getQualification(), d.getBio());
    }
}
