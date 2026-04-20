package org.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.example.model.Message;

import java.util.List;

@Data
@AllArgsConstructor
public class ChatResponse {
    private String sessionId;
    private Message message;
    private String recommendedSpecialization;
    private List<DoctorResponse> recommendedDoctors;
}
