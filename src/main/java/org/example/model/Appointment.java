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
@Document(collection = "appointments")
public class Appointment {

    @Id
    private String id;

    @Indexed
    private String patientId;

    @Indexed
    private String doctorId;

    private LocalDateTime dateTime;

    private AppointmentStatus status;

    private String symptoms;

    private String notes;

    private LocalDateTime createdAt;

    /** ID of the latest Payment record for this appointment, if any. */
    private String paymentId;

    /** Snapshot of the consultation fee at booking time, in INR. */
    private Double fee;
}
