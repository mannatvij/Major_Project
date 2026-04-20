package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.Doctor;
import org.example.model.Reminder;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.ReminderRepository;
import org.example.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final EmailService emailService;

    /**
     * Runs daily at 09:00 AM.
     * Creates "24H_BEFORE" reminder records for appointments happening the next day
     * that don't already have a reminder scheduled.
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void scheduleDailyReminders() {
        LocalDateTime now         = LocalDateTime.now();
        LocalDateTime windowStart = now.plusHours(23);
        LocalDateTime windowEnd   = now.plusHours(25);

        List<Appointment> upcoming = appointmentRepository
                .findByStatusAndDateTimeBetween(AppointmentStatus.CONFIRMED, windowStart, windowEnd);

        int created = 0;
        for (Appointment appt : upcoming) {
            String userId = appt.getPatientId();
            if (!reminderRepository.existsByAppointmentIdAndUserIdAndReminderType(
                    appt.getId(), userId, "24H_BEFORE")) {

                Reminder r = new Reminder();
                r.setAppointmentId(appt.getId());
                r.setUserId(userId);
                r.setReminderType("24H_BEFORE");
                r.setReminderTime(now);         // fire now since we run daily at 9 AM
                r.setSent(false);
                r.setCreatedAt(now);
                reminderRepository.save(r);
                created++;
            }
        }
        log.info("[REMINDER-SCHEDULER] {} new 24H reminders created for {} upcoming appointments",
                created, upcoming.size());
    }

    /**
     * Runs every hour.
     * Finds all unsent reminders whose reminderTime has passed, sends the email,
     * then marks them as sent.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void processReminders() {
        List<Reminder> due = reminderRepository
                .findByIsSentFalseAndReminderTimeBefore(LocalDateTime.now());

        int sent = 0;
        for (Reminder r : due) {
            try {
                Appointment appt = appointmentRepository.findById(r.getAppointmentId()).orElse(null);
                if (appt == null || appt.getStatus() != AppointmentStatus.CONFIRMED) {
                    // Skip if appointment was cancelled or completed
                    r.setSent(true);
                    r.setSentAt(LocalDateTime.now());
                    reminderRepository.save(r);
                    continue;
                }

                User patient = userRepository.findById(r.getUserId()).orElse(null);
                Doctor doctor = doctorRepository.findById(appt.getDoctorId()).orElse(null);
                if (patient == null || doctor == null) continue;

                emailService.sendAppointmentReminder(appt, patient, doctor);

                r.setSent(true);
                r.setSentAt(LocalDateTime.now());
                reminderRepository.save(r);
                sent++;
            } catch (Exception e) {
                log.error("[REMINDER-SCHEDULER] Failed to process reminder {}: {}", r.getId(), e.getMessage());
            }
        }
        if (!due.isEmpty()) {
            log.info("[REMINDER-SCHEDULER] Processed {}/{} reminders", sent, due.size());
        }
    }
}
