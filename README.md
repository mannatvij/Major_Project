# Smart Healthcare System — Major Project

A full-stack healthcare appointment platform that connects **patients**, **doctors**, and **admins** through a single web application. Patients can find a doctor with the help of an **AI symptom-checker**, book and pay for an appointment online, get **email confirmations + calendar invites**, receive a **digital prescription PDF**, and **rate the doctor** afterwards. Doctors manage their availability, accept/reject requests, issue prescriptions and view their reviews. Admins approve doctor signups, monitor revenue/usage with **charts**, manage users, and **export data as CSV**.

This README is the single reference you need during your presentation — every screen, button, endpoint, and how the pieces talk to each other is captured below.

---

## Table of Contents

1. [The Three Roles & What They Do](#the-three-roles--what-they-do)
2. [Complete Feature List (with buttons)](#complete-feature-list-with-buttons)
3. [Technology Stack](#technology-stack)
4. [System Architecture — End-to-End Flow](#system-architecture--end-to-end-flow)
5. [Backend — How It Works](#backend--how-it-works)
6. [Frontend — How It Works](#frontend--how-it-works)
7. [The Python ML Microservice](#the-python-ml-microservice)
8. [Major Workflows Explained Step-by-Step](#major-workflows-explained-step-by-step)
9. [API Reference (every endpoint)](#api-reference-every-endpoint)
10. [Data Models](#data-models)
11. [Project Structure](#project-structure)
12. [Running the Project](#running-the-project)
13. [Talking Points for the Presentation](#talking-points-for-the-presentation)

---

## The Three Roles & What They Do

| Role | Sees | Can Do |
|---|---|---|
| **Patient** | Patient dashboard, AI chat, doctors list, appointments, payments, prescriptions, profile | Register, login, chat with AI, browse/search doctors, book + pay, cancel, view prescriptions (PDF), rate doctor, edit profile, change password |
| **Doctor** | Doctor dashboard, appointment requests, availability manager, profile | Login, accept/reject/complete appointments, manage time slots, issue prescriptions, view own reviews/rating, edit professional profile |
| **Admin** | Admin dashboard with charts, user list, doctor approvals, system health | View KPIs, approve/reject new doctors, activate/deactivate users, delete users, export CSV (users/appointments/payments/reviews), see live activity feed and system health |

---

## Complete Feature List (with buttons)

### Authentication & Account
- **Login page** — Login, "Don't have an account? Register" link
- **Register page** — role selector (Patient / Doctor), Register button
- Doctor signups land in **Pending Approval** state — they see a banner until admin approves
- JWT token stored in `localStorage`; auto-attached to every request
- Auto-logout on 401 (token expiry) — redirects to `/login`
- **Logout** button (top bar) with confirmation dialog
- **Change Password** dialog (validates current password + min 6 chars + match)

### Patient Features
- **Patient Dashboard** — stat cards (upcoming count, available doctors, prescription count) + quick actions
- **AI Symptom Checker** (`/dashboard/chat`) — chat bubble UI; Send button; "Reset / New chat" button; recommended doctor cards inline at end of conversation; falls back to rule-based matcher if Python ML service is offline
- **Browse Doctors** — debounced name search, specialization filter chips, pagination (9 per page); doctor cards show rating, fees, reviewCount, View Profile + Book Appointment buttons
- **Doctor Profile Page** — bio, qualifications, fees, full review list with stars, Book Appointment button
- **Book Appointment Page** — day-grouped slot picker, symptoms textarea, **Confirm & Pay** button → opens Razorpay checkout
- **Razorpay Checkout** — UPI / Card / NetBanking; on success → confirmation email + calendar links; on failure → "Try Again" button
- **My Appointments** — tabs: Upcoming / Past / Cancelled; auto-refreshes every 30s
- **Appointment Card buttons** (patient): Cancel (with confirmation), **Add to Calendar** (Google / Outlook / .ics download), **View Prescription** (after completion), **Rate Doctor** (after completion, 1-5 stars + comment)
- **Prescription Dialog** — view medications (name, dosage, frequency, duration), notes, **Download PDF** button
- **Rating Dialog** — interactive 5-star picker, optional comment, Submit
- **Notification Bell** (top bar) — shows confirmed appointments in next 24h
- **Profile Page** — view & edit age, gender, blood group, medical history; Change Password

### Doctor Features
- **Doctor Dashboard** — today's appointment count, pending requests, confirmed count, today's schedule preview, Manage Availability quick action
- **Appointments Page** — filter buttons (All / Pending / Confirmed / Completed); per-card actions: **Accept**, **Reject** (confirm), **Mark Complete**, **Cancel** (confirm), **Issue Prescription**
- **Prescription Dialog** (doctor) — add medication rows (name, dosage, frequency, duration), notes textarea, Save
- **Manage Availability** — add date+time slot button, remove slot chip, Save Changes button (replaces the doctor's slot list on the backend)
- **Profile Page** — edit specialization, experience, qualification, fees, bio
- Pending-approval banner shown until admin approves the doctor

### Admin Features
- **Admin Dashboard** — recharts-powered:
  - 4 KPI cards: Total Patients, Total Doctors, Total Appointments, Net Revenue
  - Line chart: appointments per day (last 7 / 30 / 60 days dropdown)
  - Bar chart: appointments by status (Pending / Confirmed / Completed / Cancelled)
  - Pie chart: top 5 specializations by volume
  - Revenue trend chart (PAID + REFUNDED grouped by paidAt)
  - Top-rated doctors list, Recent reviews feed, Live activity feed
  - System Health card: Mongo / Mailer / ML service / Razorpay status indicators
- **User Management Page** — search, filter by role, paginated table; per-row actions: Activate / Deactivate, Delete (confirm)
- **Doctor Approvals Page** — list of pending doctor signups; **Approve** / **Reject** buttons per row
- **Export buttons** — Users CSV, Appointments CSV, Payments CSV, Reviews CSV

### Cross-Cutting UX
- **DashboardLayout** — top app bar (logo, role badge, notification bell, profile menu, logout) + sidebar (desktop) / bottom nav (mobile)
- **PageTransition** — fade animation between routes
- **LoadingSpinner**, **ErrorMessage** (with Retry), **EmptyState** on every list
- **Toast notifications** (SnackbarContext) — success/error/info pop-ups for every action
- **ConfirmDialog** — reusable "Are you sure?" before destructive actions
- **ProtectedRoute** — redirects unauthenticated users to `/login`
- **Lazy-loaded pages** (React.Suspense + React.lazy) for fast first-paint
- Mobile-responsive layout

---

## Technology Stack

### Backend (Java)

| Layer | Tech | Why |
|---|---|---|
| Language | **Java 17** | Modern LTS |
| Framework | **Spring Boot 3.2.3** | REST API + DI + auto-config |
| Security | **Spring Security + JJWT 0.12.5** | JWT-based stateless auth |
| Database | **MongoDB** + Spring Data MongoDB | Flexible document store |
| Email | **Spring Boot Starter Mail** (JavaMailSender) | Booking / confirmation / reminder mails |
| Payments | **Razorpay Java SDK 1.4.6** | Real payment gateway w/ signature verification |
| PDF | **OpenPDF 1.3.34** | Generate prescription PDFs |
| Config | **spring-dotenv 4.0.0** | `.env` → Spring environment |
| Docs | **Springdoc OpenAPI 2.3.0** | Auto-generated Swagger UI |
| Boilerplate | **Lombok** | `@Data`, `@RequiredArgsConstructor` |
| Build | **Maven 3.x** | Dependency + build |
| Scheduling | `@Scheduled` cron | Daily reminder dispatcher |
| Async | `@Async` | Non-blocking email send |

### Frontend (React)

| Tech | Version | Why |
|---|---|---|
| **React** | 19.2 | UI |
| **React Router** | v7 | SPA routing + protected routes |
| **Material-UI (MUI)** | v7 | Components + theme |
| **Axios** | 1.13 | HTTP client + interceptors |
| **Recharts** | 3.8 | Admin dashboard charts |
| **Razorpay Checkout JS** | (CDN) | Payment popup |
| **Playwright** | 1.59 | E2E test suite |

### ML Microservice (Python)

| Tech | Why |
|---|---|
| **Python 3 + Flask** | Lightweight REST API |
| **scikit-learn** (TF-IDF + RandomForest) | Specialization & severity classification |
| **joblib** | Model serialization (`.pkl`) |
| **Flask-CORS** | Cross-origin from Spring Boot |

---

## System Architecture — End-to-End Flow

```
┌─────────────────────────┐
│   Browser (React SPA)   │   localhost:3000
│  ─ MUI components       │
│  ─ Razorpay Checkout JS │
└────────────┬────────────┘
             │ HTTPS / JSON   Authorization: Bearer <JWT>
             ▼
┌─────────────────────────┐
│  Spring Boot REST API   │   localhost:8080
│  ─ Controllers          │
│  ─ Services             │
│  ─ Spring Security/JWT  │
│  ─ @Scheduled, @Async   │
└──┬─────┬─────┬─────┬────┘
   │     │     │     │
   │     │     │     └──► Razorpay API (orders, refunds, signature)
   │     │     │
   │     │     └────────► JavaMailSender → Gmail SMTP
   │     │
   │     └──────────────► Python Flask ML service  (localhost:5000)
   │                       └─ TF-IDF + RandomForest models (.pkl)
   ▼
┌─────────────────────────┐
│        MongoDB          │   localhost:27017
│ users / appointments /  │
│ payments / prescriptions│
│ reviews / chatSessions /│
│ reminders               │
└─────────────────────────┘
```

The frontend never talks to MongoDB or Razorpay directly. Everything flows through the Spring Boot API, which is the single source of truth and authority.

---

## Backend — How It Works

### Layered Architecture

```
HTTP Request
    │
    ▼
JwtAuthenticationFilter   ← reads "Authorization: Bearer ..." → identifies user
    │
    ▼
Controller                ← routes URL, validates DTOs, enforces @PreAuthorize roles
    │
    ▼
Service                   ← business logic, state transitions, calls other services
    │
    ▼
Repository (Spring Data)  ← MongoDB CRUD
    │
    ▼
MongoDB
```

### Security Flow

1. `POST /api/auth/login` with username/password.
2. `UserService` checks BCrypt-hashed password.
3. `JwtUtil` issues a 24-hour signed token (HS256, 256-bit secret from `.env`).
4. Frontend stores token in `localStorage`.
5. Every subsequent request includes `Authorization: Bearer <token>`.
6. `JwtAuthenticationFilter` parses the token, loads the user via `UserDetailsServiceImpl`, and sets the Spring `SecurityContext`.
7. `@PreAuthorize("hasRole('PATIENT')")` etc. on controllers enforces role checks.
8. CORS is open to `http://localhost:3000` only.
9. Stateless — no server-side session.

### Key Services

| Service | What it does |
|---|---|
| `UserService` | Registration (BCrypt hash), profile update, password change, role-aware field handling |
| `DoctorService` | Doctor search, paginated listing (only approved + active), availability replace |
| `AppointmentService` | Booking, state-machine transitions (`PENDING_PAYMENT → PENDING → CONFIRMED → COMPLETED`/`CANCELLED`), role validation |
| `SlotManagementService` | Removes a booked slot from the doctor's `availableSlots`, restores it on cancel |
| `PaymentService` | Wraps Razorpay SDK: create order, verify signature, mark failed, issue refund. Demo mode (`razorpay.enabled=false`) mocks orders so the full UX runs without a real gateway |
| `EmailService` | Async HTML emails: booking, confirmation (CC doctor), reminder, cancellation, payment-failed |
| `ReminderScheduler` | `@Scheduled` cron at 09:00 daily — finds tomorrow's confirmed appointments and queues reminder emails |
| `PrescriptionService` | Doctor-only create/update for a `COMPLETED` appointment; patient/doctor read |
| `PdfGenerationService` | OpenPDF — renders prescription as branded A4 PDF (header, doctor info, medication table, footer signature) |
| `ReviewService` | Patient creates one review per completed appointment; recomputes doctor's running average rating + reviewCount |
| `CalendarService` | Builds RFC-5545 `.ics` content + Google Calendar deep link + Outlook deep link |
| `MLServiceClient` | RestTemplate wrapper around the Python ML service. Returns `null` on any error → caller falls back to `SymptomMatcher` |
| `SymptomMatcher` | Pure-Java fallback chatbot. Keyword + intensity scoring → recommends a specialization |

### Configuration (`application.properties` + `.env`)

```properties
# Mongo
spring.data.mongodb.uri=mongodb://localhost:27017/major_project_db

# JWT
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000     # 24h

# Mail (Gmail SMTP via .env)
spring.mail.host=smtp.gmail.com
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}

# Razorpay
razorpay.enabled=${RAZORPAY_ENABLED:false}
razorpay.key.id=${RAZORPAY_KEY_ID:}
razorpay.key.secret=${RAZORPAY_KEY_SECRET:}

# ML service
ml.service.enabled=true
ml.service.url=http://localhost:5000
```

### Auto-Seeded Data (`DataInitializer`)

On every startup the seeder ensures:
- An **admin** account (`admin / admin123` — change before deploying)
- 8 sample **doctors** (specs across Cardiology / Neurology / Orthopedics / Dermatology) all approved and active, password `doctor123`, with **fresh slots for the next 7 days** (4 per day at 09:00, 11:00, 14:00, 16:00).

### Swagger / OpenAPI

`http://localhost:8080/swagger-ui.html` — every endpoint groups, request/response schema, "Try it out" panel, "Authorize" button for JWT.

---

## Frontend — How It Works

### Routing (`App.js`)

Public: `/login`, `/register`.
Protected (wrapped by `ProtectedRoute` + `DashboardLayout`):

| Path | Page |
|---|---|
| `/dashboard` | Role-aware home (`PatientDashboard` / `DoctorDashboard` / `AdminDashboard`) |
| `/dashboard/doctors` | Browse doctors |
| `/dashboard/doctors/:id` | Doctor public profile |
| `/dashboard/book-appointment/:doctorId` | Booking + payment |
| `/dashboard/appointments` | Patient: my appointments |
| `/dashboard/doctor-appointments` | Doctor: my appointments |
| `/dashboard/availability` | Doctor: manage slots |
| `/dashboard/chat` | Patient: AI symptom checker |
| `/dashboard/users` | Admin: users |
| `/dashboard/statistics` | Admin: stats (also rendered from `/dashboard` for admins) |
| `/dashboard/doctor-approvals` | Admin: pending doctors |
| `/dashboard/profile` | Shared profile page |

All pages are **lazy-loaded** with `React.lazy` for fast initial paint.

### Global State — React Context (no Redux)

| Context | Stores | Used for |
|---|---|---|
| `AuthContext` | user object + JWT | `isPatient`, `isDoctor`, `isAdmin`, login/logout |
| `SnackbarContext` | toast queue | `success()`, `error()`, `info()` |

### Axios Setup (`services/api.js`)

- `baseURL: http://localhost:8080/api`
- **Request interceptor**: attaches `Authorization: Bearer <token>` from `localStorage`.
- **Response interceptor**: on 401 (and not on the auth endpoints) clears token + hard-redirects to `/login`.
- Per-domain API objects: `authAPI`, `userAPI`, `doctorAPI`, `appointmentAPI`, `paymentAPI`, `reviewAPI`, `prescriptionAPI`, `calendarAPI`, `notificationAPI`, `chatAPI`, `adminAPI`.

### Key Reusable Components

| Component | Job |
|---|---|
| `DashboardLayout` | Shell — AppBar, Sidebar (desktop) / BottomNav (mobile), notification bell, profile menu |
| `ProtectedRoute` | `<Outlet/>` guard — redirect to `/login` if no token |
| `PageTransition` | Fade transition wrapper |
| `AppointmentCard` | Role-aware action buttons + dialogs (cancel, accept, reject, complete, prescription, rating, calendar) |
| `DoctorCard` | Doctor list tile + Book button |
| `PrescriptionDialog` | Doctor's prescription creator (medication rows) |
| `PrescriptionViewDialog` | Patient's prescription viewer + Download PDF |
| `RatingDialog` | 5-star review submitter |
| `NotificationBell` | Polls `/api/notifications` for next-24h confirmed appointments |
| `ChangePasswordDialog`, `ConfirmDialog`, `EmptyState`, `ErrorMessage`, `LoadingSpinner`, `StatCard` | Standard UX primitives |

### Theme

`theme.js` defines a single MUI palette (blue primary, green success, orange warning, red error) and component overrides for buttons, cards, chips. Every page consumes this — no inline colors.

---

## The Python ML Microservice

A small Flask app that powers the **AI Symptom Checker** in the patient chat. It runs separately on `localhost:5000` and is called by Spring Boot's `MLServiceClient`.

### What it does

1. **Conversation manager** — multi-turn dialog state machine: symptom → severity → duration → additional → recommendation.
2. **Two scikit-learn pipelines** (TF-IDF char + word features → RandomForest):
   - `trained_specialization_model.pkl` — predicts which doctor specialization fits the symptom text.
   - `trained_severity_model.pkl` — classifies severity (mild / moderate / severe).
3. **Vocabulary coverage check** — if the patient's words don't match any known medical vocabulary, the bot asks for clarification instead of guessing.
4. **Red-flag detection** — flags chest pain, breathing problems, suicidal ideation, etc., and recommends emergency care.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | health check |
| POST | `/chat/start` | new welcome message + reset state |
| POST | `/chat/message` | next prompt or final recommendation |
| POST | `/chat/reset/<sessionId>` | clear server-side state |
| POST | `/predict` | one-shot classification |

### Java side — graceful degradation

`MLServiceClient` swallows network errors and returns `null`. The `ChatController` then switches to `SymptomMatcher` (pure-Java keyword scorer) for that session. **The chatbot never goes fully offline** — that's a deliberate design choice for the demo.

---

## Major Workflows Explained Step-by-Step

### 1. Booking + Payment

```
Patient picks slot + symptoms  →  POST /api/appointments
   ↳ Service creates Appointment with status = PENDING_PAYMENT
   ↳ Slot is removed from doctor.availableSlots so nobody else can take it
   ↳ EmailService.sendAppointmentBooked (async)

Frontend  →  POST /api/payments/create-order  { appointmentId }
   ↳ PaymentService calls Razorpay.orders.create(amount, currency)
   ↳ Persists Payment(status=CREATED, razorpayOrderId)
   ↳ Returns { orderId, key, amount } to frontend

Frontend opens Razorpay Checkout (popup)
   ↳ User pays
   ↳ Razorpay returns { razorpayOrderId, razorpayPaymentId, razorpaySignature }

Frontend  →  POST /api/payments/verify
   ↳ PaymentService.verifyPayment uses HMAC-SHA256 to verify the signature
   ↳ On success: Payment.status = PAID, Appointment.status = PENDING (awaiting doctor)
   ↳ EmailService.sendAppointmentConfirmation (async, CC doctor)

Failure path  →  POST /api/payments/failed
   ↳ Payment.status = FAILED, slot is released, patient emailed.
```

### 2. Doctor Lifecycle

```
Doctor signs up (POST /api/auth/register, role=DOCTOR)
   ↳ User saved with approved=false, active=true
   ↳ Cannot be discovered in /api/doctors yet (filtered out)
   ↳ Doctor sees a banner: "Pending admin approval"

Admin opens /dashboard/doctor-approvals
   ↳ GET  /api/admin/doctors/pending
   ↳ Clicks Approve  →  PUT /api/admin/doctors/{id}/approve
   ↳ Doctor.approved = true → now visible to patients
```

### 3. Appointment State Machine

```
                 (book + pay)
    [ PENDING_PAYMENT ]──────► [ PENDING ]──── doctor accepts ──► [ CONFIRMED ]
            │                       │                                  │
       payment fails           doctor rejects                    doctor marks done
            ▼                       ▼                                  ▼
       [ CANCELLED ]            [ CANCELLED ]                      [ COMPLETED ]
                                                                       │
                                                              prescription / review
```

Slot is auto-released back to the doctor's `availableSlots` on any `CANCELLED` transition. Patient → review allowed only after `COMPLETED`.

### 4. AI Symptom Checker

```
Patient clicks "Start chat"  →  POST /api/chat/start
   ↳ ChatController creates ChatSession (Mongo)
   ↳ Calls Python /chat/start with that session id
   ↳ Returns welcome message

Patient types symptom  →  POST /api/chat/message  { sessionId, message }
   ↳ Python ML pipeline:
        preprocess → predict_specialization → predict_severity → red-flag check
   ↳ Returns either next question or final recommendation + isComplete=true
   ↳ Java looks up doctors by predicted specialization → returns 4 cards inline

Python down?  →  Java falls back to SymptomMatcher (keyword/intensity rules)
```

### 5. Prescription + PDF

```
Doctor clicks "Issue Prescription" on a COMPLETED appointment
   ↳ PrescriptionDialog: list of medication rows + notes
   ↳ POST /api/prescriptions  { appointmentId, medications[], notes }
   ↳ Stored in `prescriptions` collection

Patient opens appointment  →  GET /api/prescriptions/appointment/{id}
   ↳ Sees medications + Download PDF button
   ↳ GET /api/prescriptions/{id}/pdf
        → PdfGenerationService renders A4 PDF with OpenPDF (header, table, signature)
```

### 6. Calendar Integration

After confirmation, patient sees three options on the appointment card:
- **Add to Google Calendar** → `GET /api/appointments/{id}/calendar/links` → opens Google Calendar URL with title/time/description prefilled.
- **Add to Outlook** → same idea, Outlook URL.
- **Download .ics** → `GET /api/appointments/{id}/calendar/ics` returns RFC-5545 file the OS opens with the default calendar app.

### 7. Reminders

`ReminderScheduler` runs at **09:00 every day** via Spring's `@Scheduled` cron:
1. Finds all `CONFIRMED` appointments scheduled in the next ~24h that don't yet have a `24H_BEFORE` reminder.
2. Persists a `Reminder` row to avoid duplicates across restarts.
3. Calls `EmailService.sendAppointmentReminder` (async).

### 8. Admin Analytics

`GET /api/admin/stats?days=7` aggregates everything in one call:
- User counts by role
- Appointments by status + per-day series
- Top 5 specializations + top 5 doctors by volume
- **Real revenue** from PAID/REFUNDED `Payment` rows (not faked from completed × fees)
- Payment KPIs: success rate, average ticket, daily revenue trend
- Platform avg rating, top-rated doctors, recent reviews
- Cancellation rate, prescription count, pending doctor approvals

---

## API Reference (every endpoint)

> All endpoints require `Authorization: Bearer <jwt>` unless marked **Public**.

### Auth — `/api/auth`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/register` | Public | Create patient or doctor account |
| POST | `/login` | Public | Get JWT |

### Users — `/api/users`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/profile` | Any | Own profile |
| PUT | `/profile` | Any | Update own profile |
| PUT | `/password` | Any | Change password |
| GET | `/{id}` | Admin | Look up any user |

### Doctors — `/api/doctors`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `?page=&size=` | Any | Paginated approved doctors |
| GET | `/{id}` | Any | Doctor details |
| GET | `/search?specialization=` | Any | Filter by spec |
| GET | `/available` | Any | Doctors with at least one slot |
| PUT | `/availability` | Doctor | Replace own slot list |

### Appointments — `/api/appointments`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `` | Patient | Book (status = PENDING_PAYMENT) |
| GET | `` | Any | My appointments (filtered by role) |
| GET | `/{id}` | Owner | Single appointment |
| PUT | `/{id}/status` | Doctor / Admin | CONFIRMED / COMPLETED / CANCELLED |
| DELETE | `/{id}` | Owner | Cancel (releases slot) |
| GET | `/{id}/calendar/links` | Owner | Google + Outlook URLs |
| GET | `/{id}/calendar/ics` | Owner | Download .ics |
| GET | `/{id}/calendar/google` | Owner | 302 to Google Calendar |
| GET | `/{id}/calendar/outlook` | Owner | 302 to Outlook |

### Payments — `/api/payments`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/create-order` | Patient | Razorpay order |
| POST | `/verify` | Patient | Verify signature, mark PAID |
| POST | `/failed` | Patient | Record failure + email |
| GET | `/history` | Patient | Own payment history |

### Prescriptions — `/api/prescriptions`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `` | Doctor | Create / update for an appointment |
| GET | `/appointment/{id}` | Patient/Doctor | By appointment |
| GET | `/mine` | Patient | All my prescriptions |
| GET | `/{id}/pdf` | Patient/Doctor | Download branded PDF |

### Reviews — `/api/reviews`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `` | Patient | Submit 1-5 stars + comment |
| GET | `/doctor/{id}?page=&size=` | Any | Paginated doctor reviews |
| GET | `/appointment/{id}` | Any | Existing review for an appointment |

### Chat / Symptom Checker — `/api/chat`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/start` | Patient | New session + welcome |
| POST | `/message` | Patient | Send message → bot reply (+ doctor cards when done) |
| GET | `/history` | Patient | All my chat sessions |

### Notifications — `/api/notifications`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `` | Any | Confirmed appointments in next 24h (drives bell) |

### Admin — `/api/admin`  *(role = ADMIN)*
| Method | Path | Purpose |
|---|---|---|
| GET | `/stats?days=` | Dashboard KPIs + charts |
| GET | `/appointments/trends` | 30-day appointment series |
| GET | `/doctors/performance?page=&size=` | Per-doctor metrics |
| GET | `/users?page=&size=&role=&search=` | List users |
| PUT | `/users/{id}/status` | Activate / deactivate |
| DELETE | `/users/{id}` | Delete user |
| GET | `/activity?limit=` | Live cross-module event feed |
| GET | `/health` | Mongo / Mailer / ML / Razorpay status |
| GET | `/export/{users\|appointments\|payments\|reviews}` | CSV download |
| GET | `/doctors/pending` | Pending doctor signups |
| PUT | `/doctors/{id}/approve` | Approve |
| PUT | `/doctors/{id}/reject` | Reject (sets approved=false, active=false) |

---

## Data Models

> All models live in MongoDB. `User`, `Patient`, `Doctor` share the **`users`** collection (single-table inheritance via Spring's discriminator).

### User (base)
`id, username, email, password (BCrypt), role (PATIENT/DOCTOR/ADMIN), active, createdAt`

### Patient extends User
`age, gender, bloodGroup, medicalHistory[]`

### Doctor extends User
`specialization, experience, qualification, fees, bio, rating, reviewCount, availableSlots[LocalDateTime], approved`

### Appointment (`appointments`)
`id, patientId, doctorId, dateTime, symptoms, status, fee, paymentId, createdAt`
Status enum: `PENDING_PAYMENT, PENDING, CONFIRMED, COMPLETED, CANCELLED`

### Payment (`payments`)
`id, appointmentId, patientId, razorpayOrderId, razorpayPaymentId, amount, currency, status, createdAt, paidAt, refundedAt`
Status: `CREATED, PAID, FAILED, REFUNDED`

### Prescription (`prescriptions`)
`id, appointmentId, patientId, doctorId, medications[Medication], notes, createdAt, updatedAt`
**Medication**: `name, dosage, frequency, duration`

### Review (`reviews`)
`id, appointmentId, patientId, doctorId, rating (1-5), comment, createdAt`

### ChatSession (`chatSessions`)
`id, patientId, messages[Message], detectedSymptoms[], recommendedSpecialization, awaitingIntensity, pendingKeywords[], useMlService, active, timestamp`

### Reminder (`reminders`)
`id, appointmentId, userId, reminderType, sentAt`

---

## Project Structure

```
Major_Project/
├── src/main/java/org/example/
│   ├── Main.java
│   ├── config/         DataInitializer, SecurityConfig, MongoConfig, SwaggerConfig
│   ├── controller/     Auth, User, Doctor, Appointment, Payment, Prescription,
│   │                   Review, Chat, Notification, Calendar, Admin
│   ├── service/        UserService, DoctorService, AppointmentService,
│   │                   SlotManagementService, PaymentService, EmailService,
│   │                   ReminderScheduler, PrescriptionService, PdfGenerationService,
│   │                   ReviewService, CalendarService, MLServiceClient, SymptomMatcher
│   ├── model/          User, Patient, Doctor, Appointment, AppointmentStatus,
│   │                   Payment, PaymentStatus, Prescription, Medication, Review,
│   │                   ChatSession, Message, Reminder, Role
│   ├── dto/            All request/response DTOs (never expose raw entities)
│   ├── repository/     UserRepo, DoctorRepo, PatientRepo, AppointmentRepo,
│   │                   PaymentRepo, PrescriptionRepo, ReviewRepo,
│   │                   ChatSessionRepo, ReminderRepo
│   ├── security/       JwtUtil, JwtAuthenticationFilter, UserDetailsServiceImpl
│   └── exception/      AppException, GlobalExceptionHandler
│
├── src/main/resources/application.properties
│
├── frontend/
│   └── src/
│       ├── App.js, index.js, theme.js
│       ├── context/    AuthContext, SnackbarContext
│       ├── services/   api.js (all axios calls)
│       ├── components/ DashboardLayout, ProtectedRoute, PageTransition,
│       │               AppointmentCard, DoctorCard, PrescriptionDialog,
│       │               PrescriptionViewDialog, RatingDialog, NotificationBell,
│       │               StatCard, ChangePasswordDialog, ConfirmDialog,
│       │               EmptyState, ErrorMessage, LoadingSpinner
│       └── pages/      LoginPage, RegisterPage, PatientDashboard, DoctorDashboard,
│                       AdminDashboard, DoctorListPage, DoctorProfilePage,
│                       BookAppointmentPage, PatientAppointmentsPage,
│                       DoctorAppointmentsPage, DoctorAvailabilityPage,
│                       UserManagementPage, DoctorApprovalsPage, ChatPage,
│                       ProfilePage, DashboardPage
│
├── healthcare-ml-service/
│   ├── app.py                                  Flask API
│   ├── models/conversation_manager.py          Multi-turn FSM
│   ├── models/severity_analyzer.py             Rule-based severity + red-flag
│   ├── training/train_model.py                 Builds TF-IDF + RandomForest pipelines
│   ├── training/medical_data.csv               250+ labelled rows
│   ├── training/trained_specialization_model.pkl
│   └── training/trained_severity_model.pkl
│
├── e2e/full_test.js                            Playwright E2E suite
├── postman_collection.json                     API requests for manual testing
├── pom.xml
└── README.md                                   ← this file
```

---

## Running the Project

### Prerequisites
- Java 17+, Maven 3.x
- MongoDB on `localhost:27017`
- Node.js 18+
- Python 3.10+ (only for ML service)

### 1 — MongoDB
```bash
mongod --dbpath /data/db
# or:  docker run -d -p 27017:27017 --name mongo mongo:latest
```

### 2 — Backend
Create `.env` at project root (used by `spring-dotenv`):
```env
JWT_SECRET=<256-bit random string>
MAIL_USERNAME=youraddress@gmail.com
MAIL_PASSWORD=<gmail app password>
RAZORPAY_ENABLED=false
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```
Then:
```bash
mvn spring-boot:run
# → http://localhost:8080  (Swagger: /swagger-ui.html)
```
Seeds 1 admin + 8 doctors with fresh slots automatically.

### 3 — Frontend
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

### 4 — ML Service (optional)
```bash
cd healthcare-ml-service
pip install -r requirements.txt
python training/train_model.py     # builds .pkl files
python app.py                      # → http://localhost:5000
```
If skipped, the chat falls back to the rule-based Java matcher.

### Quick-start accounts
| Role | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| Doctor | dr_rajesh | doctor123 |
| Doctor | dr_priya | doctor123 |
| Patient | (register from `/register`) | — |

---

## Talking Points for the Presentation

A short cheat-sheet — pick what fits the moment.

1. **"Three roles, one codebase"** — the same React app and the same Spring Boot API serve patients, doctors, and admins. Role is encoded in the JWT and enforced at the controller layer with `@PreAuthorize`.
2. **"Stateless JWT auth"** — no server session; every request carries its own identity. Token expires in 24h, BCrypt-hashed passwords.
3. **"Real payment integration"** — Razorpay orders, server-side HMAC-SHA256 signature verification, refunds on cancellation, demo-mode toggle so I can show the full UX without a real Razorpay key.
4. **"Real ML"** — Python Flask microservice with two scikit-learn pipelines (TF-IDF + RandomForest) for specialization and severity. Java falls back to a rule-based matcher if Python is offline — chat never breaks.
5. **"Async + Scheduled"** — emails sent via `@Async`, daily reminder cron via `@Scheduled` at 09:00.
6. **"Clean state machine"** — five appointment states with one-way transitions; slots auto-released on cancel.
7. **"Admin observability"** — `/api/admin/stats` returns charts + payment KPIs + activity feed in one call; system-health endpoint reports Mongo/Mailer/ML/Razorpay status.
8. **"PDF generation in-process"** — OpenPDF renders branded prescription PDFs without an external service.
9. **"Calendar interop"** — RFC-5545 `.ics`, Google Calendar URL, Outlook deep link.
10. **"Lazy-loaded SPA"** — every page is a `React.lazy` import; first paint stays fast as the app grew.
11. **"Doctor approval gate"** — new doctor signups are invisible to patients until an admin approves them.
12. **"Graceful degradation everywhere"** — payment demo mode, ML fallback, mail-skip when SMTP not configured. The app runs end-to-end on a fresh laptop with zero external accounts.
