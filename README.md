# Major Project - Spring Boot REST API

A Spring Boot application with JWT-based authentication and MongoDB storage.

## Tech Stack

- Java 17
- Spring Boot 3.2.3
- Spring Web
- Spring Data MongoDB
- Spring Security
- JWT (JJWT 0.12.5)
- Lombok

## Prerequisites

- JDK 17+
- Maven 3.6+
- MongoDB running locally on port 27017

## Project Structure

```
src/main/java/org/example/
├── Main.java                        # Application entry point
├── controller/
│   └── AuthController.java          # Auth endpoints (register, login)
├── service/
│   └── UserService.java             # User business logic
├── repository/
│   └── UserRepository.java          # MongoDB user repository
├── model/
│   └── User.java                    # User document
├── dto/
│   ├── AuthRequest.java             # Login request body
│   ├── AuthResponse.java            # JWT token response
│   └── RegisterRequest.java         # Registration request body
├── config/
│   ├── SecurityConfig.java          # Spring Security & filter chain
│   └── MongoConfig.java             # MongoDB auditing configuration
└── security/
    ├── JwtUtil.java                  # JWT generation & validation
    ├── JwtAuthenticationFilter.java  # Per-request JWT filter
    └── UserDetailsServiceImpl.java   # Loads user from MongoDB
```

## Setup & Run

### 1. Start MongoDB

Make sure MongoDB is running locally:

```bash
# Using mongod directly
mongod --dbpath /data/db

# Or with Docker
docker run -d -p 27017:27017 --name mongo mongo:latest
```

### 2. Configure the application

Edit `src/main/resources/application.properties` if your MongoDB setup differs:

```properties
spring.data.mongodb.host=localhost
spring.data.mongodb.port=27017
spring.data.mongodb.database=major_project_db
```

**Important:** Replace the `jwt.secret` value with a strong secret before deploying to any non-local environment.

### 3. Build and run

```bash
mvn clean install
mvn spring-boot:run
```

The application starts on `http://localhost:8080`.

## API Endpoints

### Register

```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "secret123"
}
```

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "secret123"
}
```

Response:
```json
{
  "token": "<JWT token>"
}
```

### Authenticated requests

Include the token in the `Authorization` header:

```
Authorization: Bearer <JWT token>
```

## Security Notes

- Passwords are hashed with BCrypt before storage.
- JWT tokens expire after 24 hours (configurable via `jwt.expiration` in ms).
- All routes under `/api/auth/**` are public; everything else requires a valid JWT.
- Sessions are stateless (no HTTP session is created).
