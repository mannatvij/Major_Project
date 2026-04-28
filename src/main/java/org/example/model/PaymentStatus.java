package org.example.model;

public enum PaymentStatus {
    /** Razorpay order created; awaiting checkout completion. */
    CREATED,
    /** Signature verified successfully. */
    PAID,
    /** Verification failed or checkout abandoned. */
    FAILED,
    /** Refund initiated (full or partial) for a previously PAID payment. */
    REFUNDED
}
