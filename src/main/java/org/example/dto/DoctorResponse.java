package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorResponse {
    private String id;
    private String name;           // username
    private String email;
    private String specialization;
    private int experience;        // years
    private double rating;         // out of 5.0
    private List<LocalDateTime> availableSlots;
    private double fees;           // consultation fee
    private String qualification;
    private String bio;
}
