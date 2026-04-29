package org.example.repository;

import org.example.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends MongoRepository<Review, String> {

    Optional<Review> findByAppointmentId(String appointmentId);

    Page<Review> findByDoctorIdOrderByCreatedAtDesc(String doctorId, Pageable pageable);

    List<Review> findByDoctorId(String doctorId);

    long countByDoctorId(String doctorId);
}
