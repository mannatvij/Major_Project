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
@Document(collection = "reminders")
public class Reminder {

    @Id
    private String id;

    @Indexed
    private String appointmentId;

    @Indexed
    private String userId;

    /** e.g. "24H_BEFORE", "1H_BEFORE" */
    private String reminderType;

    /** When this reminder should fire */
    private LocalDateTime reminderTime;

    private boolean isSent;

    private LocalDateTime sentAt;

    private LocalDateTime createdAt;
}
