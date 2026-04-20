package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.model.Doctor;
import org.example.model.Role;
import org.example.repository.DoctorRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlotManagementService {

    /** Canonical slot hours per day — single source of truth used by DataInitializer too. */
    public static final int[] SLOT_HOURS = {9, 11, 13, 15, 17};

    private final DoctorRepository doctorRepository;

    // ─── Scheduled maintenance ────────────────────────────────────────────────

    /**
     * Runs at the top of every hour.
     * For every doctor: prunes past slots and fills the rolling 7-day window.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void maintainAllDoctorSlots() {
        List<Doctor> doctors = doctorRepository.findByRole(Role.DOCTOR);
        int saved = 0;
        for (Doctor d : doctors) {
            if (maintainSlotsForDoctor(d)) {
                doctorRepository.save(d);
                saved++;
            }
        }
        log.info("SlotManagement: refreshed {}/{} doctors.", saved, doctors.size());
    }

    // ─── Called at booking time ───────────────────────────────────────────────

    /**
     * Removes one specific slot from a doctor's availableSlots and saves immediately.
     * Ensures the slot cannot be double-booked by a second patient.
     */
    public void removeBookedSlot(Doctor doctor, LocalDateTime bookedSlot) {
        List<LocalDateTime> slots = new ArrayList<>(
                doctor.getAvailableSlots() == null ? List.of() : doctor.getAvailableSlots());
        if (slots.remove(bookedSlot)) {
            doctor.setAvailableSlots(slots);
            doctorRepository.save(doctor);
            log.debug("Removed booked slot {} from doctor {}", bookedSlot, doctor.getUsername());
        } else {
            log.warn("Slot {} was not found in {}'s list at booking time — already removed?",
                    bookedSlot, doctor.getUsername());
        }
    }

    // ─── Core algorithm ───────────────────────────────────────────────────────

    /**
     * Performs in-memory pruning and rolling-window fill on the given Doctor.
     * Does NOT call doctorRepository.save() — the caller is responsible for that.
     *
     * Phase 1 — remove all slots whose dateTime is strictly before now (minute-truncated).
     * Phase 2 — for each of the next 7 calendar days, add any of the 5 standard hours
     *            that are not already present, preserving any non-standard custom slots.
     *
     * @return true if the slot list was modified (caller should then save)
     */
    public boolean maintainSlotsForDoctor(Doctor doctor) {
        LocalDateTime now   = LocalDateTime.now().withSecond(0).withNano(0);
        List<LocalDateTime> slots = new ArrayList<>(
                doctor.getAvailableSlots() == null ? List.of() : doctor.getAvailableSlots());

        // ── Phase 1: prune expired ────────────────────────────────────────────
        int before = slots.size();
        slots.removeIf(s -> s.isBefore(now));

        // ── Phase 2: fill missing standard slots for day+1 … day+7 ──────────
        // Build a "yyyy-MM-dd:H" existence index for O(1) presence checks.
        Set<String> keys = slots.stream()
                .map(s -> s.toLocalDate() + ":" + s.getHour())
                .collect(Collectors.toCollection(HashSet::new));

        boolean added   = false;
        LocalDate today = LocalDate.now();
        for (int day = 1; day <= 7; day++) {
            LocalDate target = today.plusDays(day);
            for (int hour : SLOT_HOURS) {
                String key = target + ":" + hour;
                if (keys.add(key)) {          // add() returns false if key was already present
                    slots.add(target.atTime(hour, 0));
                    added = true;
                }
            }
        }

        if (slots.size() != before || added) {
            slots.sort(LocalDateTime::compareTo);
            doctor.setAvailableSlots(slots);
            return true;
        }
        return false;
    }
}
