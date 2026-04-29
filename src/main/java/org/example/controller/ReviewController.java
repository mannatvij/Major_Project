package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.dto.PageResponse;
import org.example.dto.ReviewRequest;
import org.example.dto.ReviewResponse;
import org.example.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "Patient ratings and reviews of doctors")
@SecurityRequirement(name = "bearerAuth")
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Submit a 1-5 star review for a completed appointment")
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ReviewResponse> create(
            Authentication auth,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.create(request, auth.getName()));
    }

    @Operation(summary = "Paginated reviews for a doctor, newest first")
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<PageResponse<ReviewResponse>> listForDoctor(
            @PathVariable String doctorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(PageResponse.from(reviewService.listForDoctor(doctorId, page, size)));
    }

    @Operation(summary = "Get the patient's review for a given appointment, if any")
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ReviewResponse> getByAppointment(@PathVariable String appointmentId) {
        return reviewService.findByAppointmentId(appointmentId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
