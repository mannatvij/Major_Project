package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private String id;
    private String appointmentId;
    private String doctorId;
    private String doctorName;
    private String patientId;
    private String patientName;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}
