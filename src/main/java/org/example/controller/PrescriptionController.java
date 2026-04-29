package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.dto.PrescriptionRequest;
import org.example.dto.PrescriptionResponse;
import org.example.model.Role;
import org.example.model.User;
import org.example.repository.UserRepository;
import org.example.service.PdfGenerationService;
import org.example.service.PrescriptionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
@Tag(name = "Prescriptions", description = "Doctor-issued prescriptions and PDF download")
@SecurityRequirement(name = "bearerAuth")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PdfGenerationService pdfGenerationService;
    private final UserRepository userRepository;

    @Operation(summary = "Doctor creates (or updates) a prescription for a completed appointment")
    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<PrescriptionResponse> create(
            Authentication auth,
            @Valid @RequestBody PrescriptionRequest request) {
        return ResponseEntity.ok(prescriptionService.create(request, auth.getName()));
    }

    @Operation(summary = "Get the prescription tied to a given appointment")
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<PrescriptionResponse> getByAppointment(
            @PathVariable String appointmentId,
            Authentication auth) {
        Role role = resolveRole(auth.getName());
        return ResponseEntity.ok(
                prescriptionService.getByAppointmentId(appointmentId, auth.getName(), role));
    }

    @Operation(summary = "List the authenticated patient's prescriptions, newest first")
    @GetMapping("/mine")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<PrescriptionResponse>> mine(Authentication auth) {
        return ResponseEntity.ok(prescriptionService.listForPatient(auth.getName()));
    }

    @Operation(summary = "Download a prescription as PDF")
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable String id,
            Authentication auth) {
        Role role = resolveRole(auth.getName());
        PrescriptionService.PdfBundle bundle =
                prescriptionService.getPdfBundle(id, auth.getName(), role);
        byte[] pdf = pdfGenerationService.renderPrescription(
                bundle.prescription(), bundle.doctor(), bundle.patient());

        String suffix = id.length() <= 8 ? id : id.substring(id.length() - 8);
        String filename = "prescription-" + suffix + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }

    private Role resolveRole(String username) {
        return userRepository.findByUsername(username)
                .map(User::getRole)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }
}
