import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container, Grid, Card, CardContent, Typography, Button, Box, Chip,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { appointmentAPI } from '../services/api';

function isToday(dtStr) {
  const d = new Date(dtStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth()    === now.getMonth()    &&
         d.getDate()     === now.getDate();
}

export default function DoctorDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    appointmentAPI.getAll()
      .then(({ data }) => setAppointments(data))
      .catch(() => {});
  }, []);

  const todayAppts   = appointments.filter((a) => isToday(a.dateTime));
  const pending      = appointments.filter((a) => a.status === 'PENDING').length;
  const confirmed    = appointments.filter((a) => a.status === 'CONFIRMED').length;

  const CARDS = [
    {
      title: "Today's Appointments",
      value: todayAppts.length,
      icon: <CalendarTodayIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      color: '#e3f2fd', border: '#1976d2',
      onClick: () => navigate('/dashboard/doctor-appointments'),
    },
    {
      title: 'Pending Confirmation',
      value: pending,
      icon: <AccessTimeIcon sx={{ fontSize: 40, color: '#ed6c02' }} />,
      color: '#fff3e0', border: '#ed6c02',
      onClick: () => navigate('/dashboard/doctor-appointments?filter=PENDING'),
    },
    {
      title: 'Confirmed Today',
      value: confirmed,
      icon: <EventAvailableIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
      color: '#e8f5e9', border: '#2e7d32',
      onClick: () => navigate('/dashboard/doctor-appointments?filter=CONFIRMED'),
    },
  ];

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome, Dr. {user?.username}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's your practice overview for today.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {CARDS.map(({ title, value, icon, color, border, onClick }) => (
          <Grid item xs={12} sm={4} key={title}>
            <Card elevation={2} onClick={onClick} sx={{
              bgcolor: color, borderLeft: `5px solid ${border}`,
              cursor: onClick ? 'pointer' : 'default',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                {icon}
                <Box>
                  <Typography variant="h4" fontWeight="bold">{value}</Typography>
                  <Typography variant="body2" color="text.secondary">{title}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Today's appointments quick view */}
      {todayAppts.length > 0 && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Today's Schedule
            </Typography>
            {todayAppts.slice(0, 5).map((a) => (
              <Box key={a.id} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 1, borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="body2">
                  {new Date(a.dateTime).toLocaleTimeString('en-IN', { timeStyle: 'short' })} — {a.patientName}
                </Typography>
                <Chip
                  label={a.status}
                  size="small"
                  color={a.status === 'CONFIRMED' ? 'primary' : 'warning'}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Card elevation={2} sx={{ p: 1 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Quick Actions</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<CalendarTodayIcon />}
              onClick={() => navigate('/dashboard/doctor-appointments')}
              sx={{ textTransform: 'none', bgcolor: '#1976d2' }}>
              View All Appointments
            </Button>
            <Button variant="outlined" startIcon={<EventAvailableIcon />}
              onClick={() => navigate('/dashboard/availability')}
              sx={{ textTransform: 'none', borderColor: '#2e7d32', color: '#2e7d32' }}>
              Manage Availability
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
