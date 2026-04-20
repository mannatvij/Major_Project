import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const LoginPage               = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage            = React.lazy(() => import('./pages/RegisterPage'));
const PatientDashboard        = React.lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard         = React.lazy(() => import('./pages/DoctorDashboard'));
const AdminDashboard          = React.lazy(() => import('./pages/AdminDashboard'));
const UserManagementPage      = React.lazy(() => import('./pages/UserManagementPage'));
const DoctorListPage          = React.lazy(() => import('./pages/DoctorListPage'));
const BookAppointmentPage     = React.lazy(() => import('./pages/BookAppointmentPage'));
const PatientAppointmentsPage = React.lazy(() => import('./pages/PatientAppointmentsPage'));
const DoctorAppointmentsPage  = React.lazy(() => import('./pages/DoctorAppointmentsPage'));
const DoctorAvailabilityPage  = React.lazy(() => import('./pages/DoctorAvailabilityPage'));
const ProfilePage             = React.lazy(() => import('./pages/ProfilePage'));
const ChatPage                = React.lazy(() => import('./pages/ChatPage'));

// ─── Loading spinner ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}

// ─── Role-aware dashboard home ────────────────────────────────────────────────
function DashboardHome() {
  const { isDoctor, isAdmin } = useAuth();
  if (isAdmin)  return <AdminDashboard />;
  if (isDoctor) return <DoctorDashboard />;
  return <PatientDashboard />;
}

// ─── Wrap a page inside DashboardLayout ──────────────────────────────────────
function WithLayout({ Page }) {
  return <DashboardLayout><Page /></DashboardLayout>;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"                             element={<WithLayout Page={DashboardHome} />} />
            {/* Admin routes */}
            <Route path="/dashboard/users"                       element={<WithLayout Page={UserManagementPage} />} />
            <Route path="/dashboard/statistics"                  element={<WithLayout Page={AdminDashboard} />} />
            {/* Patient routes */}
            <Route path="/dashboard/doctors"                     element={<WithLayout Page={DoctorListPage} />} />
            <Route path="/dashboard/book-appointment/:doctorId"  element={<WithLayout Page={BookAppointmentPage} />} />
            <Route path="/dashboard/appointments"                element={<WithLayout Page={PatientAppointmentsPage} />} />
            {/* Doctor routes */}
            <Route path="/dashboard/doctor-appointments"         element={<WithLayout Page={DoctorAppointmentsPage} />} />
            <Route path="/dashboard/availability"                element={<WithLayout Page={DoctorAvailabilityPage} />} />
            {/* Patient — AI symptom checker */}
            <Route path="/dashboard/chat"                        element={<WithLayout Page={ChatPage} />} />
            {/* Shared */}
            <Route path="/dashboard/profile"                     element={<WithLayout Page={ProfilePage} />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;
