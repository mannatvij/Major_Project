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
import org.example.repository.PaymentRepository;
import org.example.repository.PrescriptionRepository;
import org.example.repository.ReviewRepository;
import org.example.repository.UserRepository;
import org.example.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private final PaymentRepository paymentRepository;
    private final ReviewRepository reviewRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final DoctorRepository doctorRepository;
    private final MongoTemplate mongoTemplate;

    @Value("${ml.service.enabled:false}")
    private boolean mlEnabled;
    @Value("${ml.service.url:}")
    private String mlServiceUrl;
    @Value("${razorpay.enabled:false}")
    private boolean razorpayLive;
    @Value("${spring.mail.username:}")
    private String mailUsername;

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

        // ── Real payment analytics (replaces fake completed × fees revenue) ────
        List<Payment> allPayments = paymentRepository.findAll();

        double grossRevenue  = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID
                          || p.getStatus() == PaymentStatus.REFUNDED)
                .mapToDouble(Payment::getAmount).sum();
        double refundsAmount = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.REFUNDED)
                .mapToDouble(Payment::getAmount).sum();
        double netRevenue    = grossRevenue - refundsAmount;

        long paidCount     = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID).count();
        long refundCount   = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.REFUNDED).count();
        long failedCount   = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.FAILED).count();
        long createdCount  = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.CREATED).count();
        long resolvedCount = paidCount + failedCount + refundCount;
        double successRate = resolvedCount == 0 ? 0.0 : ((double) paidCount / resolvedCount) * 100.0;
        double avgTicket   = paidCount == 0 ? 0.0 : grossRevenue / (paidCount + refundCount);

        // Revenue trend per day (PAID + REFUNDED amounts grouped by paidAt date)
        Map<LocalDate, Double> revByDay = allPayments.stream()
                .filter(p -> (p.getStatus() == PaymentStatus.PAID || p.getStatus() == PaymentStatus.REFUNDED)
                          && p.getPaidAt() != null
                          && !p.getPaidAt().toLocalDate().isBefore(cutoff.toLocalDate()))
                .collect(Collectors.groupingBy(
                        p -> p.getPaidAt().toLocalDate(),
                        Collectors.summingDouble(Payment::getAmount)));

        List<Map<String, Object>> revenueTrend = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",   d.toString());
            entry.put("amount", revByDay.getOrDefault(d, 0.0));
            revenueTrend.add(entry);
        }

        // ── Reviews analytics ──────────────────────────────────────────────────
        List<Review> allReviews = reviewRepository.findAll();
        double platformAvgRating = allReviews.isEmpty()
                ? 0.0
                : Math.round(allReviews.stream().mapToInt(Review::getRating).average().orElse(0.0) * 10.0) / 10.0;

        List<Map<String, Object>> topRatedDoctors = doctorsById.values().stream()
                .filter(d -> d.getReviewCount() > 0)
                .sorted(Comparator
                        .<Doctor>comparingDouble(Doctor::getRating).reversed()
                        .thenComparing(Comparator.comparingInt(Doctor::getReviewCount).reversed()))
                .limit(5)
                .map(d -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("doctorId",       d.getId());
                    m.put("name",           d.getUsername());
                    m.put("specialization", d.getSpecialization());
                    m.put("rating",         d.getRating());
                    m.put("reviewCount",    d.getReviewCount());
                    return m;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> recentReviews = allReviews.stream()
                .sorted(Comparator.comparing(Review::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("rating",      r.getRating());
                    m.put("comment",     r.getComment());
                    m.put("createdAt",   r.getCreatedAt());
                    Doctor d = doctorsById.get(r.getDoctorId());
                    m.put("doctorName",  d != null ? d.getUsername() : "Unknown");
                    User patient = allUsers.stream()
                            .filter(u -> u.getId().equals(r.getPatientId()))
                            .findFirst().orElse(null);
                    m.put("patientName", patient != null ? patient.getUsername() : "Unknown");
                    return m;
                })
                .collect(Collectors.toList());

        // ── Cancellation rate + prescription count + pending doctor approvals ──
        double cancellationRate = allAppointments.isEmpty()
                ? 0.0
                : Math.round((cancelled * 1000.0 / allAppointments.size())) / 10.0;
        long prescriptionCount = prescriptionRepository.count();
        long pendingDoctors    = doctorRepository.findPending().size();

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

        // Real payment-driven revenue + payment KPIs
        stats.put("grossRevenue",         grossRevenue);
        stats.put("refundsAmount",        refundsAmount);
        stats.put("netRevenue",           netRevenue);
        stats.put("totalRevenue",         netRevenue); // legacy key kept for old UI bindings
        stats.put("revenueTrend",         revenueTrend);
        stats.put("paymentCounts", Map.of(
                "paid",     paidCount,
                "refunded", refundCount,
                "failed",   failedCount,
                "created",  createdCount));
        stats.put("paymentSuccessRate",   Math.round(successRate * 10.0) / 10.0);
        stats.put("avgTicketSize",        Math.round(avgTicket * 100.0) / 100.0);

        // Reviews
        stats.put("platformAvgRating",    platformAvgRating);
        stats.put("totalReviews",         allReviews.size());
        stats.put("topRatedDoctors",      topRatedDoctors);
        stats.put("recentReviews",        recentReviews);

        // Other ops metrics
        stats.put("cancellationRate",     cancellationRate);
        stats.put("totalPrescriptions",   prescriptionCount);
        stats.put("pendingDoctorApprovals", pendingDoctors);

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

    // ─── GET /api/admin/activity ─────────────────────────────────────────────

    @Operation(summary = "Recent platform activity feed (last N events across modules)")
    @GetMapping("/activity")
    public ResponseEntity<List<Map<String, Object>>> getActivity(
            @RequestParam(defaultValue = "20") int limit) {

        Map<String, Doctor> doctorsById = userRepository.findAll().stream()
                .filter(u -> u instanceof Doctor)
                .collect(Collectors.toMap(User::getId, u -> (Doctor) u));
        Map<String, String> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        List<Map<String, Object>> events = new ArrayList<>();

        appointmentRepository.findAll().forEach(a -> {
            if (a.getCreatedAt() == null) return;
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("type", "APPOINTMENT_BOOKED");
            e.put("at",   a.getCreatedAt());
            e.put("text", String.format("%s booked with Dr. %s",
                    usersById.getOrDefault(a.getPatientId(), "patient"),
                    usersById.getOrDefault(a.getDoctorId(), "doctor")));
            events.add(e);
        });
        paymentRepository.findAll().forEach(p -> {
            if (p.getStatus() == PaymentStatus.PAID && p.getPaidAt() != null) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("type", "PAYMENT_RECEIVED");
                e.put("at",   p.getPaidAt());
                e.put("text", String.format("₹%.0f paid by %s",
                        p.getAmount(), usersById.getOrDefault(p.getPatientId(), "patient")));
                events.add(e);
            } else if (p.getStatus() == PaymentStatus.REFUNDED && p.getRefundedAt() != null) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("type", "REFUND_ISSUED");
                e.put("at",   p.getRefundedAt());
                e.put("text", String.format("₹%.0f refunded to %s",
                        p.getAmount(), usersById.getOrDefault(p.getPatientId(), "patient")));
                events.add(e);
            } else if (p.getStatus() == PaymentStatus.FAILED && p.getCreatedAt() != null) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("type", "PAYMENT_FAILED");
                e.put("at",   p.getCreatedAt());
                e.put("text", String.format("Payment of ₹%.0f failed for %s",
                        p.getAmount(), usersById.getOrDefault(p.getPatientId(), "patient")));
                events.add(e);
            }
        });
        prescriptionRepository.findAll().forEach(rx -> {
            if (rx.getCreatedAt() == null) return;
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("type", "PRESCRIPTION_ISSUED");
            e.put("at",   rx.getCreatedAt());
            e.put("text", String.format("Dr. %s prescribed for %s",
                    usersById.getOrDefault(rx.getDoctorId(), "doctor"),
                    usersById.getOrDefault(rx.getPatientId(), "patient")));
            events.add(e);
        });
        reviewRepository.findAll().forEach(r -> {
            if (r.getCreatedAt() == null) return;
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("type", "REVIEW_LEFT");
            e.put("at",   r.getCreatedAt());
            e.put("text", String.format("%s rated Dr. %s %d★",
                    usersById.getOrDefault(r.getPatientId(), "patient"),
                    usersById.getOrDefault(r.getDoctorId(), "doctor"),
                    r.getRating()));
            events.add(e);
        });

        events.sort(Comparator.comparing(
                e -> (LocalDateTime) e.get("at"),
                Comparator.nullsLast(Comparator.reverseOrder())));
        return ResponseEntity.ok(events.stream().limit(limit).collect(Collectors.toList()));
    }

    // ─── GET /api/admin/health ───────────────────────────────────────────────

    @Operation(summary = "Live system health: DB, mailer, ML service, payments")
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new LinkedHashMap<>();

        // Mongo: any document read = up.
        boolean mongoUp;
        try {
            userRepository.count();
            mongoUp = true;
        } catch (Exception e) {
            mongoUp = false;
        }
        health.put("mongo",  Map.of("up", mongoUp));

        // Mailer: configured (env var present) is "ready"; not actually pinged.
        boolean mailerConfigured = mailUsername != null && !mailUsername.isBlank()
                && !mailUsername.startsWith("$");
        health.put("mailer", Map.of("configured", mailerConfigured));

        // ML service: just expose the config flag — actual ping happens on chat.
        Map<String, Object> ml = new LinkedHashMap<>();
        ml.put("enabled", mlEnabled);
        ml.put("url",     mlServiceUrl);
        health.put("ml",     ml);

        // Razorpay: live mode flag from config.
        health.put("razorpay", Map.of("liveMode", razorpayLive));

        return ResponseEntity.ok(health);
    }

    // ─── GET /api/admin/export/{type} ────────────────────────────────────────

    @Operation(summary = "Export users / appointments / payments / reviews as CSV")
    @GetMapping(value = "/export/{type}", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsv(@PathVariable String type) {
        StringBuilder csv = new StringBuilder();
        String filename;
        switch (type) {
            case "users" -> {
                csv.append("id,username,email,role,active,createdAt,specialization,rating,reviewCount,approved\n");
                for (User u : userRepository.findAll()) {
                    String spec = "", approved = "";
                    Double rating = null; Integer reviews = null;
                    if (u instanceof Doctor d) {
                        spec     = nz(d.getSpecialization());
                        rating   = d.getRating();
                        reviews  = d.getReviewCount();
                        approved = String.valueOf(d.isApproved());
                    }
                    csv.append(csvRow(
                            u.getId(), u.getUsername(), u.getEmail(),
                            u.getRole() != null ? u.getRole().name() : "",
                            String.valueOf(u.getActive() == null || u.getActive()),
                            u.getCreatedAt() != null ? u.getCreatedAt().toString() : "",
                            spec,
                            rating == null ? "" : String.valueOf(rating),
                            reviews == null ? "" : String.valueOf(reviews),
                            approved));
                }
                filename = "users.csv";
            }
            case "appointments" -> {
                csv.append("id,patientId,doctorId,dateTime,status,fee,paymentId,createdAt\n");
                for (Appointment a : appointmentRepository.findAll()) {
                    csv.append(csvRow(
                            a.getId(), a.getPatientId(), a.getDoctorId(),
                            a.getDateTime() != null ? a.getDateTime().toString() : "",
                            a.getStatus() != null ? a.getStatus().name() : "",
                            a.getFee() == null ? "" : String.valueOf(a.getFee()),
                            nz(a.getPaymentId()),
                            a.getCreatedAt() != null ? a.getCreatedAt().toString() : ""));
                }
                filename = "appointments.csv";
            }
            case "payments" -> {
                csv.append("id,razorpayOrderId,razorpayPaymentId,appointmentId,patientId,amount,currency,status,createdAt,paidAt,refundedAt\n");
                for (Payment p : paymentRepository.findAll()) {
                    csv.append(csvRow(
                            p.getId(), nz(p.getRazorpayOrderId()), nz(p.getRazorpayPaymentId()),
                            nz(p.getAppointmentId()), nz(p.getPatientId()),
                            String.valueOf(p.getAmount()), nz(p.getCurrency()),
                            p.getStatus() != null ? p.getStatus().name() : "",
                            p.getCreatedAt() != null ? p.getCreatedAt().toString() : "",
                            p.getPaidAt()    != null ? p.getPaidAt().toString()    : "",
                            p.getRefundedAt() != null ? p.getRefundedAt().toString() : ""));
                }
                filename = "payments.csv";
            }
            case "reviews" -> {
                csv.append("id,appointmentId,doctorId,patientId,rating,comment,createdAt\n");
                for (Review r : reviewRepository.findAll()) {
                    csv.append(csvRow(
                            r.getId(), nz(r.getAppointmentId()), nz(r.getDoctorId()), nz(r.getPatientId()),
                            String.valueOf(r.getRating()), nz(r.getComment()),
                            r.getCreatedAt() != null ? r.getCreatedAt().toString() : ""));
                }
                filename = "reviews.csv";
            }
            default -> throw new RuntimeException("Unknown export type: " + type +
                    " (expected one of: users, appointments, payments, reviews)");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .body(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    // ─── Doctor approval workflow ────────────────────────────────────────────

    @Operation(summary = "List doctors awaiting admin approval")
    @GetMapping("/doctors/pending")
    public ResponseEntity<List<UserProfileResponse>> listPendingDoctors() {
        return ResponseEntity.ok(doctorRepository.findPending().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList()));
    }

    @Operation(summary = "Approve a doctor so they appear to patients")
    @PutMapping("/doctors/{id}/approve")
    public ResponseEntity<UserProfileResponse> approveDoctor(@PathVariable String id) {
        Doctor d = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + id));
        d.setApproved(true);
        doctorRepository.save(d);
        return ResponseEntity.ok(toUserResponse(d));
    }

    @Operation(summary = "Reject (deactivate) a pending doctor signup")
    @PutMapping("/doctors/{id}/reject")
    public ResponseEntity<UserProfileResponse> rejectDoctor(@PathVariable String id) {
        Doctor d = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + id));
        d.setApproved(false);
        d.setActive(false);
        doctorRepository.save(d);
        return ResponseEntity.ok(toUserResponse(d));
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

    /** Quote a single CSV cell — escapes quotes, wraps if cell contains comma/newline/quote. */
    private static String csvCell(String s) {
        if (s == null) return "";
        boolean needsQuotes = s.indexOf(',') >= 0 || s.indexOf('"') >= 0
                || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0;
        String escaped = s.replace("\"", "\"\"");
        return needsQuotes ? "\"" + escaped + "\"" : escaped;
    }

    /** Join cells into a CSV row terminated with a newline. */
    private static String csvRow(String... cells) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(csvCell(cells[i]));
        }
        sb.append('\n');
        return sb.toString();
    }

    private static String nz(String s) { return s == null ? "" : s; }

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
            r.setReviewCount(d.getReviewCount());
            r.setApproved(d.isApproved());
        }
        return r;
    }
}
