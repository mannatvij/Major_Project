package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.AppointmentRequest;
import org.example.dto.AppointmentResponse;
import org.example.dto.StatusUpdateRequest;
import org.example.exception.AppException;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.Doctor;
import org.example.model.Payment;
import org.example.model.Role;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final SlotManagementService slotManagementService;
    private final EmailService emailService;
    private final PaymentService paymentService;
    private final org.example.repository.PaymentRepository paymentRepository;

    // ─── Create ──────────────────────────────────────────────────────────────

    /**
     * Books an appointment. Only PATIENTs may call this.
     * Validates: doctor exists, no duplicate slot, datetime is future (done by @Future in DTO).
     */
    public AppointmentResponse createAppointment(String patientUsername, AppointmentRequest request) {
        User patient = findUserByUsername(patientUsername);

        // Verify the doctor exists and capture the entity (needed for slot management)
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new AppException(
                        "Doctor not found with id: " + request.getDoctorId(), HttpStatus.NOT_FOUND));

        // Guard against duplicate bookings by the same patient
        if (appointmentRepository.existsByPatientIdAndDoctorIdAndDateTime(
                patient.getId(), request.getDoctorId(), request.getDateTime())) {
            throw new AppException(
                    "You already have an appointment with this doctor at that time", HttpStatus.CONFLICT);
        }

        // Atomic slot reservation — fails fast if a concurrent booking already took it.
        boolean reserved = slotManagementService.reserveSlotAtomically(
                doctor.getId(), request.getDateTime());
        if (!reserved) {
            throw new AppException(
                    "The selected slot is no longer available", HttpStatus.CONFLICT);
        }

        // Free consultations skip payment and go straight to PENDING (awaiting doctor approval).
        boolean paymentRequired = doctor.getFees() > 0;
        AppointmentStatus initialStatus = paymentRequired
                ? AppointmentStatus.PENDING_PAYMENT
                : AppointmentStatus.PENDING;

        Appointment appointment = new Appointment();
        appointment.setPatientId(patient.getId());
        appointment.setDoctorId(request.getDoctorId());
        appointment.setDateTime(request.getDateTime());
        appointment.setStatus(initialStatus);
        appointment.setSymptoms(request.getSymptoms());
        appointment.setNotes(request.getNotes());
        appointment.setCreatedAt(LocalDateTime.now());
        appointment.setFee(paymentRequired ? doctor.getFees() : null);

        Appointment saved;
        try {
            saved = appointmentRepository.save(appointment);
        } catch (RuntimeException e) {
            // Roll back the slot reservation so the doctor's availability is consistent.
            slotManagementService.restoreSlot(doctor.getId(), request.getDateTime());
            throw e;
        }

        // Notify patient that booking is received. (For paid bookings, a separate
        // payment receipt email is sent once Razorpay verification succeeds.)
        if (!paymentRequired) {
            try {
                emailService.sendAppointmentBooked(saved, patient, doctor);
            } catch (Exception e) {
                log.warn("[EMAIL] Failed to trigger booked email for appointment {}: {}", saved.getId(), e.getMessage());
            }
        }

        return toResponse(saved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /**
     * Returns appointments visible to the caller:
     * - PATIENT → their own, newest first
     * - DOCTOR  → assigned to them, newest first
     * - ADMIN   → all
     */
    public List<AppointmentResponse> getMyAppointments(String username, Role role) {
        User user = findUserByUsername(username);
        return switch (role) {
            case PATIENT -> appointmentRepository
                    .findByPatientIdOrderByDateTimeDesc(user.getId())
                    .stream().map(this::toResponse).toList();
            case DOCTOR  -> appointmentRepository
                    .findByDoctorIdOrderByDateTimeDesc(user.getId())
                    .stream().map(this::toResponse).toList();
            default      -> appointmentRepository.findAll()
                    .stream().map(this::toResponse).toList();
        };
    }

    /**
     * Returns a single appointment.
     * Patient and doctor of that appointment can view it; admins can view any.
     */
    public AppointmentResponse getAppointmentById(String id, String username, Role role) {
        Appointment appointment = findAppointmentById(id);
        User user = findUserByUsername(username);

        if (role != Role.ADMIN
                && !appointment.getPatientId().equals(user.getId())
                && !appointment.getDoctorId().equals(user.getId())) {
            throw new AppException("You are not allowed to view this appointment", HttpStatus.FORBIDDEN);
        }
        return toResponse(appointment);
    }

    // ─── Update status ────────────────────────────────────────────────────────

    /**
     * State-machine rules:
     * - Terminal states (COMPLETED, CANCELLED) → immutable
     * - PATIENT  → may only set CANCELLED on their own appointment
     * - DOCTOR   → may set CONFIRMED or COMPLETED (and CANCELLED) on their appointment
     * - ADMIN    → unrestricted
     */
    public AppointmentResponse updateStatus(String id, StatusUpdateRequest request,
                                            String username, Role role) {
        Appointment appointment = findAppointmentById(id);
        User user = findUserByUsername(username);
        AppointmentStatus newStatus = request.getStatus();

        // Terminal state check
        if (appointment.getStatus() == AppointmentStatus.COMPLETED
                || appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new AppException(
                    "Cannot modify a " + appointment.getStatus() + " appointment", HttpStatus.BAD_REQUEST);
        }

        switch (role) {
            case PATIENT -> {
                if (!appointment.getPatientId().equals(user.getId())) {
                    throw new AppException("You can only update your own appointments", HttpStatus.FORBIDDEN);
                }
                if (newStatus != AppointmentStatus.CANCELLED) {
                    throw new AppException("Patients may only cancel appointments", HttpStatus.FORBIDDEN);
                }
            }
            case DOCTOR -> {
                if (!appointment.getDoctorId().equals(user.getId())) {
                    throw new AppException("You can only update appointments assigned to you", HttpStatus.FORBIDDEN);
                }
            }
            // ADMIN → no extra checks
        }

        appointment.setStatus(newStatus);
        AppointmentResponse updated = toResponse(appointmentRepository.save(appointment));

        // Send status email (async)
        try {
            User patient = userRepository.findById(appointment.getPatientId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
            if (patient != null && doctor != null) {
                emailService.sendStatusUpdate(appointment, patient, doctor);
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to trigger status-update email for appointment {}: {}",
                    appointment.getId(), e.getMessage());
        }

        return updated;
    }

    // ─── Cancel (DELETE) ──────────────────────────────────────────────────────

    /**
     * Soft-cancel: sets status to CANCELLED.
     * - PATIENT can cancel their own
     * - DOCTOR  can cancel appointments assigned to them
     * - ADMIN   can cancel any
     * Only PENDING or CONFIRMED appointments can be cancelled.
     */
    public AppointmentResponse cancelAppointment(String id, String username, Role role) {
        Appointment appointment = findAppointmentById(id);
        User user = findUserByUsername(username);

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new AppException("Cannot cancel a completed appointment", HttpStatus.BAD_REQUEST);
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new AppException("Appointment is already cancelled", HttpStatus.BAD_REQUEST);
        }

        boolean isPatient = role == Role.PATIENT && appointment.getPatientId().equals(user.getId());
        boolean isDoctor  = role == Role.DOCTOR  && appointment.getDoctorId().equals(user.getId());
        boolean isAdmin   = role == Role.ADMIN;

        if (!isPatient && !isDoctor && !isAdmin) {
            throw new AppException("You are not allowed to cancel this appointment", HttpStatus.FORBIDDEN);
        }

        AppointmentStatus prevStatus = appointment.getStatus();
        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment savedCancelled = appointmentRepository.save(appointment);
        AppointmentResponse cancelled = toResponse(savedCancelled);

        // Restore the slot if the appointment is still in the future.
        if (appointment.getDateTime() != null && appointment.getDateTime().isAfter(LocalDateTime.now())) {
            try {
                slotManagementService.restoreSlot(appointment.getDoctorId(), appointment.getDateTime());
            } catch (Exception e) {
                log.warn("[SLOT] Could not restore slot for cancelled appointment {}: {}",
                        appointment.getId(), e.getMessage());
            }
        }

        // Auto-refund any PAID payment linked to this appointment.
        if (prevStatus != AppointmentStatus.PENDING_PAYMENT) {
            try {
                paymentService.refundForAppointment(savedCancelled);
            } catch (Exception e) {
                log.warn("[PAYMENT] Refund attempt failed for appointment {}: {}",
                        appointment.getId(), e.getMessage());
            }
        }

        // Send cancellation email (async)
        try {
            User patient = userRepository.findById(appointment.getPatientId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
            if (patient != null && doctor != null) {
                emailService.sendAppointmentCancellation(appointment, patient, doctor);
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to trigger cancellation email for appointment {}: {}",
                    appointment.getId(), e.getMessage());
        }

        return cancelled;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Appointment findAppointmentById(String id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new AppException("Appointment not found: " + id, HttpStatus.NOT_FOUND));
    }

    private User findUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found: " + username, HttpStatus.NOT_FOUND));
    }

    private AppointmentResponse toResponse(Appointment a) {
        String patientName = userRepository.findById(a.getPatientId())
                .map(User::getUsername).orElse("Unknown");
        String doctorName  = userRepository.findById(a.getDoctorId())
                .map(User::getUsername).orElse("Unknown");

        String paymentStatus = null;
        if (a.getPaymentId() != null) {
            Payment p = paymentRepository.findById(a.getPaymentId()).orElse(null);
            if (p != null && p.getStatus() != null) {
                paymentStatus = p.getStatus().name();
            }
        }

        return new AppointmentResponse(
                a.getId(), a.getPatientId(), patientName,
                a.getDoctorId(), doctorName,
                a.getDateTime(), a.getStatus(),
                a.getSymptoms(), a.getNotes(), a.getCreatedAt(),
                a.getPaymentId(), a.getFee(), paymentStatus);
    }
}
