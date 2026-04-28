package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.dto.CreateOrderRequest;
import org.example.dto.VerifyPaymentRequest;
import org.example.model.Payment;
import org.example.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Razorpay payment orders, verification, and refunds")
@SecurityRequirement(name = "bearerAuth")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Create Razorpay order for a PENDING_PAYMENT appointment")
    @PostMapping("/create-order")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PaymentService.OrderResult> createOrder(
            Authentication auth,
            @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.ok(
                paymentService.createOrder(request.getAppointmentId(), auth.getName()));
    }

    @Operation(summary = "Verify Razorpay signature and mark appointment paid")
    @PostMapping("/verify")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Map<String, Object>> verify(
            Authentication auth,
            @Valid @RequestBody VerifyPaymentRequest request) {
        Payment payment = paymentService.verifyPayment(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature(),
                auth.getName());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "paymentId", payment.getId(),
                "appointmentId", payment.getAppointmentId(),
                "status", payment.getStatus().name()
        ));
    }

    @Operation(summary = "List payment history for the authenticated patient")
    @GetMapping("/history")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<Payment>> history(Authentication auth) {
        return ResponseEntity.ok(paymentService.findHistoryForPatient(auth.getName()));
    }
}
