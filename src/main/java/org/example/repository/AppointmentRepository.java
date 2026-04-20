package org.example.repository;

import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {

    List<Appointment> findByPatientId(String patientId);

    List<Appointment> findByPatientIdOrderByDateTimeDesc(String patientId);

    List<Appointment> findByDoctorId(String doctorId);

    List<Appointment> findByDoctorIdOrderByDateTimeDesc(String doctorId);

    List<Appointment> findByStatus(AppointmentStatus status);

    List<Appointment> findByPatientIdAndStatus(String patientId, AppointmentStatus status);

    List<Appointment> findByDoctorIdAndStatus(String doctorId, AppointmentStatus status);

    List<Appointment> findByDateTimeBetween(LocalDateTime start, LocalDateTime end);

    List<Appointment> findByDoctorIdAndDateTimeBetween(String doctorId, LocalDateTime start, LocalDateTime end);

    boolean existsByPatientIdAndDoctorIdAndDateTime(String patientId, String doctorId, LocalDateTime dateTime);

    List<Appointment> findByStatusAndDateTimeBetween(
            AppointmentStatus status, LocalDateTime start, LocalDateTime end);

    List<Appointment> findByPatientIdAndDateTimeBetween(
            String patientId, LocalDateTime start, LocalDateTime end);
}
