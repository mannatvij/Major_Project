package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payments")
public class Payment {

    @Id
    private String id;

    /** Razorpay order id (order_XXXXXXXX) returned by Orders.create. */
    @Indexed(unique = true)
    private String razorpayOrderId;

    /** Razorpay payment id (pay_XXXXXXXX) returned after checkout success. Null until paid. */
    private String razorpayPaymentId;

    /** Razorpay refund id (rfnd_XXXXXXXX) when a refund is issued. */
    private String razorpayRefundId;

    @Indexed
    private String appointmentId;

    @Indexed
    private String patientId;

    /** Amount in INR (rupees). Razorpay API itself uses paise — we convert at the boundary. */
    private double amount;

    private String currency;

    private PaymentStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private LocalDateTime refundedAt;
}
