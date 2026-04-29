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
@Document(collection = "reviews")
public class Review {

    @Id
    private String id;

    /** One review per appointment — unique. */
    @Indexed(unique = true)
    private String appointmentId;

    @Indexed
    private String doctorId;

    @Indexed
    private String patientId;

    /** 1–5 inclusive. */
    private int rating;

    /** Optional free-text comment. */
    private String comment;

    private LocalDateTime createdAt;
}
