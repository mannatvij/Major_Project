package org.example.repository;

import org.example.model.Prescription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends MongoRepository<Prescription, String> {

    Optional<Prescription> findByAppointmentId(String appointmentId);

    List<Prescription> findByPatientIdOrderByCreatedAtDesc(String patientId);

    List<Prescription> findByDoctorIdOrderByCreatedAtDesc(String doctorId);
}
