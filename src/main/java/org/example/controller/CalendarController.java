package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.exception.AppException;
import org.example.model.Appointment;
import org.example.model.Doctor;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.UserRepository;
import org.example.service.CalendarService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/appointments/{id}/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final CalendarService calendarService;

    /** Download .ics file for the given appointment. */
    @GetMapping("/ics")
    public ResponseEntity<byte[]> downloadIcs(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {

        AppointmentParts parts = resolve(id, userDetails.getUsername());
        byte[] ics = calendarService.generateICSFile(parts.appt, parts.patient, parts.doctor);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"appointment-" + id.substring(Math.max(0, id.length() - 6)) + ".ics\"")
                .body(ics);
    }

    /** Redirect to Google Calendar event creation. */
    @GetMapping("/google")
    public ResponseEntity<Void> googleCalendar(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {

        AppointmentParts parts = resolve(id, userDetails.getUsername());
        String url = calendarService.generateGoogleCalendarLink(parts.appt, parts.doctor);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(url))
                .build();
    }

    /** Redirect to Outlook Calendar event creation. */
    @GetMapping("/outlook")
    public ResponseEntity<Void> outlookCalendar(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {

        AppointmentParts parts = resolve(id, userDetails.getUsername());
        String url = calendarService.generateOutlookCalendarLink(parts.appt, parts.doctor);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(url))
                .build();
    }

    /** Returns calendar links as JSON (used by frontend to open tabs). */
    @GetMapping("/links")
    public ResponseEntity<?> getLinks(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {

        AppointmentParts parts = resolve(id, userDetails.getUsername());
        return ResponseEntity.ok(java.util.Map.of(
                "google",  calendarService.generateGoogleCalendarLink(parts.appt, parts.doctor),
                "outlook", calendarService.generateOutlookCalendarLink(parts.appt, parts.doctor)
        ));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private AppointmentParts resolve(String appointmentId, String username) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppException("Appointment not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        // Access check: patient, doctor of the appt, or admin
        boolean isParticipant = appt.getPatientId().equals(user.getId())
                             || appt.getDoctorId().equals(user.getId());
        boolean isAdmin = user.getRole() != null && user.getRole().name().equals("ADMIN");
        if (!isParticipant && !isAdmin) {
            throw new AppException("Access denied", HttpStatus.FORBIDDEN);
        }

        User patient = userRepository.findById(appt.getPatientId())
                .orElseThrow(() -> new AppException("Patient not found", HttpStatus.NOT_FOUND));
        Doctor doctor = doctorRepository.findById(appt.getDoctorId())
                .orElseThrow(() -> new AppException("Doctor not found", HttpStatus.NOT_FOUND));

        return new AppointmentParts(appt, patient, doctor);
    }

    private record AppointmentParts(Appointment appt, User patient, Doctor doctor) {}
}
