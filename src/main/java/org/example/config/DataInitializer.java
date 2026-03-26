package org.example.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.model.Doctor;
import org.example.model.Role;
import org.example.repository.DoctorRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        List<Doctor> samples = List.of(
            doctor("dr_rajesh",  "rajesh@hospital.com",  "Cardiology",   15, 4.8, 500.0),
            doctor("dr_priya",   "priya@hospital.com",   "Neurology",    12, 4.7, 600.0),
            doctor("dr_amit",    "amit@hospital.com",    "Orthopedics",   8, 4.5, 400.0),
            doctor("dr_sunita",  "sunita@hospital.com",  "Cardiology",   20, 4.9, 700.0),
            doctor("dr_kumar",   "kumar@hospital.com",   "Dermatology",   6, 4.3, 350.0),
            doctor("dr_meena",   "meena@hospital.com",   "Neurology",    10, 4.6, 550.0),
            doctor("dr_arjun",   "arjun@hospital.com",   "Orthopedics",  14, 4.4, 450.0),
            doctor("dr_kavitha", "kavitha@hospital.com", "Dermatology",   9, 4.2, 300.0)
        );

        // Upsert by username:
        //   - New doctors are created in full.
        //   - Existing doctors have their availableSlots refreshed to the next 7 days.
        long created = 0, updated = 0;
        for (Doctor sample : samples) {
            var existing = doctorRepository.findByUsername(sample.getUsername());
            if (existing.isEmpty()) {
                doctorRepository.save(sample);
                created++;
            } else {
                Doctor d = existing.get();
                d.setAvailableSlots(generateSlots());
                doctorRepository.save(d);
                updated++;
            }
        }
        log.info("DataInitializer: {} doctors created, {} doctors had slots refreshed.", created, updated);
    }

    private Doctor doctor(String username, String email, String specialization,
                          int experience, double rating, double fees) {
        Doctor d = new Doctor();
        d.setUsername(username);
        d.setEmail(email);
        d.setPassword(passwordEncoder.encode("doctor123"));
        d.setRole(Role.DOCTOR);
        d.setCreatedAt(LocalDateTime.now());
        d.setSpecialization(specialization);
        d.setExperience(experience);
        d.setRating(rating);
        d.setFees(fees);
        d.setAvailableSlots(generateSlots());
        return d;
    }

    /**
     * Generates slots for the next 7 days.
     * Each day gets 4 slots: 09:00, 11:00, 14:00, 16:00.
     * Day 0 (today) is skipped so all slots are in the future.
     */
    private List<LocalDateTime> generateSlots() {
        int[] hours = {9, 11, 14, 16};
        List<LocalDateTime> slots = new ArrayList<>();
        LocalDateTime base = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
        for (int day = 1; day <= 7; day++) {
            LocalDateTime dayBase = base.plusDays(day);
            for (int hour : hours) {
                slots.add(dayBase.withHour(hour));
            }
        }
        return slots;
    }
}
