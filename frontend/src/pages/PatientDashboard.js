import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container, Grid, Card, CardContent, Typography, Button, Box,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { userAPI, appointmentAPI, doctorAPI } from '../services/api';

/** Returns true only when all required patient fields are filled. */
function isPatientProfileComplete(profile) {
  if (!profile) return false;
  return Boolean(profile.age && profile.gender && profile.bloodGroup);
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]               = useState(null);
  const [upcomingCount, setUpcomingCount]   = useState(null);
  const [availableCount, setAvailableCount] = useState(null);

  useEffect(() => {
    userAPI.getProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => {});

    appointmentAPI.getAll()
      .then(({ data }) => {
        const count = data.filter(
          (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
        ).length;
        setUpcomingCount(count);
      })
      .catch(() => setUpcomingCount(0));

    doctorAPI.getAvailable()
      .then(({ data }) => {
        // endpoint returns a plain list of doctor objects
        setAvailableCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => setAvailableCount(0));
  }, []);

  const profileComplete = isPatientProfileComplete(profile);
  // Show nothing until the profile is loaded so it doesn't flash "Incomplete"
  const profileLabel   = profile === null ? '…' : profileComplete ? 'Complete' : 'Incomplete';
  const profileColor   = profileComplete ? '#2e7d32' : '#d32f2f';
  const profileBg      = profileComplete ? '#e8f5e9'  : '#ffebee';
  const profileBorder  = profileComplete ? '#2e7d32'  : '#d32f2f';

  const SUMMARY_CARDS = [
    {
      title: 'Upcoming Appointments',
      value: upcomingCount === null ? '…' : String(upcomingCount),
      icon: <CalendarTodayIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      color: '#e3f2fd',
      borderColor: '#1976d2',
      onClick: () => navigate('/dashboard/appointments'),
    },
    {
      title: 'Available Doctors',
      value: availableCount === null ? '…' : String(availableCount),
      icon: <LocalHospitalIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
      color: '#e8f5e9',
      borderColor: '#2e7d32',
      onClick: () => navigate('/dashboard/doctors'),
    },
    {
      title: 'Profile Status',
      value: profileLabel,
      icon: <PersonIcon sx={{ fontSize: 40, color: profileColor }} />,
      color: profileBg,
      borderColor: profileBorder,
      onClick: !profileComplete && profile !== null ? () => navigate('/dashboard/profile') : undefined,
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Welcome message */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome back, {user?.username ?? 'User'}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's a summary of your healthcare activity.
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {SUMMARY_CARDS.map(({ title, value, icon, color, borderColor, onClick }) => (
          <Grid item xs={12} sm={4} key={title}>
            <Card
              elevation={2}
              onClick={onClick}
              sx={{
                bgcolor: color,
                borderLeft: `5px solid ${borderColor}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: onClick ? 'pointer' : 'default',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                {icon}
                <Box>
                  <Typography variant="h4" fontWeight="bold" color={title === 'Profile Status' ? profileColor : 'inherit'}>
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {title}
                  </Typography>
                  {title === 'Profile Status' && !profileComplete && profile !== null && (
                    <Typography variant="caption" color="error">
                      Tap to complete your profile
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Card elevation={2} sx={{ p: 1, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CalendarTodayIcon />}
              onClick={() => navigate('/dashboard/doctors')}
              sx={{ bgcolor: '#1976d2', textTransform: 'none', px: 3 }}
            >
              Book Appointment
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<LocalHospitalIcon />}
              onClick={() => navigate('/dashboard/doctors')}
              sx={{ borderColor: '#2e7d32', color: '#2e7d32', textTransform: 'none', px: 3 }}
            >
              Browse Doctors
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* AI Symptom Checker */}
      <Card elevation={2} sx={{
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: '#fff',
      }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SmartToyIcon sx={{ fontSize: 44, opacity: 0.9 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">AI Health Assistant</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Not sure which doctor to see? Describe your symptoms and get an instant recommendation.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard/chat')}
            sx={{
              bgcolor: '#fff', color: '#1976d2', fontWeight: 'bold',
              textTransform: 'none', px: 3,
              '&:hover': { bgcolor: '#e3f2fd' },
            }}
          >
            Talk to AI Assistant
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
