# Smart Healthcare System

A full-stack web application that connects **patients** with **doctors** for booking and managing medical appointments online. Think of it like a simple hospital portal — patients can find doctors, book appointment slots, and track their status, while doctors can manage their schedule and update patients.

---

## Table of Contents

1. [What This App Does](#what-this-app-does)
2. [How It Works — The Simple Version](#how-it-works--the-simple-version)
3. [Technology Stack](#technology-stack)
4. [Backend — How It Works](#backend--how-it-works)
5. [Frontend — How It Works](#frontend--how-it-works)
6. [All Features Built](#all-features-built)
7. [API Reference](#api-reference)
8. [Project Structure](#project-structure)
9. [Running the Project](#running-the-project)
10. [What Can Be Added Next](#what-can-be-added-next)

---

## What This App Does

Imagine you want to see a doctor. Normally you call a clinic, wait on hold, and try to find a time that works. This app replaces that process entirely:

- **As a Patient** — you register, browse available doctors (filter by specialization), pick a time slot, describe your symptoms, and book. You can then track whether the doctor has confirmed your appointment.
- **As a Doctor** — you log in, see your incoming appointment requests, accept or reject them, mark them as completed, and manage which time slots you are available on.

Everything happens through a clean web interface, without needing to call anyone.

---

## How It Works — The Simple Version

```
[ Patient / Doctor opens browser ]
             |
             v
  [ React Frontend (runs in browser) ]
             |
             |  sends requests over HTTP
             v
  [ Spring Boot Backend (runs on server) ]
             |
             |  reads / writes data
             v
  [ MongoDB Database (stores everything) ]
```

1. The **frontend** is the visual part — buttons, forms, pages — that runs in your browser.
2. When you do something (like "Book Appointment"), the frontend sends a message to the **backend**.
3. The **backend** processes that request, checks your identity, applies business rules, and talks to the **database**.
4. The database permanently stores all users, appointments, and doctor schedules.
5. The backend sends the result back to the frontend, which updates the screen.

Your identity is verified using a **JWT token** — a small piece of encrypted text your browser holds after you log in. Every request to the backend includes this token so the server knows who you are without you having to log in again on every click.

---

## Technology Stack

### Backend

| Technology | What it is | Why it is used |
|---|---|---|
| **Java 17** | Programming language | Main language for the server |
| **Spring Boot 3.2** | Framework | Makes building REST APIs fast and structured |
| **Spring Security** | Security framework | Handles login, JWT verification, and access control |
| **Spring Data MongoDB** | Database connector | Lets Java code talk to MongoDB easily |
| **MongoDB** | Database | Stores all data as flexible documents (no rigid tables) |
| **JJWT 0.12** | JWT library | Creates and validates secure login tokens |
| **Lombok** | Code helper | Eliminates repetitive Java boilerplate (getters, setters, constructors) |
| **Springdoc OpenAPI** | API documentation | Auto-generates interactive API docs (Swagger UI) |
| **Maven** | Build tool | Downloads dependencies and builds the project |

### Frontend

| Technology | What it is | Why it is used |
|---|---|---|
| **React 19** | UI framework | Builds the interactive user interface |
| **React Router v7** | Navigation | Handles page navigation without full page reloads |
| **Material-UI (MUI) v7** | Component library | Pre-built, polished UI components (buttons, cards, dialogs, tables) |
| **Axios** | HTTP client | Sends requests from the browser to the backend |
| **Node.js / npm** | Runtime and package manager | Runs the React development server |

---

## Backend — How It Works

The backend is a **REST API** — a set of URLs (called endpoints) that the frontend calls to perform actions. It is built with Spring Boot and follows a clean layered architecture.

### Layered Architecture

```
HTTP Request
      |
      v
 [ Controller ]   ← Receives the request, validates input, decides who can call it
      |
      v
 [ Service ]      ← Applies business logic and rules
      |
      v
 [ Repository ]   ← Talks to MongoDB to read and write data
      |
      v
 [ MongoDB ]      ← Stores the actual data permanently
```

Each layer has a single responsibility. Controllers never touch the database directly; Services never handle HTTP details. This keeps the code clean, readable, and easy to change.

---

### Security — How Login Works

```
1.  User sends username + password  →  POST /api/auth/login
2.  Backend checks credentials against the database
3.  If correct → backend creates a JWT token (a signed string like "eyJhbG...")
4.  Token is returned to the browser and saved in localStorage
5.  Every future API call includes:  Authorization: Bearer <token>
6.  JwtAuthenticationFilter intercepts every request, reads the token,
    and sets the user's identity automatically
7.  If token is missing or expired → 401 Unauthorized is returned,
    and the frontend redirects to the login page
```

Passwords are **never stored as plain text**. They are hashed using BCrypt before being saved to the database.

---

### Data Models

The database has two main collections: `users` and `appointments`.

**User** (base — stored in `users` collection)

| Field | Type | Description |
|---|---|---|
| id | String | Unique MongoDB ID |
| username | String | Unique login name |
| email | String | Unique email address |
| password | String | BCrypt hashed password |
| role | Enum | PATIENT / DOCTOR / ADMIN |
| createdAt | DateTime | When the account was created |

**Patient** (extends User — same collection, extra fields)

| Field | Type | Description |
|---|---|---|
| age | Integer | Patient's age |
| gender | String | Male / Female / Other |
| bloodGroup | String | e.g. A+, O-, AB+ |
| medicalHistory | List | Past conditions or notes |

**Doctor** (extends User — same collection, extra fields)

| Field | Type | Description |
|---|---|---|
| specialization | String | e.g. Cardiology, Neurology |
| experience | Integer | Years of practice |
| qualification | String | e.g. MBBS, MD |
| fees | Double | Consultation fee in ₹ |
| rating | Double | Average rating out of 5.0 |
| availableSlots | List | Future date-times when available |

**Appointment** (stored in `appointments` collection)

| Field | Type | Description |
|---|---|---|
| id | String | Unique MongoDB ID |
| patientId / patientName | String | Who booked |
| doctorId / doctorName | String | Who will treat |
| dateTime | DateTime | Scheduled time |
| symptoms | String | Patient's description |
| status | Enum | PENDING / CONFIRMED / COMPLETED / CANCELLED |
| createdAt | DateTime | When it was booked |

---

### Appointment Status Flow

Appointments move through states in one direction only. You cannot undo a completed or cancelled appointment.

```
         [ PENDING ]
           /     \
  Doctor Accepts  Doctor/Patient Cancels or Doctor Rejects
          /              \
   [ CONFIRMED ]      [ CANCELLED ]
      /     \
 Marks Done  Cancels
    /            \
[ COMPLETED ]  [ CANCELLED ]
```

---

### Role-Based Access Control

Every endpoint enforces who is allowed to call it:

| Action | Allowed roles |
|---|---|
| Book an appointment | PATIENT only |
| Accept / reject / complete appointment | DOCTOR only |
| Update own availability slots | DOCTOR only |
| View own appointments | PATIENT (sees theirs), DOCTOR (sees theirs) |
| Update own profile | Any logged-in user |
| Change own password | Any logged-in user |
| Look up any user by ID | ADMIN only |

---

### Key Backend Files

| File | What it does |
|---|---|
| `Main.java` | Starts the entire application |
| `SecurityConfig.java` | Defines public vs protected routes, sets up JWT filter, configures CORS |
| `JwtUtil.java` | Generates and validates JWT tokens (256-bit secret, 24h expiry) |
| `JwtAuthenticationFilter.java` | Runs on every request to read the token and identify the caller |
| `DataInitializer.java` | Seeds 8 sample doctors with fresh appointment slots on every startup |
| `GlobalExceptionHandler.java` | Catches all errors and returns clean JSON error messages |
| `AuthController.java` | Handles `/api/auth/register` and `/api/auth/login` |
| `AppointmentController.java` | All appointment CRUD — book, list, update status, cancel |
| `DoctorController.java` | Doctor listing, specialization search, availability update |
| `UserController.java` | Profile view, profile update, password change |
| `AppointmentService.java` | Validates and enforces appointment business rules and state transitions |
| `DoctorService.java` | Doctor search, slot management |
| `UserService.java` | Profile updates, BCrypt password handling, role-specific field updates |

---

### Auto-Seeded Sample Doctors

On every application startup, `DataInitializer` ensures 8 sample doctors are in the database with fresh appointment slots for the **next 7 days** (4 slots per day at 09:00, 11:00, 14:00, 16:00).

| Username | Specialization | Fees | Rating |
|---|---|---|---|
| dr_rajesh | Cardiology | ₹500 | 4.8 |
| dr_priya | Neurology | ₹600 | 4.7 |
| dr_amit | Orthopedics | ₹400 | 4.5 |
| dr_sunita | Cardiology | ₹700 | 4.9 |
| dr_kumar | Dermatology | ₹350 | 4.3 |
| dr_meena | Neurology | ₹550 | 4.6 |
| dr_arjun | Orthopedics | ₹450 | 4.4 |
| dr_kavitha | Dermatology | ₹300 | 4.2 |

Default password for all sample doctors: **`doctor123`**

---

### Swagger / API Documentation

The backend includes interactive API documentation. Once the backend is running, open:

```
http://localhost:8080/swagger-ui.html
```

You can browse every endpoint, see the expected request and response formats, and test them directly from the browser without writing any code.

---

## Frontend — How It Works

The frontend is a **React single-page application (SPA)**. This means the browser downloads the app once, and all navigation after that happens without full page reloads — it feels fast and smooth like a native application.

---

### Page Structure and Routing

```
/login           → Login page (public)
/register        → Register page (public)
/dashboard       → Protected (must be logged in)
  ├── /dashboard                        → Home (Patient or Doctor dashboard based on role)
  ├── /dashboard/doctors                → Browse and search doctors
  ├── /dashboard/book-appointment/:id   → Book appointment with a specific doctor
  ├── /dashboard/appointments           → My Appointments (patient view)
  ├── /dashboard/doctor-appointments    → Appointments (doctor view)
  ├── /dashboard/availability           → Manage Schedule (doctor only)
  └── /dashboard/profile                → Edit Profile (both roles)
```

If you try to visit any `/dashboard` page without being logged in, you are automatically redirected to `/login`. This is handled by the `ProtectedRoute` component.

---

### Role-Aware Interface

The same codebase serves both patients and doctors but shows different content:

- **Sidebar navigation** changes based on role — doctors see "Appointments" and "Manage Availability"; patients see "Browse Doctors" and "My Appointments"
- **Dashboard home** shows different statistics and actions based on role
- **Appointment cards** show different action buttons — patients see Cancel; doctors see Accept, Reject, Mark Complete, Cancel

---

### State Management

The app uses React's built-in **Context API** (no external state library needed):

| Context | What it stores | What it is used for |
|---|---|---|
| `AuthContext` | Logged-in user info, JWT token | Knowing who you are; protecting routes |
| `SnackbarContext` | Toast notification queue | Showing success/error pop-up messages across all pages |

---

### How API Calls Work

All HTTP calls go through `src/services/api.js` using Axios. Two global interceptors are active:

1. **Request interceptor** — automatically attaches `Authorization: Bearer <token>` to every outgoing request. You never manually deal with the token.
2. **Response interceptor** — if any request gets a 401 Unauthorized response (expired or invalid token), it clears the stored token and immediately redirects to the login page.

---

### Key Frontend Files

| File | What it does |
|---|---|
| `src/theme.js` | Central MUI color theme — defines primary, secondary, success, warning, error colors used everywhere |
| `src/App.js` | Main router — maps URLs to page components |
| `src/index.js` | App entry point — wraps everything in Theme, Auth, and Snackbar providers |
| `src/services/api.js` | All API calls centralized; JWT interceptors |
| `src/context/AuthContext.js` | Stores login state; exposes `login`, `logout`, `isPatient`, `isDoctor` |
| `src/context/SnackbarContext.js` | Global `success()`, `error()`, `info()` toast messages |
| `src/components/DashboardLayout.js` | App shell — top bar, left sidebar (desktop), bottom navigation (mobile) |
| `src/components/ProtectedRoute.js` | Redirects unauthenticated users to login |
| `src/components/AppointmentCard.js` | Role-aware card with action buttons + confirmation dialogs |
| `src/components/DoctorCard.js` | Doctor info card with Book Appointment button |
| `src/components/ConfirmDialog.js` | Reusable "Are you sure?" modal with customizable title and button text |
| `src/components/EmptyState.js` | "Nothing here yet" placeholder shown on empty lists |
| `src/components/ErrorMessage.js` | Error alert with a Retry button |
| `src/components/LoadingSpinner.js` | Centered loading indicator with optional message |
| `src/components/ChangePasswordDialog.js` | Password change modal with current/new/confirm fields and validation |
| `src/pages/PatientDashboard.js` | Patient home — summary cards and quick action buttons |
| `src/pages/DoctorDashboard.js` | Doctor home — today's statistics, schedule preview, quick actions |
| `src/pages/DoctorListPage.js` | Browse doctors — name search with debounce, specialization filter, pagination |
| `src/pages/BookAppointmentPage.js` | Booking page — slots grouped by day, symptoms form, confirmation card |
| `src/pages/PatientAppointmentsPage.js` | Tabbed view of Upcoming / Past / Cancelled appointments with cancel action |
| `src/pages/DoctorAppointmentsPage.js` | Doctor's appointments with filter buttons and today's summary bar |
| `src/pages/DoctorAvailabilityPage.js` | Add, remove, and save availability time slots |
| `src/pages/ProfilePage.js` | View and edit profile — different fields shown for patient vs doctor |

---

### Responsive Design

| Screen size | Navigation style |
|---|---|
| Desktop (wider than 600px) | Permanent left sidebar with labels and icons |
| Mobile (600px and below) | Bottom navigation bar (familiar mobile app pattern) |

---

## All Features Built

### Authentication
- [x] Register as Patient or Doctor with username, email, and password
- [x] Login with JWT token issued on success
- [x] Token stored in browser localStorage and attached to all requests
- [x] All dashboard routes protected — unauthenticated users redirected to login
- [x] Automatic logout on token expiry (401 response globally handled)
- [x] Logout with confirmation dialog

### Patient Features
- [x] Patient Dashboard with summary cards (upcoming appointments count, available doctors, profile status)
- [x] Browse all doctors with name search (debounced 400ms) and specialization filter
- [x] Paginated doctor list (9 per page)
- [x] View doctor details — specialization, experience, qualification, rating, consultation fees
- [x] Book appointment — visual day-grouped time slot picker; click a slot to prefill date and time
- [x] Describe symptoms before booking
- [x] View all appointments — tabbed layout for Upcoming / Past / Cancelled
- [x] Cancel a pending or confirmed appointment (confirmation dialog before cancelling)
- [x] Appointment list auto-refreshes every 30 seconds
- [x] Appointment status shown with color-coded badges
- [x] Edit health profile — age, gender, blood group, medical history (multi-line)

### Doctor Features
- [x] Doctor Dashboard showing today's appointment count, pending requests, confirmed count
- [x] Quick view of today's schedule directly on dashboard
- [x] View all appointments with filter buttons — All / Pending / Confirmed / Completed
- [x] Accept pending appointment requests
- [x] Reject pending requests (confirmation dialog)
- [x] Mark confirmed appointments as completed
- [x] Cancel confirmed appointments (confirmation dialog)
- [x] Manage availability — add date+time slots visually, remove unwanted ones, save to backend
- [x] Edit professional profile — specialization, experience, qualification, fees

### Profile Management (Both Roles)
- [x] View full profile with role badge and join date
- [x] Toggle between view and edit mode
- [x] Save changes with success/error feedback
- [x] Change password — validates current password, minimum 6 characters, confirmation must match

### UI / UX Polish
- [x] Consistent color theme applied globally (blue primary, green success, orange warning, red error)
- [x] Loading spinner with message on every data fetch
- [x] Error alerts with Retry button on every API call failure
- [x] Empty state illustrations on every list/table page
- [x] Toast notifications for all actions — booking, cancelling, saving profile, changing password
- [x] Confirmation dialogs before all destructive actions (cancel appointment, reject, logout)
- [x] Mobile-responsive — bottom navigation bar on small screens
- [x] Hover animations on all cards
- [x] Round card corners and consistent spacing across all pages

---

## API Reference

All endpoints require the header `Authorization: Bearer <token>` unless marked **Public**.

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a new account (PATIENT or DOCTOR) |
| POST | `/api/auth/login` | Public | Login and receive a JWT token |

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users/profile` | Any | Get own full profile (includes role-specific fields) |
| PUT | `/api/users/profile` | Any | Update own profile |
| PUT | `/api/users/password` | Any | Change password (requires current password) |
| GET | `/api/users/{id}` | Admin only | Look up any user by MongoDB ID |

### Doctors

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/doctors?page=0&size=9` | Any | List all doctors (paginated, sorted by rating) |
| GET | `/api/doctors/{id}` | Any | Get one doctor's full details |
| GET | `/api/doctors/search?specialization=Cardiology` | Any | Filter by specialization |
| GET | `/api/doctors/available` | Any | Only doctors with at least one open slot |
| PUT | `/api/doctors/availability` | Doctor only | Replace own list of available slots |

### Appointments

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/appointments` | Patient only | Book a new appointment |
| GET | `/api/appointments` | Any | Get own appointments (filtered by role automatically) |
| GET | `/api/appointments/{id}` | Owner | Get a single appointment |
| PUT | `/api/appointments/{id}/status` | Doctor / Admin | Change status (CONFIRMED / COMPLETED / CANCELLED) |
| DELETE | `/api/appointments/{id}` | Owner | Cancel appointment (sets status to CANCELLED) |

---

## Project Structure

```
Major_Project/
│
├── src/main/java/org/example/
│   ├── Main.java
│   ├── config/
│   │   ├── DataInitializer.java         ← Seeds 8 doctors with fresh slots on every startup
│   │   ├── MongoConfig.java             ← LocalDateTime serialization for MongoDB
│   │   ├── SecurityConfig.java          ← JWT filter chain, CORS settings, public routes
│   │   └── SwaggerConfig.java           ← OpenAPI / Swagger UI configuration
│   ├── controller/
│   │   ├── AuthController.java          ← /api/auth/register and /api/auth/login
│   │   ├── AppointmentController.java   ← /api/appointments/*
│   │   ├── DoctorController.java        ← /api/doctors/*
│   │   └── UserController.java          ← /api/users/*
│   ├── service/
│   │   ├── AppointmentService.java      ← State machine rules, role validation
│   │   ├── DoctorService.java           ← Search, slot management
│   │   └── UserService.java             ← Registration, profile, password
│   ├── model/
│   │   ├── User.java                    ← Base user (username, email, password, role)
│   │   ├── Patient.java                 ← Extends User (age, gender, bloodGroup, history)
│   │   ├── Doctor.java                  ← Extends User (specialization, slots, fees, rating)
│   │   ├── Appointment.java             ← Appointment document
│   │   ├── AppointmentStatus.java       ← Enum: PENDING, CONFIRMED, COMPLETED, CANCELLED
│   │   └── Role.java                    ← Enum: PATIENT, DOCTOR, ADMIN
│   ├── dto/                             ← Request/Response objects (never expose raw models)
│   │   ├── AuthRequest / AuthResponse / RegisterRequest
│   │   ├── AppointmentRequest / AppointmentResponse / StatusUpdateRequest
│   │   ├── DoctorResponse / AvailabilityUpdateRequest / PageResponse
│   │   ├── ProfileUpdateRequest / UserProfileResponse / ChangePasswordRequest
│   ├── repository/                      ← Spring Data MongoDB interfaces
│   │   ├── UserRepository / DoctorRepository / PatientRepository
│   │   ├── AppointmentRepository
│   ├── security/
│   │   ├── JwtUtil.java                 ← Token generation and validation
│   │   ├── JwtAuthenticationFilter.java ← Reads token from every request header
│   │   └── UserDetailsServiceImpl.java  ← Loads user from DB for Spring Security
│   └── exception/
│       ├── AppException.java            ← Custom exception class
│       └── GlobalExceptionHandler.java  ← Converts exceptions to clean JSON responses
│
├── src/main/resources/
│   └── application.properties           ← Port 8080, MongoDB config, JWT secret, Swagger paths
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── index.js                     ← Wraps app in ThemeProvider + AuthProvider + SnackbarProvider
│       ├── App.js                       ← Defines all routes
│       ├── theme.js                     ← MUI color palette and component overrides
│       ├── context/
│       │   ├── AuthContext.js           ← Login state, JWT storage, role helpers
│       │   └── SnackbarContext.js       ← Global toast notification system
│       ├── services/
│       │   └── api.js                   ← All Axios API calls; JWT interceptors
│       ├── components/
│       │   ├── DashboardLayout.js       ← AppBar + Sidebar (desktop) / BottomNav (mobile)
│       │   ├── ProtectedRoute.js        ← Auth guard using React Router Outlet
│       │   ├── AppointmentCard.js       ← Role-aware appointment card with action buttons
│       │   ├── DoctorCard.js            ← Doctor info + Book Appointment button
│       │   ├── ConfirmDialog.js         ← Reusable confirmation dialog
│       │   ├── EmptyState.js            ← Empty list placeholder with optional action
│       │   ├── ErrorMessage.js          ← Error alert with Retry button
│       │   ├── LoadingSpinner.js        ← Centered loading indicator
│       │   └── ChangePasswordDialog.js  ← Modal for changing password
│       └── pages/
│           ├── LoginPage.js / RegisterPage.js
│           ├── PatientDashboard.js / DoctorDashboard.js
│           ├── DoctorListPage.js        ← Search + filter + pagination
│           ├── BookAppointmentPage.js   ← Day-grouped slot picker + booking form
│           ├── PatientAppointmentsPage.js  ← Tabbed appointments + cancel
│           ├── DoctorAppointmentsPage.js   ← Filter + status management
│           ├── DoctorAvailabilityPage.js   ← Add/remove/save time slots
│           └── ProfilePage.js           ← View and edit profile (role-aware fields)
│
├── pom.xml                              ← Maven backend dependencies
├── e2e/full_test.js                     ← Playwright end-to-end test suite (153 checks)
└── README.md                            ← This file
```

---

## Running the Project

### Prerequisites

- Java 17 or higher
- Maven 3.x
- MongoDB running on `localhost:27017`
- Node.js 18+ and npm

### Step 1 — Start MongoDB

Make sure MongoDB is running locally. The database `major_project_db` is created automatically.

```bash
# Using mongod directly
mongod --dbpath /data/db

# Or with Docker
docker run -d -p 27017:27017 --name mongo mongo:latest
```

### Step 2 — Start the Backend

```bash
cd Major_Project
mvn spring-boot:run
```

The backend starts at **http://localhost:8080**

On first startup, 8 sample doctors are automatically created with appointment slots for the next 7 days. No manual setup required.

### Step 3 — Start the Frontend

```bash
cd frontend
npm install
npm start
```

The frontend opens at **http://localhost:3000**

### Quick Start Accounts

| Role | Username | Password |
|---|---|---|
| Doctor | dr_rajesh | doctor123 |
| Doctor | dr_sunita | doctor123 |
| Doctor | dr_priya | doctor123 |
| Patient | Register a new account via `/register` | — |

> Patient accounts must be created through the Register page. Doctors are seeded automatically on startup.

### Swagger API Docs

```
http://localhost:8080/swagger-ui.html
```

---

## What Can Be Added Next

### High Priority

| Feature | Description |
|---|---|
| Real-time notifications | Notify a patient instantly when their appointment is confirmed or rejected (WebSocket) |
| Email notifications | Send confirmation emails on booking, acceptance, and cancellation |
| Backend name search | Add `?name=` parameter to `/api/doctors` for server-side name filtering |
| Doctor ratings | Allow patients to rate a doctor after a completed appointment |
| Appointment notes | Doctor can add post-appointment notes or prescription visible to the patient |

### Medium Priority

| Feature | Description |
|---|---|
| Admin dashboard | Separate panel for viewing all users, appointments, and system statistics |
| Forgot password | Password reset flow via email link |
| Appointment reminders | Notification 1 hour before scheduled appointment |
| Medical records | Patients can attach files or documents to an appointment |
| Doctor profile photo | Upload and display a profile picture |
| Multi-specialization filter | Filter doctors by more than one specialization at once |

### Future / Advanced

| Feature | Description |
|---|---|
| Video consultation | WebRTC integration for virtual appointments |
| Payment integration | Collect consultation fees online before confirming (Razorpay / Stripe) |
| AI symptom checker | Chatbot to help patients describe symptoms before booking |
| Calendar sync | Export appointments to Google Calendar or iCal |
| Multi-language support | Hindi, Tamil, Telugu interface options |
| PWA (Progressive Web App) | Make the app installable on mobile like a native app |
| Analytics dashboard | Charts showing appointment trends, popular specializations, doctor utilization |
| Prescription management | Doctors can generate and patients can download prescriptions as PDF |

---

## Security Notes

- Passwords are hashed with **BCrypt** before storage — the plain text is never saved.
- JWT tokens expire after **24 hours** (configurable via `jwt.expiration` in `application.properties`).
- All routes under `/api/auth/**` are public. Everything else requires a valid token.
- Sessions are **stateless** — no server-side session is created or stored.
- Replace the `jwt.secret` in `application.properties` with a strong randomly-generated secret before any non-local deployment.
