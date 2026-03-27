package org.example.service;

import lombok.RequiredArgsConstructor;
import org.example.dto.ChangePasswordRequest;
import org.example.dto.ProfileUpdateRequest;
import org.example.dto.RegisterRequest;
import org.example.dto.UserProfileResponse;
import org.example.model.Doctor;
import org.example.model.Patient;
import org.example.model.Role;
import org.example.model.User;
import org.example.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        Role role = request.getRole() != null ? request.getRole() : Role.PATIENT;

        User user = switch (role) {
            case PATIENT -> new Patient();
            case DOCTOR  -> new Doctor();
            default      -> new User();
        };

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    /** Returns the full profile of the currently authenticated user. */
    public UserProfileResponse getProfile(String username) {
        return toProfileResponse(findByUsername(username));
    }

    /**
     * Updates common + role-specific profile fields for the authenticated user.
     * Username uniqueness is validated before saving.
     * Note: changing username invalidates the current JWT — the client should re-login.
     */
    public UserProfileResponse updateProfile(String currentUsername, ProfileUpdateRequest request) {
        User user = findByUsername(currentUsername);

        // ── Common fields ─────────────────────────────────────────────────────
        if (request.getUsername() != null && !request.getUsername().isBlank()
                && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username already taken");
            }
            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already in use");
            }
            user.setEmail(request.getEmail());
        }

        // ── Patient-specific fields ───────────────────────────────────────────
        if (user instanceof Patient patient) {
            if (request.getAge() != null)           patient.setAge(request.getAge());
            if (request.getGender() != null)        patient.setGender(request.getGender());
            if (request.getBloodGroup() != null)    patient.setBloodGroup(request.getBloodGroup());
            if (request.getMedicalHistory() != null) patient.setMedicalHistory(request.getMedicalHistory());
        }

        // ── Doctor-specific fields ────────────────────────────────────────────
        if (user instanceof Doctor doctor) {
            if (request.getSpecialization() != null) doctor.setSpecialization(request.getSpecialization());
            if (request.getExperience() != null)     doctor.setExperience(request.getExperience());
            if (request.getQualification() != null)  doctor.setQualification(request.getQualification());
            if (request.getFees() != null)           doctor.setFees(request.getFees());
        }

        return toProfileResponse(userRepository.save(user));
    }

    /**
     * Changes the password for the authenticated user.
     * Verifies currentPassword before encoding and saving the new one.
     */
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = findByUsername(username);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    /** Admin-only: fetch any user by their MongoDB ID. */
    public UserProfileResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return toProfileResponse(user);
    }

    private UserProfileResponse toProfileResponse(User user) {
        UserProfileResponse r = new UserProfileResponse();
        r.setId(user.getId());
        r.setUsername(user.getUsername());
        r.setEmail(user.getEmail());
        r.setRole(user.getRole() != null ? user.getRole().name() : null);
        r.setCreatedAt(user.getCreatedAt());

        if (user instanceof Patient p) {
            r.setAge(p.getAge() == 0 ? null : p.getAge());
            r.setGender(p.getGender());
            r.setBloodGroup(p.getBloodGroup());
            r.setMedicalHistory(p.getMedicalHistory());
        }

        if (user instanceof Doctor d) {
            r.setSpecialization(d.getSpecialization());
            r.setExperience(d.getExperience() == 0 ? null : d.getExperience());
            r.setQualification(d.getQualification());
            r.setFees(d.getFees() == 0.0 ? null : d.getFees());
            r.setRating(d.getRating() == 0.0 ? null : d.getRating());
        }

        return r;
    }
}
