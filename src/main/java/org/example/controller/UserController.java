package org.example.controller;

import lombok.RequiredArgsConstructor;
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
     * Returns the profile of the currently authenticated user.
     * The username is resolved from the JWT via Spring Security's Authentication object.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(userService.getProfile(authentication.getName()));
    }

    /**
     * PUT /api/users/profile
     * Updates username and/or email for the currently authenticated user.
     * Note: updating username invalidates the current JWT — client should re-login.
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            Authentication authentication,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile(authentication.getName(), request));
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
