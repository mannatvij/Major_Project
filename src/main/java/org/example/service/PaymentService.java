package org.example.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Refund;
import com.razorpay.Utils;
import lombok.extern.slf4j.Slf4j;
import org.example.exception.AppException;
import org.example.model.Appointment;
import org.example.model.AppointmentStatus;
import org.example.model.Doctor;
import org.example.model.Payment;
import org.example.model.PaymentStatus;
import org.example.model.User;
import org.example.repository.AppointmentRepository;
import org.example.repository.DoctorRepository;
import org.example.repository.PaymentRepository;
import org.example.repository.UserRepository;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Wraps the Razorpay SDK. When {@code razorpay.enabled=false} (demo / E2E),
 * orders are mocked, signature verification is bypassed, and refunds are no-ops —
 * so the full payment UX can be exercised locally without a real Razorpay account.
 */
@Slf4j
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final EmailService emailService;

    private final String keyId;
    private final String keySecret;
    private final String currency;
    private final boolean enabled;

    public PaymentService(PaymentRepository paymentRepository,
                          AppointmentRepository appointmentRepository,
                          UserRepository userRepository,
                          DoctorRepository doctorRepository,
                          EmailService emailService,
                          @Value("${razorpay.key.id}") String keyId,
                          @Value("${razorpay.key.secret}") String keySecret,
                          @Value("${razorpay.currency:INR}") String currency,
                          @Value("${razorpay.enabled:false}") boolean enabled) {
        this.paymentRepository = paymentRepository;
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.emailService = emailService;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.currency = currency;
        this.enabled = enabled;

        log.info("[PAYMENT] Razorpay integration enabled={} keyId={}",
                enabled, mask(keyId));
    }

    public String getPublicKeyId() {
        return keyId;
    }

    public boolean isLiveMode() {
        return enabled;
    }

    // ─── 1. Create order ──────────────────────────────────────────────────────

    /**
     * Creates a Razorpay order for a PENDING_PAYMENT appointment owned by the caller.
     * Idempotent per appointment: if a CREATED payment already exists, returns it.
     */
    public OrderResult createOrder(String appointmentId, String patientUsername) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppException("Appointment not found", HttpStatus.NOT_FOUND));

        User patient = userRepository.findByUsername(patientUsername)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (!appt.getPatientId().equals(patient.getId())) {
            throw new AppException("This appointment does not belong to you", HttpStatus.FORBIDDEN);
        }
        if (appt.getStatus() != AppointmentStatus.PENDING_PAYMENT) {
            throw new AppException(
                    "Appointment is not awaiting payment (status=" + appt.getStatus() + ")",
                    HttpStatus.BAD_REQUEST);
        }
        if (appt.getFee() == null || appt.getFee() <= 0) {
            throw new AppException("Appointment has no fee set", HttpStatus.BAD_REQUEST);
        }

        // Re-use an existing CREATED order for the same appointment (idempotency)
        Payment existing = paymentRepository.findByAppointmentId(appointmentId).orElse(null);
        if (existing != null && existing.getStatus() == PaymentStatus.CREATED) {
            return new OrderResult(existing.getRazorpayOrderId(), existing.getAmount(),
                    currency, keyId, enabled);
        }

        double amount = appt.getFee();
        long amountPaise = Math.round(amount * 100);
        String orderId;

        if (enabled) {
            try {
                RazorpayClient client = new RazorpayClient(keyId, keySecret);
                JSONObject options = new JSONObject();
                options.put("amount", amountPaise);
                options.put("currency", currency);
                options.put("receipt", "appt_" + appointmentId);
                Order order = client.orders.create(options);
                orderId = order.get("id");
            } catch (Exception e) {
                log.error("[PAYMENT] Razorpay order creation failed: {}", e.getMessage());
                throw new AppException("Could not create payment order: " + e.getMessage(),
                        HttpStatus.BAD_GATEWAY);
            }
        } else {
            // Demo mode — mocked order id; client will skip Razorpay checkout.
            orderId = "order_demo_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            log.info("[PAYMENT] Demo mode — mocked order {} for appointment {}",
                    orderId, appointmentId);
        }

        Payment payment = new Payment();
        payment.setRazorpayOrderId(orderId);
        payment.setAppointmentId(appointmentId);
        payment.setPatientId(patient.getId());
        payment.setAmount(amount);
        payment.setCurrency(currency);
        payment.setStatus(PaymentStatus.CREATED);
        payment.setCreatedAt(LocalDateTime.now());
        Payment saved = paymentRepository.save(payment);

        appt.setPaymentId(saved.getId());
        appointmentRepository.save(appt);

        return new OrderResult(orderId, amount, currency, keyId, enabled);
    }

    // ─── 2. Verify signature & promote appointment ────────────────────────────

    /**
     * Verifies Razorpay HMAC signature, marks payment PAID, promotes appointment to PENDING,
     * and sends a receipt email. Demo mode skips signature verification.
     */
    public Payment verifyPayment(String razorpayOrderId,
                                 String razorpayPaymentId,
                                 String razorpaySignature,
                                 String patientUsername) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new AppException("Payment order not found", HttpStatus.NOT_FOUND));

        User patient = userRepository.findByUsername(patientUsername)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (!payment.getPatientId().equals(patient.getId())) {
            throw new AppException("This payment does not belong to you", HttpStatus.FORBIDDEN);
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            return payment; // idempotent
        }

        if (enabled) {
            JSONObject attrs = new JSONObject();
            attrs.put("razorpay_order_id", razorpayOrderId);
            attrs.put("razorpay_payment_id", razorpayPaymentId);
            attrs.put("razorpay_signature", razorpaySignature);
            try {
                if (!Utils.verifyPaymentSignature(attrs, keySecret)) {
                    payment.setStatus(PaymentStatus.FAILED);
                    paymentRepository.save(payment);
                    throw new AppException("Invalid payment signature", HttpStatus.BAD_REQUEST);
                }
            } catch (AppException e) {
                throw e;
            } catch (Exception e) {
                log.error("[PAYMENT] Signature verification error: {}", e.getMessage());
                throw new AppException("Signature verification failed", HttpStatus.BAD_REQUEST);
            }
        } else {
            log.info("[PAYMENT] Demo mode — skipping signature verification for {}", razorpayOrderId);
        }

        payment.setRazorpayPaymentId(razorpayPaymentId);
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        Payment saved = paymentRepository.save(payment);

        // Promote appointment from PENDING_PAYMENT → PENDING (awaiting doctor approval)
        Appointment appt = appointmentRepository.findById(payment.getAppointmentId())
                .orElseThrow(() -> new AppException("Appointment not found", HttpStatus.NOT_FOUND));
        if (appt.getStatus() == AppointmentStatus.PENDING_PAYMENT) {
            appt.setStatus(AppointmentStatus.PENDING);
            appointmentRepository.save(appt);
        }

        // Send receipt (best-effort)
        try {
            Doctor doctor = doctorRepository.findById(appt.getDoctorId()).orElse(null);
            if (doctor != null) {
                emailService.sendPaymentReceipt(appt, patient, doctor,
                        payment.getAmount(),
                        razorpayPaymentId != null ? razorpayPaymentId : payment.getRazorpayOrderId());
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to send payment receipt: {}", e.getMessage());
        }

        return saved;
    }

    // ─── 3. Refund (called by AppointmentService on cancellation) ─────────────

    /**
     * Issues a refund for a PAID payment linked to the given appointment.
     * No-op if no PAID payment exists. Sends a refund email on success.
     */
    public void refundForAppointment(Appointment appt) {
        if (appt.getPaymentId() == null) return;
        Payment payment = paymentRepository.findById(appt.getPaymentId()).orElse(null);
        if (payment == null || payment.getStatus() != PaymentStatus.PAID) return;

        String refundId;
        if (enabled) {
            try {
                RazorpayClient client = new RazorpayClient(keyId, keySecret);
                JSONObject options = new JSONObject();
                options.put("amount", Math.round(payment.getAmount() * 100));
                Refund refund = client.payments.refund(payment.getRazorpayPaymentId(), options);
                refundId = refund.get("id");
            } catch (Exception e) {
                log.error("[PAYMENT] Razorpay refund failed for payment {}: {}",
                        payment.getId(), e.getMessage());
                // Don't block cancellation if refund fails — admin can retry manually.
                return;
            }
        } else {
            refundId = "rfnd_demo_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            log.info("[PAYMENT] Demo mode — mocked refund {} for payment {}",
                    refundId, payment.getId());
        }

        payment.setRazorpayRefundId(refundId);
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        try {
            User patient = userRepository.findById(appt.getPatientId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appt.getDoctorId()).orElse(null);
            if (patient != null && doctor != null) {
                emailService.sendRefundNotification(appt, patient, doctor,
                        payment.getAmount(), refundId);
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to send refund notification: {}", e.getMessage());
        }
    }

    // ─── Read helpers ─────────────────────────────────────────────────────────

    public Payment findByAppointmentId(String appointmentId) {
        return paymentRepository.findByAppointmentId(appointmentId).orElse(null);
    }

    public java.util.List<Payment> findHistoryForPatient(String patientUsername) {
        User patient = userRepository.findByUsername(patientUsername)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        return paymentRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
    }

    private static String mask(String s) {
        if (s == null || s.length() < 6) return "***";
        return s.substring(0, 6) + "***";
    }

    /** Result returned to the frontend so it can open the Razorpay checkout modal. */
    public record OrderResult(String orderId, double amount, String currency,
                              String keyId, boolean liveMode) {}
}
