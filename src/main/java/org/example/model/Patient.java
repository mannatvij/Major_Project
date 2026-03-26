package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "users")
public class Patient extends User {

    /** Past diagnoses, conditions, or notes — one entry per record */
    private List<String> medicalHistory;

    private int age;

    /** e.g. "Male", "Female", "Other" */
    private String gender;

    /** e.g. "A+", "O-", "AB+" */
    private String bloodGroup;
}
