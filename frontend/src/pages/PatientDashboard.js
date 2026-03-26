import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container, Grid, Card, CardContent, Typography, Button, Box,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';

const SUMMARY_CARDS = [
  {
    title: 'Upcoming Appointments',
    value: '0',
    icon: <CalendarTodayIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
    color: '#e3f2fd',
    borderColor: '#1976d2',
  },
  {
    title: 'Available Doctors',
    value: '0',
    icon: <LocalHospitalIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
    color: '#e8f5e9',
    borderColor: '#2e7d32',
  },
  {
    title: 'Profile Status',
    value: 'Complete',
    icon: <PersonIcon sx={{ fontSize: 40, color: '#ed6c02' }} />,
    color: '#fff3e0',
    borderColor: '#ed6c02',
  },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        {SUMMARY_CARDS.map(({ title, value, icon, color, borderColor }) => (
          <Grid item xs={12} sm={4} key={title}>
            <Card
              elevation={2}
              sx={{
                bgcolor: color,
                borderLeft: `5px solid ${borderColor}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                {icon}
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {title}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Card elevation={2} sx={{ p: 1 }}>
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
    </Container>
  );
}
