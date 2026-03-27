package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.dto.ChangePasswordRequest;
import org.example.dto.ProfileUpdateRequest;
import org.example.dto.UserProfileResponse;
import org.example.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * GET /api/users/profile
     * Returns the full profile of the currently authenticated user.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(userService.getProfile(authentication.getName()));
    }

    /**
     * PUT /api/users/profile
     * Updates common + role-specific fields for the currently authenticated user.
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            Authentication authentication,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile(authentication.getName(), request));
    }

    /**
     * PUT /api/users/password
     * Changes password after verifying the current password.
     */
    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @RequestBody ChangePasswordRequest request) {
        userService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/users/{id}
     * Admin-only: look up any user by their MongoDB ObjectId.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserProfileResponse> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }
}
