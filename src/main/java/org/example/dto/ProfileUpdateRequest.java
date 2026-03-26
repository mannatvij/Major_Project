package org.example.dto;

import lombok.Data;

@Data
public class ProfileUpdateRequest {
    private String username;
    private String email;
}
