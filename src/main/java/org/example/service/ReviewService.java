package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.ReviewRequest;
import org.example.dto.ReviewResponse;
import org.example.exception.AppException;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.Review;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.ReviewRepository;
import org.example.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorService doctorService;

    // ─── Create ──────────────────────────────────────────────────────────────

    /**
     * Patient submits a 1-5 star review for a completed appointment they own.
     * Enforces: appointment is COMPLETED, owned by patient, no existing review.
     * Triggers a recalculation of the doctor's average rating.
     */
    public ReviewResponse create(ReviewRequest req, String patientUsername) {
        Appointment appt = appointmentRepository.findById(req.getAppointmentId())
                .orElseThrow(() -> new AppException("Appointment not found", HttpStatus.NOT_FOUND));

        User patient = userRepository.findByUsername(patientUsername)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (!appt.getPatientId().equals(patient.getId())) {
            throw new AppException("You can only review your own appointments", HttpStatus.FORBIDDEN);
        }
        if (appt.getStatus() != AppointmentStatus.COMPLETED) {
            throw new AppException(
                    "You can only review appointments that have been completed",
                    HttpStatus.BAD_REQUEST);
        }
        if (reviewRepository.findByAppointmentId(appt.getId()).isPresent()) {
            throw new AppException("You have already reviewed this appointment", HttpStatus.CONFLICT);
        }

        Review review = new Review();
        review.setAppointmentId(appt.getId());
        review.setDoctorId(appt.getDoctorId());
        review.setPatientId(patient.getId());
        review.setRating(req.getRating());
        review.setComment(req.getComment());
        review.setCreatedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);

        // Recompute aggregate rating + reviewCount on the doctor.
        try {
            List<Integer> ratings = reviewRepository.findByDoctorId(appt.getDoctorId())
                    .stream().map(Review::getRating).toList();
            doctorService.recalculateRating(appt.getDoctorId(), ratings);
        } catch (Exception e) {
            log.warn("[REVIEW] Recalculate rating failed for doctor {}: {}",
                    appt.getDoctorId(), e.getMessage());
        }

        return toResponse(saved);
    }

    // ─── Read ────────────────────────────────────────────────────────────────

    public Page<ReviewResponse> listForDoctor(String doctorId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return reviewRepository.findByDoctorIdOrderByCreatedAtDesc(doctorId, pageable)
                .map(this::toResponse);
    }

    /**
     * Returns the review for a given appointment if one exists. Used by the frontend
     * to decide whether to show "Rate Doctor" or "Your review" on past appointments.
     */
    public Optional<ReviewResponse> findByAppointmentId(String appointmentId) {
        return reviewRepository.findByAppointmentId(appointmentId).map(this::toResponse);
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private ReviewResponse toResponse(Review r) {
        String doctorName = userRepository.findById(r.getDoctorId())
                .map(User::getUsername).orElse("Unknown");
        String patientName = userRepository.findById(r.getPatientId())
                .map(User::getUsername).orElse("Unknown");
        return new ReviewResponse(
                r.getId(), r.getAppointmentId(),
                r.getDoctorId(), doctorName,
                r.getPatientId(), patientName,
                r.getRating(), r.getComment(), r.getCreatedAt());
    }
}
