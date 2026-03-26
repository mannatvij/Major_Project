package org.example.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.example.model.AppointmentStatus;

@Data
public class StatusUpdateRequest {

    @NotNull(message = "Status is required")
    private AppointmentStatus status;
}
