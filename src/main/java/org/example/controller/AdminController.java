package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.dto.PageResponse;
import org.example.dto.UserProfileResponse;
import org.example.dto.UserStatusUpdateRequest;
import org.example.model.*;
import org.example.repository.AppointmentRepository;
import org.example.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin-only endpoints for dashboard statistics and user management")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    // ─── GET /api/admin/stats ─────────────────────────────────────────────────

    @Operation(summary = "Dashboard statistics",
               description = "Returns user counts, appointment metrics, revenue, trends, and top specializations. "
                           + "The 'days' param controls how far back the time-series goes (default 7).")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(defaultValue = "7") int days) {

        List<User>        allUsers        = userRepository.findAll();
        List<Appointment> allAppointments = appointmentRepository.findAll();

        // ── Build doctor lookup map once ──────────────────────────────────────
        Map<String, Doctor> doctorsById = allUsers.stream()
                .filter(u -> u instanceof Doctor)
                .collect(Collectors.toMap(User::getId, u -> (Doctor) u));

        // ── User counts ───────────────────────────────────────────────────────
        long totalPatients = allUsers.stream().filter(u -> u.getRole() == Role.PATIENT).count();
        long totalDoctors  = allUsers.stream().filter(u -> u.getRole() == Role.DOCTOR).count();
        long totalAdmins   = allUsers.stream().filter(u -> u.getRole() == Role.ADMIN).count();

        // ── Appointment counts by status ──────────────────────────────────────
        Map<AppointmentStatus, Long> byStatus = allAppointments.stream()
                .collect(Collectors.groupingBy(Appointment::getStatus, Collectors.counting()));

        long pending   = byStatus.getOrDefault(AppointmentStatus.PENDING,   0L);
        long confirmed = byStatus.getOrDefault(AppointmentStatus.CONFIRMED, 0L);
        long completed = byStatus.getOrDefault(AppointmentStatus.COMPLETED, 0L);
        long cancelled = byStatus.getOrDefault(AppointmentStatus.CANCELLED, 0L);

        // ── Appointments per day for the last N days ──────────────────────────
        LocalDateTime cutoff = LocalDate.now().minusDays(days - 1L).atStartOfDay();

        Map<LocalDate, Long> byDay = allAppointments.stream()
                .filter(a -> a.getDateTime() != null && !a.getDateTime().isBefore(cutoff))
                .collect(Collectors.groupingBy(
                        a -> a.getDateTime().toLocalDate(), Collectors.counting()));

        List<Map<String, Object>> recentDays = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",  d.toString());
            entry.put("count", byDay.getOrDefault(d, 0L));
            recentDays.add(entry);
        }

        // ── Top 5 specializations by appointment volume ───────────────────────
        Map<String, Long> specCount = allAppointments.stream()
                .map(a -> doctorsById.get(a.getDoctorId()))
                .filter(Objects::nonNull)
                .map(Doctor::getSpecialization)
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

        List<Map<String, Object>> topSpecializations = specCount.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("specialization", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        // ── Doctor performance (top 5 by total appointments) ──────────────────
        List<Map<String, Object>> doctorPerformance = doctorsById.values().stream()
                .map(d -> buildDoctorMetrics(d, allAppointments))
                .sorted((a, b) -> ((Integer) b.get("totalAppointments"))
                        .compareTo((Integer) a.get("totalAppointments")))
                .limit(5)
                .collect(Collectors.toList());

        // ── Total revenue ─────────────────────────────────────────────────────
        double totalRevenue = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .mapToDouble(a -> {
                    Doctor d = doctorsById.get(a.getDoctorId());
                    return d != null ? d.getFees() : 0.0;
                })
                .sum();

        // ── Assemble response ─────────────────────────────────────────────────
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalPatients",    totalPatients);
        stats.put("totalDoctors",     totalDoctors);
        stats.put("totalAdmins",      totalAdmins);
        stats.put("totalAppointments", allAppointments.size());
        stats.put("appointmentsByStatus", Map.of(
                "pending",   pending,
                "confirmed", confirmed,
                "completed", completed,
                "cancelled", cancelled));
        stats.put("appointmentsRecent",   recentDays);
        stats.put("topSpecializations",   topSpecializations);
        stats.put("doctorPerformance",    doctorPerformance);
        stats.put("totalRevenue",         totalRevenue);
        stats.put("days",                 days);

        return ResponseEntity.ok(stats);
    }

    // ─── GET /api/admin/appointments/trends ──────────────────────────────────

    @Operation(summary = "Appointment trends for last 30 days")
    @GetMapping("/appointments/trends")
    public ResponseEntity<List<Map<String, Object>>> getAppointmentTrends() {

        LocalDateTime cutoff = LocalDate.now().minusDays(29).atStartOfDay();
        List<Appointment> appointments = appointmentRepository
                .findByDateTimeBetween(cutoff, LocalDateTime.now().plusDays(1));

        Map<LocalDate, Long> byDay = appointments.stream()
                .filter(a -> a.getDateTime() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getDateTime().toLocalDate(), Collectors.counting()));

        List<Map<String, Object>> trends = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",  d.toString());
            entry.put("count", byDay.getOrDefault(d, 0L));
            trends.add(entry);
        }
        return ResponseEntity.ok(trends);
    }

    // ─── GET /api/admin/doctors/performance ──────────────────────────────────

    @Operation(summary = "Paginated doctor performance metrics")
    @GetMapping("/doctors/performance")
    public ResponseEntity<PageResponse<Map<String, Object>>> getDoctorPerformance(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        List<Appointment> allAppointments = appointmentRepository.findAll();
        List<Map<String, Object>> performance = userRepository.findByRole(Role.DOCTOR).stream()
                .filter(u -> u instanceof Doctor)
                .map(u -> buildDoctorMetrics((Doctor) u, allAppointments))
                .sorted((a, b) -> ((Integer) b.get("totalAppointments"))
                        .compareTo((Integer) a.get("totalAppointments")))
                .collect(Collectors.toList());

        int total      = performance.size();
        int fromIndex  = Math.min(page * size, total);
        int toIndex    = Math.min(fromIndex + size, total);

        return ResponseEntity.ok(new PageResponse<>(
                performance.subList(fromIndex, toIndex),
                page, size, total,
                (int) Math.ceil((double) total / size),
                toIndex >= total));
    }

    // ─── GET /api/admin/users ────────────────────────────────────────────────

    @Operation(summary = "List all users with optional filters and pagination")
    @GetMapping("/users")
    public ResponseEntity<PageResponse<UserProfileResponse>> getUsers(
            @RequestParam(defaultValue = "0")   int    page,
            @RequestParam(defaultValue = "10")  int    size,
            @RequestParam(required = false)     String role,
            @RequestParam(required = false)     String search) {

        Stream<User> stream = userRepository.findAll().stream();

        if (role != null && !role.isBlank()) {
            Role roleEnum = Role.valueOf(role.toUpperCase());
            stream = stream.filter(u -> u.getRole() == roleEnum);
        }
        if (search != null && !search.isBlank()) {
            String lower = search.toLowerCase();
            stream = stream.filter(u ->
                    (u.getUsername() != null && u.getUsername().toLowerCase().contains(lower)) ||
                    (u.getEmail()    != null && u.getEmail().toLowerCase().contains(lower)));
        }

        List<UserProfileResponse> responses = stream
                .map(this::toUserResponse)
                .collect(Collectors.toList());

        int total     = responses.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex   = Math.min(fromIndex + size, total);

        return ResponseEntity.ok(new PageResponse<>(
                responses.subList(fromIndex, toIndex),
                page, size, total,
                (int) Math.ceil((double) total / size),
                toIndex >= total));
    }

    // ─── PUT /api/admin/users/{id}/status ────────────────────────────────────

    @Operation(summary = "Activate or deactivate a user account")
    @PutMapping("/users/{id}/status")
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @PathVariable String id,
            @RequestBody UserStatusUpdateRequest request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        user.setActive(request.isActive());
        userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(user));
    }

    // ─── DELETE /api/admin/users/{id} ────────────────────────────────────────

    @Operation(summary = "Permanently delete a user account")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found: " + id);
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Map<String, Object> buildDoctorMetrics(Doctor d, List<Appointment> allAppointments) {
        List<Appointment> mine = allAppointments.stream()
                .filter(a -> d.getId().equals(a.getDoctorId()))
                .collect(Collectors.toList());

        int completed = (int) mine.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .count();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("doctorId",             d.getId());
        m.put("name",                 d.getUsername());
        m.put("specialization",       d.getSpecialization());
        m.put("totalAppointments",    mine.size());
        m.put("completedAppointments", completed);
        m.put("revenue",              completed * d.getFees());
        m.put("rating",               d.getRating());
        return m;
    }

    private UserProfileResponse toUserResponse(User user) {
        UserProfileResponse r = new UserProfileResponse();
        r.setId(user.getId());
        r.setUsername(user.getUsername());
        r.setEmail(user.getEmail());
        r.setRole(user.getRole() != null ? user.getRole().name() : null);
        r.setCreatedAt(user.getCreatedAt());
        // null active field means the account existed before this feature → treat as active
        r.setActive(user.getActive() == null || user.getActive());

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
