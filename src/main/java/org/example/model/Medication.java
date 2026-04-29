package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Embedded value object inside Prescription.medications. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Medication {

    /** e.g., "Paracetamol 500mg" */
    private String name;

    /** e.g., "1 tablet" */
    private String dosage;

    /** e.g., "Twice a day after meals" */
    private String frequency;

    /** e.g., "5 days" */
    private String duration;

    /** Optional extra note for this specific drug (e.g., "Avoid driving"). */
    private String notes;
}
