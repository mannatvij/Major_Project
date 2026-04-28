import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container, Grid, Card, CardContent, Typography, Button, Box, useTheme, alpha,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { userAPI, appointmentAPI, doctorAPI } from '../services/api';
import StatCard from '../components/StatCard';

function isPatientProfileComplete(profile) {
  if (!profile) return false;
  return Boolean(profile.age && profile.gender && profile.bloodGroup);
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme    = useTheme();
  const isDark   = theme.palette.mode === 'dark';

  const [profile, setProfile]               = useState(null);
  const [upcomingCount, setUpcomingCount]   = useState(null);
  const [availableCount, setAvailableCount] = useState(null);

  useEffect(() => {
    userAPI.getProfile().then(({ data }) => setProfile(data)).catch(() => {});
    appointmentAPI.getAll()
      .then(({ data }) => {
        const count = data.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length;
        setUpcomingCount(count);
      })
      .catch(() => setUpcomingCount(0));
    doctorAPI.getAvailable()
      .then(({ data }) => setAvailableCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setAvailableCount(0));
  }, []);

  const profileComplete = isPatientProfileComplete(profile);
  const profileAccent   = profileComplete ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Container maxWidth="lg">
      {/* Hero */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Welcome back, {user?.username ?? 'User'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's a summary of your healthcare activity.
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            index={0}
            title="Upcoming Appointments"
            value={upcomingCount}
            loading={upcomingCount === null}
            icon={<CalendarTodayIcon sx={{ fontSize: 28 }} />}
            accent={theme.palette.primary.main}
            onClick={() => navigate('/dashboard/appointments')}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            index={1}
            title="Available Doctors"
            value={availableCount}
            loading={availableCount === null}
            icon={<LocalHospitalIcon sx={{ fontSize: 28 }} />}
            accent={theme.palette.success.main}
            onClick={() => navigate('/dashboard/doctors')}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            index={2}
            title="Profile Status"
            value={profile === null ? '…' : profileComplete ? 'Complete' : 'Incomplete'}
            icon={<PersonIcon sx={{ fontSize: 28 }} />}
            accent={profileAccent}
            subtitle={!profileComplete && profile !== null ? 'Tap to complete your profile' : undefined}
            onClick={!profileComplete && profile !== null ? () => navigate('/dashboard/profile') : undefined}
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{
        mb: 3,
        opacity: 0,
        animation: 'fadeUp 0.5s 0.28s ease both',
        '@keyframes fadeUp': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CalendarTodayIcon />}
            onClick={() => navigate('/dashboard/doctors')}
            sx={{ px: 3, py: 1.2 }}
          >
            Book Appointment
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="success"
            startIcon={<LocalHospitalIcon />}
            onClick={() => navigate('/dashboard/doctors')}
            sx={{ px: 3, py: 1.2 }}
          >
            Browse Doctors
          </Button>
        </Box>
      </Box>

      {/* AI Assistant */}
      <Card
        onClick={() => navigate('/dashboard/chat')}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          color: '#fff',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.primary.light} 100%)`,
          boxShadow: `0 18px 36px ${alpha(theme.palette.primary.main, isDark ? 0.45 : 0.35)}`,
          opacity: 0,
          animation: 'fadeUp 0.55s 0.36s ease both',
          '&:hover': { transform: 'translateY(-3px)' },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
            transform: 'translateX(-100%)',
            animation: 'shimmer 3.6s ease-in-out infinite',
          },
          '@keyframes shimmer': {
            '0%':   { transform: 'translateX(-100%)' },
            '55%':  { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            right: -40, bottom: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <CardContent sx={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 2, py: 3.5, zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 60, height: 60, borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              <SmartToyIcon sx={{ fontSize: 34 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>AI Health Assistant</Typography>
              <Typography variant="body2" sx={{ opacity: 0.92, maxWidth: 480 }}>
                Not sure which doctor to see? Describe your symptoms and get an instant recommendation.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: '#fff', color: 'primary.main', fontWeight: 700,
              px: 3, py: 1.2,
              '&:hover': { bgcolor: alpha('#ffffff', 0.9), transform: 'translateY(-1px)' },
            }}
          >
            Talk to Assistant
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
