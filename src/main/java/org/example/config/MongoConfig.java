package org.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "org.example.repository")
public class MongoConfig {
    // Spring Boot auto-configures the MongoDB connection via application.properties.
    // Add custom MongoClient or template beans here if needed.
}
