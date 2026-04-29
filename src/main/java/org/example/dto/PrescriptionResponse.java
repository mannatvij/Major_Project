package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.model.Medication;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {
    private String id;
    private String appointmentId;
    private String doctorId;
    private String doctorName;
    private String doctorQualification;
    private String doctorSpecialization;
    private String patientId;
    private String patientName;
    private String diagnosis;
    private List<Medication> medications;
    private String advice;
    private LocalDate followUpDate;
    private LocalDateTime createdAt;
}
