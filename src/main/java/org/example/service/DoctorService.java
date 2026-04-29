package org.example.service;

import lombok.RequiredArgsConstructor;
import org.example.dto.AvailabilityUpdateRequest;
import org.example.dto.DoctorResponse;
import org.example.dto.PageResponse;
import org.example.model.Doctor;
import org.example.model.Role;
import org.example.repository.DoctorRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;

    /**
     * All doctors (role = DOCTOR), sorted by rating desc, paginated.
     * Uses findByRole to avoid _class discrimination issues with findAll().
     */
    public PageResponse<DoctorResponse> getAllDoctors(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "rating"));
        return PageResponse.from(
                doctorRepository.findApprovedByRole(Role.DOCTOR, pageable).map(this::toResponse));
    }

    public DoctorResponse getDoctorById(String id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + id));
        return toResponse(doctor);
    }

    /** Case-insensitive specialization search, sorted by rating desc, paginated. */
    public PageResponse<DoctorResponse> searchBySpecialization(String specialization, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "rating"));
        return PageResponse.from(
                doctorRepository.findApprovedBySpecializationAndRole(specialization, Role.DOCTOR, pageable)
                        .map(this::toResponse)
        );
    }

    /** Returns doctors that have at least one available slot. */
    public List<DoctorResponse> getAvailableDoctors() {
        return doctorRepository.findAvailableDoctors().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Replaces a doctor's available slots list.
     * Only callable by the authenticated doctor (enforced via @PreAuthorize in controller).
     */
    public DoctorResponse updateAvailability(String username, AvailabilityUpdateRequest request) {
        Doctor doctor = doctorRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + username));
        doctor.setAvailableSlots(request.getAvailableSlots());
        return toResponse(doctorRepository.save(doctor));
    }

    /**
     * Recomputes a doctor's rating average and reviewCount from the reviews collection.
     * Called by ReviewService after each save. Idempotent and cheap (one query + one save).
     */
    public void recalculateRating(String doctorId, java.util.List<Integer> allRatings) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + doctorId));
        if (allRatings == null || allRatings.isEmpty()) {
            doctor.setRating(0.0);
            doctor.setReviewCount(0);
        } else {
            double avg = allRatings.stream().mapToInt(Integer::intValue).average().orElse(0.0);
            // Round to one decimal place for clean display ("4.5", not "4.5333…").
            doctor.setRating(Math.round(avg * 10.0) / 10.0);
            doctor.setReviewCount(allRatings.size());
        }
        doctorRepository.save(doctor);
    }

    private DoctorResponse toResponse(Doctor doctor) {
        return new DoctorResponse(
                doctor.getId(),
                doctor.getUsername(),
                doctor.getEmail(),
                doctor.getSpecialization(),
                doctor.getExperience(),
                doctor.getRating(),
                doctor.getReviewCount(),
                doctor.getAvailableSlots(),
                doctor.getFees(),
                doctor.getQualification(),
                doctor.getBio()
        );
    }
}
