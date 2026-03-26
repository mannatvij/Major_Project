package org.example.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    /** "patient" or "bot" */
    private String sender;

    private String content;

    private LocalDateTime timestamp;
}
