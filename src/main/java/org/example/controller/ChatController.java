package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.dto.ChatMessageRequest;
import org.example.dto.ChatResponse;
import org.example.dto.DoctorResponse;
import org.example.dto.MatchResult;
import org.example.exception.AppException;
import org.example.model.ChatSession;
import org.example.model.Doctor;
import org.example.model.Message;
import org.example.model.User;
import org.example.repository.ChatSessionRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.UserRepository;
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

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final SymptomMatcher         symptomMatcher;
    private final ChatSessionRepository  chatSessionRepository;
    private final DoctorRepository       doctorRepository;
    private final UserRepository         userRepository;

    // ─── Start a new session ──────────────────────────────────────────────────

    @PostMapping("/start")
    public ResponseEntity<ChatResponse> startChat(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails.getUsername());

        // Close any currently-active session
        chatSessionRepository.findByPatientIdAndActive(user.getId(), true)
                .forEach(s -> { s.setActive(false); chatSessionRepository.save(s); });

        Message welcome = new Message("bot",
                "Hello! 👋 I'm your AI health assistant.\n\n" +
                "Describe your symptoms in your own words and I'll suggest the right doctor " +
                "— whether that's a General Physician or a specialist.\n\n" +
                "For example:\n" +
                "• \"I have a bad headache and dizziness\"\n" +
                "• \"My chest hurts when I breathe\"\n" +
                "• \"I've had fever and a cough for two days\"",
                LocalDateTime.now());

        ChatSession session = new ChatSession();
        session.setPatientId(user.getId());
        session.setMessages(new ArrayList<>(List.of(welcome)));
        session.setTimestamp(LocalDateTime.now());
        session.setActive(true);
        session.setDetectedSymptoms(new ArrayList<>());
        session.setAwaitingIntensity(false);
        session.setPendingKeywords(new ArrayList<>());
        session = chatSessionRepository.save(session);

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

        // Persist patient message
        Message userMsg = new Message("patient", request.getMessage(), LocalDateTime.now());
        session.getMessages().add(userMsg);

        MatchResult match;

        if (session.isAwaitingIntensity()) {
            // Second turn: resolve intensity and produce final routing decision
            match = symptomMatcher.resolveWithIntensity(
                    request.getMessage(),
                    session.getPendingSpecialization(),
                    session.getPendingKeywords() != null
                            ? session.getPendingKeywords()
                            : Collections.emptyList());

            // Clear the follow-up state
            session.setAwaitingIntensity(false);
            session.setPendingSpecialization(null);
            session.setPendingKeywords(new ArrayList<>());

        } else {
            // First turn: analyse symptoms
            match = symptomMatcher.analyze(request.getMessage());

            if (match.isRequiresFollowUp()) {
                // Bot is asking for intensity — save state and return the question
                session.setAwaitingIntensity(true);
                session.setPendingSpecialization(match.getPendingCategory());
                session.setPendingKeywords(new ArrayList<>(match.getMatchedKeywords()));
            }
        }

        // Update session metadata
        session.setRecommendedSpecialization(match.getSpecialization());
        if (session.getDetectedSymptoms() == null) session.setDetectedSymptoms(new ArrayList<>());
        if (match.getMatchedKeywords() != null) {
            session.getDetectedSymptoms().addAll(match.getMatchedKeywords());
        }

        // Persist bot reply
        Message botMsg = new Message("bot", match.getResponseMessage(), LocalDateTime.now());
        session.getMessages().add(botMsg);
        chatSessionRepository.save(session);

        // When we're still waiting for intensity we don't show doctor cards yet
        List<DoctorResponse> doctors = Collections.emptyList();
        if (!match.isRequiresFollowUp()) {
            doctors = doctorRepository
                    .findBySpecializationIgnoreCase(match.getSpecialization())
                    .stream()
                    .filter(d -> d.getAvailableSlots() != null && !d.getAvailableSlots().isEmpty())
                    .limit(4)
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(
                new ChatResponse(session.getId(), botMsg, match.getSpecialization(), doctors));
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
