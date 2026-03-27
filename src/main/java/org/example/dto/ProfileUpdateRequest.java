package org.example.dto;

import lombok.Data;

import java.util.List;

@Data
public class ProfileUpdateRequest {
    // ── Common ──────────────────────────────────────────────────────────────
    private String username;
    private String email;

    // ── Patient-specific ────────────────────────────────────────────────────
    private Integer age;
    private String gender;
    private String bloodGroup;
    private List<String> medicalHistory;

    // ── Doctor-specific ─────────────────────────────────────────────────────
    private String specialization;
    private Integer experience;
    private String qualification;
    private Double fees;
}
