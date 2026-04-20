package org.example.service;

import org.example.model.Appointment;
import org.example.model.Doctor;
import org.example.model.User;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class CalendarService {

    private static final DateTimeFormatter ICS_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
    private static final DateTimeFormatter GOOGLE_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    // ─── ICS ─────────────────────────────────────────────────────────────────

    public byte[] generateICSFile(Appointment appt, User patient, Doctor doctor) {
        ZoneId zone = ZoneId.systemDefault();
        LocalDateTime dt = appt.getDateTime();
        ZonedDateTime start = dt.atZone(zone).withZoneSameInstant(ZoneId.of("UTC"));
        ZonedDateTime end   = start.plusMinutes(30);

        String uid      = "appt-" + appt.getId() + "@smarthealthcare";
        String summary  = "Appointment with Dr. " + doctor.getUsername();
        String location = "Smart Healthcare Clinic";
        String desc     = "Doctor: Dr. " + doctor.getUsername()
                        + "\\nSpecialization: " + nvl(doctor.getSpecialization())
                        + (appt.getSymptoms() != null && !appt.getSymptoms().isBlank()
                           ? "\\nSymptoms: " + appt.getSymptoms() : "")
                        + "\\nPatient: " + patient.getUsername();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter pw = new PrintWriter(baos);

        pw.println("BEGIN:VCALENDAR");
        pw.println("VERSION:2.0");
        pw.println("PRODID:-//Smart Healthcare//Calendar//EN");
        pw.println("CALSCALE:GREGORIAN");
        pw.println("METHOD:PUBLISH");
        pw.println("BEGIN:VEVENT");
        pw.println("UID:" + uid);
        pw.println("DTSTAMP:" + start.format(ICS_FMT));
        pw.println("DTSTART:" + start.format(ICS_FMT));
        pw.println("DTEND:" + end.format(ICS_FMT));
        pw.println("SUMMARY:" + summary);
        pw.println("DESCRIPTION:" + desc);
        pw.println("LOCATION:" + location);
        pw.println("STATUS:CONFIRMED");
        pw.println("END:VEVENT");
        pw.println("END:VCALENDAR");
        pw.flush();

        return baos.toByteArray();
    }

    // ─── Google Calendar URL ──────────────────────────────────────────────────

    public String generateGoogleCalendarLink(Appointment appt, Doctor doctor) {
        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime start = appt.getDateTime().atZone(zone).withZoneSameInstant(ZoneId.of("UTC"));
        ZonedDateTime end   = start.plusMinutes(30);

        String title    = encode("Appointment with Dr. " + doctor.getUsername());
        String details  = encode("Appointment at Smart Healthcare Clinic. "
                        + "Doctor: Dr. " + doctor.getUsername()
                        + (doctor.getSpecialization() != null
                           ? " (" + doctor.getSpecialization() + ")" : ""));
        String location = encode("Smart Healthcare Clinic");
        String dates    = start.format(GOOGLE_FMT) + "/" + end.format(GOOGLE_FMT);

        return "https://calendar.google.com/calendar/render?action=TEMPLATE"
             + "&text=" + title
             + "&dates=" + dates
             + "&details=" + details
             + "&location=" + location;
    }

    // ─── Outlook Calendar URL ─────────────────────────────────────────────────

    public String generateOutlookCalendarLink(Appointment appt, Doctor doctor) {
        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime start = appt.getDateTime().atZone(zone).withZoneSameInstant(ZoneId.of("UTC"));
        ZonedDateTime end   = start.plusMinutes(30);

        DateTimeFormatter outlookFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

        String title   = encode("Appointment with Dr. " + doctor.getUsername());
        String body    = encode("Smart Healthcare Clinic. Doctor: Dr. " + doctor.getUsername()
                       + (doctor.getSpecialization() != null
                          ? " (" + doctor.getSpecialization() + ")" : ""));
        String loc     = encode("Smart Healthcare Clinic");

        return "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent"
             + "&subject=" + title
             + "&startdt=" + start.format(outlookFmt)
             + "&enddt=" + end.format(outlookFmt)
             + "&body=" + body
             + "&location=" + loc;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String nvl(String value) {
        return value != null ? value : "—";
    }
}
