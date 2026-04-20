package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Returns upcoming CONFIRMED appointments for the authenticated user
 * (patient OR doctor) within the next 24 hours — drives the notification bell.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter DT_FMT =
            DateTimeFormatter.ofPattern("EEE, dd MMM 'at' hh:mm a");

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.ok(List.of());

        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime in24 = now.plusHours(24);

        boolean isDoctor = user.getRole() != null
                && user.getRole().name().equals("DOCTOR");

        List<Appointment> upcoming;
        if (isDoctor) {
            upcoming = appointmentRepository
                    .findByDoctorIdAndDateTimeBetween(user.getId(), now, in24)
                    .stream()
                    .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED)
                    .toList();
        } else {
            upcoming = appointmentRepository
                    .findByPatientIdAndDateTimeBetween(user.getId(), now, in24)
                    .stream()
                    .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED)
                    .toList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Appointment appt : upcoming) {
            String otherName;
            if (isDoctor) {
                otherName = userRepository.findById(appt.getPatientId())
                        .map(User::getUsername).orElse("Unknown");
            } else {
                otherName = userRepository.findById(appt.getDoctorId())
                        .map(User::getUsername).orElse("Unknown");
            }

            String message = isDoctor
                    ? "Upcoming: appointment with patient " + otherName
                      + " on " + appt.getDateTime().format(DT_FMT)
                    : "Reminder: appointment with Dr. " + otherName
                      + " on " + appt.getDateTime().format(DT_FMT);

            result.add(Map.of(
                    "appointmentId", appt.getId(),
                    "message", message,
                    "dateTime", appt.getDateTime().toString()
            ));
        }

        return ResponseEntity.ok(result);
    }
}
