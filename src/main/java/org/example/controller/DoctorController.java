package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.dto.AvailabilityUpdateRequest;
import org.example.dto.DoctorResponse;
import org.example.dto.PageResponse;
import org.example.service.DoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    /**
     * GET /api/doctors?page=0&size=10
     * Lists all doctors, sorted by rating descending, with pagination.
     */
    @GetMapping
    public ResponseEntity<PageResponse<DoctorResponse>> getAllDoctors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(doctorService.getAllDoctors(page, size));
    }

    /**
     * GET /api/doctors/{id}
     * Returns a single doctor's details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getDoctorById(@PathVariable String id) {
        return ResponseEntity.ok(doctorService.getDoctorById(id));
    }

    /**
     * GET /api/doctors/search?specialization=Cardiology&page=0&size=10
     * Searches by specialization (case-insensitive), sorted by rating desc.
     */
    @GetMapping("/search")
    public ResponseEntity<PageResponse<DoctorResponse>> searchBySpecialization(
            @RequestParam String specialization,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(doctorService.searchBySpecialization(specialization, page, size));
    }

    /**
     * GET /api/doctors/available
     * Returns doctors that currently have at least one open slot.
     */
    @GetMapping("/available")
    public ResponseEntity<List<DoctorResponse>> getAvailableDoctors() {
        return ResponseEntity.ok(doctorService.getAvailableDoctors());
    }

    /**
     * PUT /api/doctors/availability
     * Doctor-only: replaces the authenticated doctor's available slot list.
     */
    @PutMapping("/availability")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorResponse> updateAvailability(
            Authentication authentication,
            @RequestBody AvailabilityUpdateRequest request) {
        return ResponseEntity.ok(doctorService.updateAvailability(authentication.getName(), request));
    }
}
