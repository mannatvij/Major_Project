package org.example.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentFailedRequest {

    @NotBlank(message = "razorpayOrderId is required")
    private String razorpayOrderId;

    /** Free-text reason from Razorpay's payment.failed event or the modal dismiss path. */
    private String reason;
}
