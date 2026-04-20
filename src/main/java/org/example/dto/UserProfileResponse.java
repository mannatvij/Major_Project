package org.example.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
public class UserProfileResponse {
    // ── Common ──────────────────────────────────────────────────────────────
    private String id;
    private String username;
    private String email;
    private String role;
    private LocalDateTime createdAt;

    // ── Patient-specific (null for doctors) ─────────────────────────────────
    private Integer age;
    private String gender;
    private String bloodGroup;
    private List<String> medicalHistory;

    // ── Doctor-specific (null for patients) ─────────────────────────────────
    private String specialization;
    private Integer experience;
    private String qualification;
    private Double fees;
    private Double rating;

    // ── Admin-managed ────────────────────────────────────────────────────────
    private Boolean active;
}
