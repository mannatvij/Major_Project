package org.example.repository;

import org.example.model.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends MongoRepository<Patient, String> {

    Optional<Patient> findByUsername(String username);

    Optional<Patient> findByEmail(String email);

    List<Patient> findByBloodGroup(String bloodGroup);

    List<Patient> findByGender(String gender);

    List<Patient> findByAgeBetween(int minAge, int maxAge);

    List<Patient> findByMedicalHistoryContaining(String condition);
}
