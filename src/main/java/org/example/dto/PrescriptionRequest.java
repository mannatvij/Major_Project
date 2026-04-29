package org.example.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PrescriptionRequest {

    @NotBlank(message = "appointmentId is required")
    private String appointmentId;

    @NotBlank(message = "Diagnosis is required")
    @Size(max = 2000, message = "Diagnosis must be 2000 characters or fewer")
    private String diagnosis;

    @NotEmpty(message = "Add at least one medication")
    @Valid
    private List<MedicationDto> medications;

    @Size(max = 2000, message = "Advice must be 2000 characters or fewer")
    private String advice;

    private LocalDate followUpDate;
}
