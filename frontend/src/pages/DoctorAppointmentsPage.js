import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Button, Grid,
  CircularProgress, Alert, Paper, Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AppointmentCard from '../components/AppointmentCard';
import { appointmentAPI } from '../services/api';

const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED'];

function isToday(dtStr) {
  if (!dtStr) return false;
  const d = new Date(dtStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth()    === now.getMonth()    &&
         d.getDate()     === now.getDate();
}

function nextTime(appointments) {
  const upcoming = appointments
    .filter((a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.dateTime) > new Date())
    .sort((x, y) => new Date(x.dateTime) - new Date(y.dateTime));
  if (!upcoming.length) return null;
  return new Date(upcoming[0].dateTime).toLocaleTimeString('en-IN', { timeStyle: 'short' });
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filter, setFilter]             = useState('ALL');
  const [acting, setActing]             = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await appointmentAPI.getAll();
      setAppointments(data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    setActing(true);
    try {
      let resp;
      if (status === 'CANCEL') {
        resp = await appointmentAPI.cancel(id);
      } else {
        resp = await appointmentAPI.updateStatus(id, status);
      }
      setAppointments((prev) => prev.map((a) => (a.id === id ? resp.data : a)));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  // Derived counts
  const todayAppts  = appointments.filter((a) => isToday(a.dateTime));
  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const nextAppt     = nextTime(appointments);

  // Filtered list
  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const countOf = (s) => appointments.filter((a) => a.status === s).length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">Appointments</Typography>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />}
          onClick={load} sx={{ textTransform: 'none' }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Today's summary */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 4, flexWrap: 'wrap', bgcolor: '#f8f9fa' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Today's Appointments</Typography>
          <Typography variant="h5" fontWeight="bold">{todayAppts.length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Pending Requests</Typography>
          <Typography variant="h5" fontWeight="bold" color="#ed6c02">{pendingCount}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Next Appointment</Typography>
          <Typography variant="h5" fontWeight="bold" color="#1976d2">
            {nextAppt ?? '—'}
          </Typography>
        </Box>
      </Paper>

      {/* Filter buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const count = f === 'ALL' ? appointments.length : countOf(f);
          const active = filter === f;
          return (
            <Button key={f} size="small" variant={active ? 'contained' : 'outlined'}
              onClick={() => setFilter(f)}
              sx={{ textTransform: 'none', borderRadius: 3 }}
              endIcon={<Chip label={count} size="small"
                sx={{
                  height: 18, fontSize: 11,
                  bgcolor: active ? 'rgba(255,255,255,0.3)' : undefined,
                  color: active ? '#fff' : undefined,
                }} />}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Button>
          );
        })}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">No appointments in this category.</Alert>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((a) => (
            <Grid item xs={12} sm={6} md={4} key={a.id}>
              <AppointmentCard
                appointment={a}
                userRole="DOCTOR"
                onStatusChange={handleStatusChange}
                acting={acting}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
