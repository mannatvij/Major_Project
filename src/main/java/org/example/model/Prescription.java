package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "prescriptions")
public class Prescription {

    @Id
    private String id;

    /** One prescription per appointment — enforced in service layer. */
    @Indexed(unique = true)
    private String appointmentId;

    @Indexed
    private String doctorId;

    @Indexed
    private String patientId;

    /** Doctor's diagnosis / clinical notes (free text). */
    private String diagnosis;

    /** Ordered list of prescribed medications. */
    private List<Medication> medications;

    /** Lifestyle / general advice. */
    private String advice;

    /** Optional date for the patient to follow up. */
    private LocalDate followUpDate;

    private LocalDateTime createdAt;
}
