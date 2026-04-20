package org.example.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.Doctor;
import org.example.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("EEEE, dd MMM yyyy 'at' hh:mm a");

    // ─── Guard ────────────────────────────────────────────────────────────────

    private boolean isConfigured() {
        return mailSender != null
                && mailFrom != null
                && !mailFrom.isBlank()
                && !mailFrom.startsWith("$");
    }

    // ─── Public send methods ──────────────────────────────────────────────────

    /** Sent immediately when a patient books — status is still PENDING. */
    @Async
    public void sendAppointmentBooked(Appointment appt, User patient, Doctor doctor) {
        if (!isConfigured()) {
            log.info("[EMAIL-SKIP] Booked notification skipped for appointment {}", appt.getId());
            return;
        }
        log.info("[EMAIL] Attempting booked email → patient={} appointment={}",
                patient.getEmail(), appt.getId());
        String subject = "Appointment Booked – Smart Healthcare";
        String body    = buildBookedHtml(appt, patient, doctor);
        send(patient.getEmail(), subject, body);
        log.info("[EMAIL] ✅ Booked email sent → patient={}, appointment={}",
                patient.getEmail(), appt.getId());
    }

    /** Sent when the doctor confirms — status changes to CONFIRMED. */
    @Async
    public void sendAppointmentConfirmation(Appointment appt, User patient, Doctor doctor) {
        if (!isConfigured()) {
            log.info("[EMAIL-SKIP] Confirmation skipped for appointment {}", appt.getId());
            return;
        }
        log.info("[EMAIL] Attempting confirmation email → patient={} doctor={} appointment={}",
                patient.getEmail(), doctor.getEmail(), appt.getId());
        String subject = "Appointment Confirmed – Smart Healthcare";
        String body    = buildConfirmationHtml(appt, patient, doctor);
        sendWithCc(patient.getEmail(), doctor.getEmail(), subject, body);
        log.info("[EMAIL] ✅ Confirmation sent → patient={} (cc: doctor={}), appointment={}",
                patient.getEmail(), doctor.getEmail(), appt.getId());
    }

    @Async
    public void sendAppointmentReminder(Appointment appt, User patient, Doctor doctor) {
        if (!isConfigured()) {
            log.info("[EMAIL-SKIP] Reminder skipped for appointment {}", appt.getId());
            return;
        }
        log.info("[EMAIL] Attempting reminder email → patient={} appointment={}",
                patient.getEmail(), appt.getId());
        String subject = "Reminder: Appointment Tomorrow – Smart Healthcare";
        String body    = buildReminderHtml(appt, patient, doctor);
        sendWithCc(patient.getEmail(), doctor.getEmail(), subject, body);
        log.info("[EMAIL] ✅ Reminder sent → patient={} (cc: doctor={}), appointment={}",
                patient.getEmail(), doctor.getEmail(), appt.getId());
    }

    @Async
    public void sendAppointmentCancellation(Appointment appt, User patient, Doctor doctor) {
        if (!isConfigured()) {
            log.info("[EMAIL-SKIP] Cancellation skipped for appointment {}", appt.getId());
            return;
        }
        log.info("[EMAIL] Attempting cancellation email → patient={} appointment={}",
                patient.getEmail(), appt.getId());
        String subject = "Appointment Cancelled – Smart Healthcare";
        String body    = buildCancellationHtml(appt, patient, doctor);
        send(patient.getEmail(), subject, body);
        log.info("[EMAIL] ✅ Cancellation sent → patient={}, appointment={}",
                patient.getEmail(), appt.getId());
    }

    @Async
    public void sendStatusUpdate(Appointment appt, User patient, Doctor doctor) {
        if (!isConfigured()) {
            log.info("[EMAIL-SKIP] Status update skipped for appointment {}", appt.getId());
            return;
        }
        log.info("[EMAIL] Attempting status-update email → status={} patient={} appointment={}",
                appt.getStatus(), patient.getEmail(), appt.getId());
        if (appt.getStatus() == AppointmentStatus.CONFIRMED) {
            sendAppointmentConfirmation(appt, patient, doctor);
        } else if (appt.getStatus() == AppointmentStatus.CANCELLED) {
            sendAppointmentCancellation(appt, patient, doctor);
        }
    }

    // ─── Core send ────────────────────────────────────────────────────────────

    /** Send to one recipient with no CC. */
    private void send(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            log.warn("[EMAIL] ❌ Recipient address is blank — skipping '{}'", subject);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("[EMAIL] ❌ Failed to send '{}' to {}: {}", subject, to, e.getMessage());
        }
    }

    /** Send to a primary recipient and CC a second address (ignored if blank). */
    private void sendWithCc(String to, String cc, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            log.warn("[EMAIL] ❌ Recipient address is blank — skipping '{}'", subject);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            if (cc != null && !cc.isBlank() && !cc.equals(to)) {
                helper.setCc(cc);
            }
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("[EMAIL] ❌ Failed to send '{}' to {} (cc {}): {}", subject, to, cc, e.getMessage());
        }
    }

    // ─── HTML templates ───────────────────────────────────────────────────────

    private String buildBookedHtml(Appointment appt, User patient, Doctor doctor) {
        String when = appt.getDateTime() != null ? appt.getDateTime().format(DATE_FMT) : "—";
        return wrapLayout("Appointment Booked", "#1565c0",
            "<p>Dear <strong>" + patient.getUsername() + "</strong>,</p>" +
            "<p>Your appointment request has been <strong style='color:#1565c0'>successfully booked</strong>.</p>" +
            buildDetailsTable(doctor, when, appt.getSymptoms()) +
            "<p style='margin-top:20px;padding:12px;background:#fff8e1;border-left:4px solid #f9a825;border-radius:4px'>" +
            "⏳ <strong>Awaiting doctor approval.</strong> A confirmation email will be sent to you once Dr. " +
            doctor.getUsername() + " approves your appointment." +
            "</p>"
        );
    }

    private String buildConfirmationHtml(Appointment appt, User patient, Doctor doctor) {
        String when = appt.getDateTime() != null ? appt.getDateTime().format(DATE_FMT) : "—";
        return wrapLayout("Appointment Confirmed ✓", "#2e7d32",
            "<p>Dear <strong>" + patient.getUsername() + "</strong>,</p>" +
            "<p>Great news! Your appointment has been <strong style='color:#2e7d32'>confirmed by Dr. " +
            doctor.getUsername() + "</strong>.</p>" +
            buildDetailsTable(doctor, when, appt.getSymptoms()) +
            "<p style='margin-top:20px'>Please arrive 10 minutes before your scheduled time.</p>"
        );
    }

    private String buildReminderHtml(Appointment appt, User patient, Doctor doctor) {
        String when = appt.getDateTime() != null ? appt.getDateTime().format(DATE_FMT) : "—";
        return wrapLayout("Appointment Reminder ⏰", "#1565c0",
            "<p>Dear <strong>" + patient.getUsername() + "</strong>,</p>" +
            "<p>This is a friendly reminder about your <strong>upcoming appointment tomorrow</strong>.</p>" +
            buildDetailsTable(doctor, when, appt.getSymptoms()) +
            "<p style='margin-top:20px'>Don't forget! See you tomorrow.</p>"
        );
    }

    private String buildCancellationHtml(Appointment appt, User patient, Doctor doctor) {
        String when = appt.getDateTime() != null ? appt.getDateTime().format(DATE_FMT) : "—";
        return wrapLayout("Appointment Cancelled", "#c62828",
            "<p>Dear <strong>" + patient.getUsername() + "</strong>,</p>" +
            "<p>Your appointment has been <strong style='color:#c62828'>cancelled</strong>.</p>" +
            buildDetailsTable(doctor, when, appt.getSymptoms()) +
            "<p style='margin-top:20px'>You can book a new appointment anytime through Smart Healthcare.</p>"
        );
    }

    private String buildDetailsTable(Doctor doctor, String when, String symptoms) {
        return "<table style='border-collapse:collapse;width:100%;margin-top:16px'>" +
            row("Doctor",         "Dr. " + doctor.getUsername()) +
            row("Specialization", doctor.getSpecialization() != null ? doctor.getSpecialization() : "—") +
            row("Date &amp; Time", when) +
            row("Location",       "Smart Healthcare Clinic") +
            (symptoms != null && !symptoms.isBlank() ? row("Symptoms", symptoms) : "") +
            "</table>";
    }

    private String row(String label, String value) {
        return "<tr>" +
            "<td style='padding:8px 12px;border:1px solid #e0e0e0;background:#f5f5f5;font-weight:600;width:140px'>" + label + "</td>" +
            "<td style='padding:8px 12px;border:1px solid #e0e0e0'>" + value + "</td>" +
            "</tr>";
    }

    private String wrapLayout(String title, String accentColor, String content) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)'>" +
            "<div style='background:" + accentColor + ";padding:24px 32px'>" +
            "<h1 style='margin:0;color:#fff;font-size:22px'>🏥 Smart Healthcare</h1></div>" +
            "<div style='padding:32px'>" +
            "<h2 style='margin-top:0;color:" + accentColor + "'>" + title + "</h2>" +
            content +
            "</div>" +
            "<div style='background:#f5f5f5;padding:16px 32px;text-align:center;color:#9e9e9e;font-size:12px'>" +
            "Smart Healthcare · This is an automated message, please do not reply." +
            "</div></div></body></html>";
    }
}
