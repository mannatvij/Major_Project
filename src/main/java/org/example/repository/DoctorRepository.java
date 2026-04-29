package org.example.repository;

import org.example.model.Doctor;
import org.example.model.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends MongoRepository<Doctor, String> {

    // findAll() doesn't apply _class discrimination; use role-scoped queries instead.
    List<Doctor> findByRole(Role role);                    // used by SlotManagementService
    Page<Doctor> findByRole(Role role, Pageable pageable); // used by DoctorService

    long countByRole(Role role);

    Optional<Doctor> findByUsername(String username);

    Optional<Doctor> findByEmail(String email);

    List<Doctor> findBySpecialization(String specialization);

    List<Doctor> findBySpecializationIgnoreCase(String specialization);

    Page<Doctor> findBySpecializationIgnoreCaseAndRole(String specialization, Role role, Pageable pageable);

    List<Doctor> findByExperienceGreaterThanEqual(int minYears);

    List<Doctor> findByRatingGreaterThanEqual(double minRating);

    List<Doctor> findBySpecializationAndRatingGreaterThanEqual(String specialization, double minRating);

    List<Doctor> findByAvailableSlotsContaining(LocalDateTime slot);

    List<Doctor> findBySpecializationOrderByRatingDesc(String specialization);

    @Query("{ 'availableSlots': { $exists: true, $not: { $size: 0 } } }")
    List<Doctor> findAvailableDoctors();

    /**
     * Doctors visible to patients: role matches AND approved is true OR missing.
     * Pre-feature records have no `approved` field; treat them as approved.
     */
    @Query("{ 'role': ?0, $or: [ { 'approved': { $exists: false } }, { 'approved': true } ] }")
    Page<Doctor> findApprovedByRole(Role role, Pageable pageable);

    @Query(value = "{ 'role': ?1, 'specialization': { $regex: '^?0$', $options: 'i' }, " +
                   "$or: [ { 'approved': { $exists: false } }, { 'approved': true } ] }")
    Page<Doctor> findApprovedBySpecializationAndRole(String specialization, Role role, Pageable pageable);

    /** Doctors awaiting admin approval (approved == false explicitly). */
    @Query("{ 'role': 'DOCTOR', 'approved': false }")
    List<Doctor> findPending();
}
