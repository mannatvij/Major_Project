package org.example.repository;

import org.example.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends MongoRepository<Payment, String> {

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    Optional<Payment> findByAppointmentId(String appointmentId);

    List<Payment> findByPatientIdOrderByCreatedAtDesc(String patientId);
}
