package org.example.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.example.exception.AppException;
import org.example.model.Doctor;
import org.example.model.Medication;
import org.example.model.Prescription;
import org.example.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * Renders Prescription objects to PDF byte arrays using OpenPDF.
 * Layout: clinic header → doctor info → patient info → diagnosis → Rx table → advice → footer.
 */
@Slf4j
@Service
public class PdfGenerationService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final Color ACCENT       = new Color(21, 101, 192);   // #1565c0
    private static final Color HEADER_BG    = new Color(227, 242, 253);  // #e3f2fd
    private static final Color BORDER_GREY  = new Color(224, 224, 224);

    public byte[] renderPrescription(Prescription rx, Doctor doctor, User patient) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 48, 48, 48, 48);
            PdfWriter.getInstance(doc, out);
            doc.open();

            doc.add(clinicHeader());
            doc.add(spacer(8));
            doc.add(doctorBlock(doctor));
            doc.add(spacer(12));
            doc.add(patientBlock(rx, patient));
            doc.add(spacer(16));
            doc.add(sectionTitle("Diagnosis"));
            doc.add(bodyParagraph(safe(rx.getDiagnosis())));
            doc.add(spacer(12));
            doc.add(sectionTitle("Rx — Prescribed Medications"));
            doc.add(medicationsTable(rx));
            if (rx.getAdvice() != null && !rx.getAdvice().isBlank()) {
                doc.add(spacer(12));
                doc.add(sectionTitle("Advice"));
                doc.add(bodyParagraph(rx.getAdvice()));
            }
            if (rx.getFollowUpDate() != null) {
                doc.add(spacer(12));
                Paragraph followup = bodyParagraph("Follow-up: " + rx.getFollowUpDate().format(DATE));
                followup.getFont().setStyle(Font.BOLD);
                doc.add(followup);
            }
            doc.add(spacer(28));
            doc.add(signatureBlock(doctor));
            doc.add(spacer(20));
            doc.add(footer());

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("[PDF] Failed to generate prescription PDF: {}", e.getMessage(), e);
            throw new AppException("Failed to generate prescription PDF", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ─── Layout helpers ───────────────────────────────────────────────────────

    private Paragraph clinicHeader() {
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, ACCENT);
        Paragraph title = new Paragraph("Smart Healthcare", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
        Paragraph subtitle = new Paragraph("Online Consultation Prescription", subFont);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        title.add("\n");
        title.add(subtitle);
        return title;
    }

    private PdfPTable doctorBlock(Doctor doctor) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        Font nameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.BLACK);
        Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);

        PdfPCell name = new PdfPCell(new Phrase("Dr. " + safe(doctor.getUsername()), nameFont));
        name.setBorder(Rectangle.NO_BORDER);
        name.setPaddingBottom(2);
        t.addCell(name);

        StringBuilder meta = new StringBuilder();
        if (doctor.getQualification() != null) meta.append(doctor.getQualification());
        if (doctor.getSpecialization() != null) {
            if (meta.length() > 0) meta.append("  ·  ");
            meta.append(doctor.getSpecialization());
        }
        PdfPCell metaCell = new PdfPCell(new Phrase(meta.toString(), metaFont));
        metaCell.setBorder(Rectangle.NO_BORDER);
        t.addCell(metaCell);

        PdfPCell hr = new PdfPCell(new Phrase(" "));
        hr.setBorder(Rectangle.BOTTOM);
        hr.setBorderColor(ACCENT);
        hr.setBorderWidthBottom(1.5f);
        hr.setFixedHeight(4f);
        t.addCell(hr);
        return t;
    }

    private PdfPTable patientBlock(Prescription rx, User patient) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        try { t.setWidths(new float[]{1, 1}); } catch (Exception ignored) {}

        t.addCell(labelValue("Patient", safe(patient.getUsername())));
        t.addCell(labelValue("Date", rx.getCreatedAt() != null
                ? rx.getCreatedAt().format(DATE) : "—"));
        t.addCell(labelValue("Prescription ID", "#" + (rx.getId() != null
                ? rx.getId().substring(Math.max(0, rx.getId().length() - 8)) : "—")));
        t.addCell(labelValue("Appointment", "#" + (rx.getAppointmentId() != null
                ? rx.getAppointmentId().substring(Math.max(0, rx.getAppointmentId().length() - 8)) : "—")));
        return t;
    }

    private PdfPCell labelValue(String label, String value) {
        Font lFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);
        Font vFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK);
        Paragraph p = new Paragraph();
        p.add(new Phrase(label.toUpperCase() + "\n", lFont));
        p.add(new Phrase(value, vFont));
        PdfPCell c = new PdfPCell(p);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingBottom(6);
        return c;
    }

    private Paragraph sectionTitle(String text) {
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, ACCENT);
        return new Paragraph(text, f);
    }

    private Paragraph bodyParagraph(String text) {
        Font f = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.BLACK);
        Paragraph p = new Paragraph(text, f);
        p.setSpacingBefore(2);
        return p;
    }

    private PdfPTable medicationsTable(Prescription rx) {
        PdfPTable t = new PdfPTable(new float[]{0.3f, 1.5f, 0.9f, 1.2f, 0.8f});
        t.setWidthPercentage(100);
        t.setSpacingBefore(6);

        addHeader(t, "#");
        addHeader(t, "Medication");
        addHeader(t, "Dosage");
        addHeader(t, "Frequency");
        addHeader(t, "Duration");

        int i = 1;
        if (rx.getMedications() != null) {
            for (Medication m : rx.getMedications()) {
                addBody(t, String.valueOf(i++));
                addBody(t, safe(m.getName()) +
                        (m.getNotes() != null && !m.getNotes().isBlank()
                                ? "\n(" + m.getNotes() + ")" : ""));
                addBody(t, safe(m.getDosage()));
                addBody(t, safe(m.getFrequency()));
                addBody(t, safe(m.getDuration()));
            }
        }
        return t;
    }

    private void addHeader(PdfPTable t, String text) {
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBackgroundColor(ACCENT);
        c.setPadding(6);
        c.setBorderColor(BORDER_GREY);
        t.addCell(c);
    }

    private void addBody(PdfPTable t, String text) {
        Font f = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setPadding(6);
        c.setBorderColor(BORDER_GREY);
        c.setBackgroundColor(((t.getRows().size() % 2) == 0) ? HEADER_BG : Color.WHITE);
        t.addCell(c);
    }

    private PdfPTable signatureBlock(Doctor doctor) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(50);
        t.setHorizontalAlignment(Element.ALIGN_RIGHT);

        PdfPCell line = new PdfPCell(new Phrase(" "));
        line.setBorder(Rectangle.BOTTOM);
        line.setFixedHeight(28f);
        t.addCell(line);

        Font small = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
        PdfPCell label = new PdfPCell(new Phrase("Dr. " + safe(doctor.getUsername()), small));
        label.setBorder(Rectangle.NO_BORDER);
        label.setHorizontalAlignment(Element.ALIGN_CENTER);
        t.addCell(label);

        Font tiny = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
        PdfPCell signed = new PdfPCell(new Phrase("Digital signature", tiny));
        signed.setBorder(Rectangle.NO_BORDER);
        signed.setHorizontalAlignment(Element.ALIGN_CENTER);
        t.addCell(signed);
        return t;
    }

    private Paragraph footer() {
        Font f = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY);
        Paragraph p = new Paragraph(
                "This is a computer-generated prescription from Smart Healthcare. " +
                        "Please consult your physician before discontinuing any medication.", f);
        p.setAlignment(Element.ALIGN_CENTER);
        return p;
    }

    private Paragraph spacer(float h) {
        Paragraph p = new Paragraph(" ");
        p.setSpacingAfter(h);
        return p;
    }

    private static String safe(String s) {
        return s == null ? "—" : s;
    }
}
