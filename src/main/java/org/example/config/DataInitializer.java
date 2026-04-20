package org.example.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.model.Doctor;
import org.example.model.Role;
import org.example.repository.DoctorRepository;
import org.example.service.SlotManagementService;
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
    private final SlotManagementService slotManagementService;

    @Override
    public void run(String... args) {
        List<Doctor> samples = List.of(
            // Cardiology
            doctor("dr_rajesh",  "rajesh@hospital.com",  "Cardiology",         15, 4.8, 500.0,
                "MBBS, MD (Cardiology), DM",
                "Senior cardiologist with 15 years of experience in interventional cardiology, " +
                "heart failure management, and ECG interpretation. Known for a patient-first approach."),
            doctor("dr_sunita",  "sunita@hospital.com",  "Cardiology",         20, 4.9, 700.0,
                "MBBS, MD (Cardiology), FACC",
                "Chief cardiologist with two decades of expertise in preventive cardiology, " +
                "echocardiography, and complex arrhythmia management. Recipient of Best Cardiologist award."),
            // Neurology
            doctor("dr_priya",   "priya@hospital.com",   "Neurology",          12, 4.7, 600.0,
                "MBBS, MD (Neurology), DM",
                "Neurologist specialising in headache disorders, epilepsy, and stroke rehabilitation. " +
                "Combines clinical expertise with compassionate patient care."),
            doctor("dr_meena",   "meena@hospital.com",   "Neurology",          10, 4.6, 550.0,
                "MBBS, MD (Neurology)",
                "Experienced in diagnosing and treating migraines, vertigo, Parkinson's disease, " +
                "and neuropathy. Active researcher in movement disorders."),
            // Orthopedics
            doctor("dr_amit",    "amit@hospital.com",    "Orthopedics",         8, 4.5, 400.0,
                "MBBS, MS (Orthopedics)",
                "Orthopaedic surgeon skilled in sports injury management, arthroscopy, " +
                "and joint replacement. Trusted by athletes and active patients alike."),
            doctor("dr_arjun",   "arjun@hospital.com",   "Orthopedics",        14, 4.4, 450.0,
                "MBBS, MS (Orthopedics), DNB",
                "Specialist in spine surgery, fracture care, and minimally invasive procedures. " +
                "Over 1,000 successful surgeries with high patient satisfaction scores."),
            // Dermatology
            doctor("dr_kumar",   "kumar@hospital.com",   "Dermatology",         6, 4.3, 350.0,
                "MBBS, MD (Dermatology)",
                "Dermatologist with expertise in acne, eczema, psoriasis, and cosmetic skin treatments. " +
                "Approachable and thorough in diagnosis and long-term skin care planning."),
            doctor("dr_kavitha", "kavitha@hospital.com", "Dermatology",         9, 4.2, 300.0,
                "MBBS, DVD (Dermatology)",
                "Skilled in managing chronic skin conditions, fungal infections, allergic reactions, " +
                "and aesthetic dermatology. Committed to evidence-based skin care."),
            // General Physician
            doctor("dr_sharma",  "sharma@hospital.com",  "General Physician",  10, 4.6, 300.0,
                "MBBS, MD (General Medicine)",
                "Experienced general physician providing comprehensive primary care for fever, " +
                "infections, chronic conditions, and preventive health check-ups. " +
                "Your trusted first point of contact for all health concerns."),
            doctor("dr_patel",   "patel@hospital.com",   "General Physician",   7, 4.4, 250.0,
                "MBBS, DNB (Family Medicine)",
                "Family medicine specialist focused on routine illnesses, health screenings, " +
                "and managing diabetes, hypertension, and lifestyle diseases. " +
                "Known for clear communication and personalised care plans."),
            // Gastroenterology
            doctor("dr_nair",    "nair@hospital.com",    "Gastroenterology",   11, 4.5, 500.0,
                "MBBS, MD (Gastroenterology), DM",
                "Gastroenterologist with extensive experience in IBS, acid reflux, liver diseases, " +
                "and endoscopic procedures. Dedicated to improving digestive health and quality of life."),
            // ENT
            doctor("dr_verma",   "verma@hospital.com",   "ENT",                 8, 4.3, 400.0,
                "MBBS, MS (ENT)",
                "ENT specialist treating sinusitis, tonsillitis, hearing loss, and nasal disorders. " +
                "Proficient in both medical management and minor surgical interventions."),
            // Psychiatry
            doctor("dr_iyer",    "iyer@hospital.com",    "Psychiatry",         13, 4.7, 600.0,
                "MBBS, MD (Psychiatry)",
                "Psychiatrist with 13 years of experience in anxiety, depression, OCD, and PTSD. " +
                "Combines medication management with cognitive behavioural therapy for holistic mental health care."),
            // Ophthalmology
            doctor("dr_reddy",   "reddy@hospital.com",   "Ophthalmology",       9, 4.5, 450.0,
                "MBBS, MS (Ophthalmology), FRCS",
                "Ophthalmologist specialising in cataract surgery, glaucoma, and retinal disorders. " +
                "Committed to preserving and restoring vision with the latest diagnostic technology."),
            // Pediatrics
            doctor("dr_joshi",   "joshi@hospital.com",   "Pediatrics",         12, 4.8, 400.0,
                "MBBS, MD (Pediatrics), DCH",
                "Paediatrician with 12 years of experience in newborn care, vaccination, " +
                "childhood infections, and developmental assessments. Gentle, child-friendly approach.")
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
                // Smart fill: prune expired + add missing future days, preserve manual customisations
                Doctor d = existing.get();
                if (slotManagementService.maintainSlotsForDoctor(d)) {
                    doctorRepository.save(d);
                }
                updated++;
            }
        }
        log.info("DataInitializer: {} doctors created, {} doctors had slots refreshed.", created, updated);
    }

    private Doctor doctor(String username, String email, String specialization,
                          int experience, double rating, double fees,
                          String qualification, String bio) {
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
        d.setQualification(qualification);
        d.setBio(bio);
        d.setAvailableSlots(generateSlots());
        return d;
    }

    /**
     * Generates fresh slots for the next 7 days (used only for brand-new doctors).
     * Each day gets 5 slots at times defined in SlotManagementService.SLOT_HOURS.
     * Day 0 (today) is skipped so all slots are in the future.
     */
    private List<LocalDateTime> generateSlots() {
        List<LocalDateTime> slots = new ArrayList<>();
        LocalDateTime base = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
        for (int day = 1; day <= 7; day++) {
            LocalDateTime dayBase = base.plusDays(day);
            for (int hour : SlotManagementService.SLOT_HOURS) {
                slots.add(dayBase.withHour(hour));
            }
        }
        return slots;
    }
}
