package org.example.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AppointmentRequest {

    @NotBlank(message = "Doctor ID is required")
    private String doctorId;

    @NotNull(message = "Appointment date/time is required")
    @Future(message = "Appointment must be scheduled in the future")
    private LocalDateTime dateTime;

    @NotBlank(message = "Symptoms description is required")
    @Size(min = 5, max = 500, message = "Symptoms must be between 5 and 500 characters")
    private String symptoms;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}
