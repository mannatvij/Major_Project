package org.example.dto;

import lombok.Data;
import org.example.model.Role;

@Data
public class RegisterRequest {
    private String username;
    private String email;
    private String password;
    /** Defaults to PATIENT when not provided. */
    private Role role = Role.PATIENT;
}
