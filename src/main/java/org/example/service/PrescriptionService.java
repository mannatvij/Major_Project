package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.MedicationDto;
import org.example.dto.PrescriptionRequest;
import org.example.dto.PrescriptionResponse;
import org.example.exception.AppException;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.Doctor;
import org.example.model.Medication;
import org.example.model.Prescription;
import org.example.model.Role;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.PrescriptionRepository;
import org.example.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PdfGenerationService pdfGenerationService;
    private final EmailService emailService;

    // ─── Create ──────────────────────────────────────────────────────────────

    /**
     * Doctor creates a prescription for a completed appointment they own.
     * Idempotent-ish: a second call updates the existing prescription rather than
     * creating a duplicate (the schema enforces uniqueness on appointmentId anyway).
     */
    public PrescriptionResponse create(PrescriptionRequest req, String doctorUsername) {
        Appointment appt = appointmentRepository.findById(req.getAppointmentId())
                .orElseThrow(() -> new AppException("Appointment not found", HttpStatus.NOT_FOUND));

        User doctorUser = userRepository.findByUsername(doctorUsername)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (!appt.getDoctorId().equals(doctorUser.getId())) {
            throw new AppException("You can only prescribe for your own appointments", HttpStatus.FORBIDDEN);
        }
        if (appt.getStatus() != AppointmentStatus.COMPLETED) {
            throw new AppException(
                    "Prescription can only be added after marking the appointment as COMPLETED",
                    HttpStatus.BAD_REQUEST);
        }

        Prescription rx = prescriptionRepository.findByAppointmentId(req.getAppointmentId())
                .orElseGet(Prescription::new);
        if (rx.getId() == null) {
            rx.setAppointmentId(req.getAppointmentId());
            rx.setDoctorId(appt.getDoctorId());
            rx.setPatientId(appt.getPatientId());
            rx.setCreatedAt(LocalDateTime.now());
        }
        rx.setDiagnosis(req.getDiagnosis());
        rx.setAdvice(req.getAdvice());
        rx.setFollowUpDate(req.getFollowUpDate());
        rx.setMedications(req.getMedications().stream().map(this::toEntity).toList());

        Prescription saved = prescriptionRepository.save(rx);

        // Email patient with the PDF as attachment (best-effort, async).
        try {
            User patient = userRepository.findById(appt.getPatientId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appt.getDoctorId()).orElse(null);
            if (patient != null && doctor != null) {
                byte[] pdfBytes = pdfGenerationService.renderPrescription(saved, doctor, patient);
                emailService.sendPrescriptionEmail(appt, patient, doctor, pdfBytes,
                        "prescription-" + safeSuffix(saved.getId()) + ".pdf");
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to send prescription email for {}: {}",
                    saved.getId(), e.getMessage());
        }

        return toResponse(saved);
    }

    // ─── Read ────────────────────────────────────────────────────────────────

    public PrescriptionResponse getByAppointmentId(String appointmentId, String username, Role role) {
        Prescription rx = prescriptionRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new AppException("No prescription for this appointment", HttpStatus.NOT_FOUND));
        assertCanRead(rx, username, role);
        return toResponse(rx);
    }

    /** Returns the raw entity + the doctor and patient needed for PDF rendering. */
    public PdfBundle getPdfBundle(String prescriptionId, String username, Role role) {
        Prescription rx = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new AppException("Prescription not found", HttpStatus.NOT_FOUND));
        assertCanRead(rx, username, role);
        Doctor doctor = doctorRepository.findById(rx.getDoctorId())
                .orElseThrow(() -> new AppException("Doctor not found", HttpStatus.NOT_FOUND));
        User patient = userRepository.findById(rx.getPatientId())
                .orElseThrow(() -> new AppException("Patient not found", HttpStatus.NOT_FOUND));
        return new PdfBundle(rx, doctor, patient);
    }

    public List<PrescriptionResponse> listForPatient(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    // ─── Authorization ───────────────────────────────────────────────────────

    private void assertCanRead(Prescription rx, String username, Role role) {
        if (role == Role.ADMIN) return;
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        boolean isOwner = rx.getPatientId().equals(user.getId())
                || rx.getDoctorId().equals(user.getId());
        if (!isOwner) {
            throw new AppException("You are not allowed to access this prescription", HttpStatus.FORBIDDEN);
        }
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private Medication toEntity(MedicationDto d) {
        return new Medication(d.getName(), d.getDosage(), d.getFrequency(),
                d.getDuration(), d.getNotes());
    }

    private PrescriptionResponse toResponse(Prescription rx) {
        Doctor doctor = doctorRepository.findById(rx.getDoctorId()).orElse(null);
        User patient = userRepository.findById(rx.getPatientId()).orElse(null);
        return new PrescriptionResponse(
                rx.getId(),
                rx.getAppointmentId(),
                rx.getDoctorId(),
                doctor != null ? doctor.getUsername() : "Unknown",
                doctor != null ? doctor.getQualification() : null,
                doctor != null ? doctor.getSpecialization() : null,
                rx.getPatientId(),
                patient != null ? patient.getUsername() : "Unknown",
                rx.getDiagnosis(),
                rx.getMedications(),
                rx.getAdvice(),
                rx.getFollowUpDate(),
                rx.getCreatedAt());
    }

    private static String safeSuffix(String id) {
        if (id == null) return "rx";
        return id.length() <= 8 ? id : id.substring(id.length() - 8);
    }

    public record PdfBundle(Prescription prescription, Doctor doctor, User patient) {}
}
