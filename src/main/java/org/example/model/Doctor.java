package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "users")
public class Doctor extends User {

    /** Medical specialization, e.g. "Cardiology", "Neurology" */
    private String specialization;

    /** Years of professional experience */
    private int experience;

    /** Open time slots that patients can book */
    private List<LocalDateTime> availableSlots;

    /** Average rating out of 5.0 */
    private double rating;

    /** Consultation fee in INR */
    private double fees;

    /** Academic qualifications, e.g. "MBBS, MD" */
    private String qualification;

    /** Short description shown on the doctor profile card */
    private String bio;
}
