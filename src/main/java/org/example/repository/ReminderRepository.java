package org.example.repository;

import org.example.model.Reminder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReminderRepository extends MongoRepository<Reminder, String> {

    List<Reminder> findByAppointmentIdAndUserId(String appointmentId, String userId);

    List<Reminder> findByIsSentFalseAndReminderTimeBefore(LocalDateTime now);

    List<Reminder> findByAppointmentId(String appointmentId);

    boolean existsByAppointmentIdAndUserIdAndReminderType(
            String appointmentId, String userId, String reminderType);
}
