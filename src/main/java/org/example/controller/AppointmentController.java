package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.dto.AppointmentRequest;
import org.example.dto.AppointmentResponse;
import org.example.dto.StatusUpdateRequest;
import org.example.model.Role;
import org.example.model.User;
import org.example.repository.UserRepository;
import org.example.service.AppointmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@Tag(name = "Appointments", description = "Book, view, update, and cancel appointments")
@SecurityRequirement(name = "bearerAuth")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final UserRepository userRepository;

    // ─── POST /api/appointments ───────────────────────────────────────────────

    @Operation(
        summary = "Create appointment",
        description = "Patient books an appointment with a doctor. " +
                      "Requires PATIENT role. Validates doctor existence and duplicate slots."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Appointment created successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error or invalid input",
                     content = @Content(schema = @Schema(example = "{\"errors\":{\"doctorId\":\"Doctor ID is required\"}}"))),
        @ApiResponse(responseCode = "404", description = "Doctor not found"),
        @ApiResponse(responseCode = "409", description = "Duplicate booking at the same slot")
    })
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<AppointmentResponse> createAppointment(
            Authentication auth,
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(appointmentService.createAppointment(auth.getName(), request));
    }

    // ─── GET /api/appointments ────────────────────────────────────────────────

    @Operation(
        summary = "List my appointments",
        description = "Returns appointments for the authenticated user. " +
                      "PATIENT sees their own; DOCTOR sees assigned; ADMIN sees all."
    )
    @ApiResponse(responseCode = "200", description = "Appointment list returned")
    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getMyAppointments(Authentication auth) {
        Role role = resolveRole(auth.getName());
        return ResponseEntity.ok(appointmentService.getMyAppointments(auth.getName(), role));
    }

    // ─── GET /api/appointments/{id} ───────────────────────────────────────────

    @Operation(
        summary = "Get appointment by ID",
        description = "Returns a single appointment. " +
                      "Only the patient, the doctor, or an admin may access it."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Appointment found"),
        @ApiResponse(responseCode = "403", description = "Not your appointment"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(
            @Parameter(description = "MongoDB ObjectId of the appointment") @PathVariable String id,
            Authentication auth) {
        Role role = resolveRole(auth.getName());
        return ResponseEntity.ok(appointmentService.getAppointmentById(id, auth.getName(), role));
    }

    // ─── PUT /api/appointments/{id}/status ────────────────────────────────────

    @Operation(
        summary = "Update appointment status",
        description = """
            State-machine rules:
            - PATIENT  → may only set status to CANCELLED (own appointment)
            - DOCTOR   → may set CONFIRMED, COMPLETED, or CANCELLED (assigned appointment)
            - ADMIN    → may set any status on any appointment
            Terminal states (COMPLETED, CANCELLED) cannot be changed.
            """
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Status updated"),
        @ApiResponse(responseCode = "400", description = "Invalid transition or terminal state"),
        @ApiResponse(responseCode = "403", description = "Not authorised for this status change"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    @PutMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody StatusUpdateRequest request,
            Authentication auth) {
        Role role = resolveRole(auth.getName());
        return ResponseEntity.ok(appointmentService.updateStatus(id, request, auth.getName(), role));
    }

    // ─── DELETE /api/appointments/{id} ────────────────────────────────────────

    @Operation(
        summary = "Cancel appointment",
        description = "Soft-cancels the appointment (sets status to CANCELLED). " +
                      "PATIENT can cancel their own; DOCTOR can cancel theirs; ADMIN can cancel any. " +
                      "Already COMPLETED or CANCELLED appointments cannot be cancelled."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Appointment cancelled"),
        @ApiResponse(responseCode = "400", description = "Already in a terminal state"),
        @ApiResponse(responseCode = "403", description = "Not your appointment"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            @PathVariable String id,
            Authentication auth) {
        Role role = resolveRole(auth.getName());
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, auth.getName(), role));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    /** Resolves the caller's Role from the DB so the service can apply fine-grained rules. */
    private Role resolveRole(String username) {
        return userRepository.findByUsername(username)
                .map(User::getRole)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }
}
