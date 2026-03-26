package org.example.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AvailabilityUpdateRequest {
    private List<LocalDateTime> availableSlots;
}
