package org.example.repository;

import org.example.model.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {

    List<ChatSession> findByPatientId(String patientId);

    List<ChatSession> findByPatientIdOrderByTimestampDesc(String patientId);

    List<ChatSession> findByRecommendedSpecialization(String specialization);

    long countByPatientId(String patientId);

    List<ChatSession> findByPatientIdAndActive(String patientId, boolean active);
}
