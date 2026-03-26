import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Tabs, Tab, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { appointmentAPI } from '../services/api';

const STATUS_CHIP = {
  PENDING:   { label: 'Pending',   color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'primary' },
  COMPLETED: { label: 'Completed', color: 'default' },
  CANCELLED: { label: 'Cancelled', color: 'error'   },
};

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const REFRESH_INTERVAL = 30_000; // 30 seconds

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [tab, setTab]                   = useState(0);       // 0=Upcoming, 1=Past, 2=Cancelled
  const [cancelling, setCancelling]     = useState(null);
  const [confirmId, setConfirmId]       = useState(null);    // id pending cancel confirmation
  const intervalRef                     = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await appointmentAPI.getAll();
      setAppointments(data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load appointments.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30 s
  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const handleCancelConfirm = async () => {
    const id = confirmId;
    setConfirmId(null);
    setCancelling(id);
    try {
      const { data } = await appointmentAPI.cancel(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? data : a)));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to cancel appointment.');
    } finally {
      setCancelling(null);
    }
  };

  const upcoming   = appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED');
  const past       = appointments.filter((a) => a.status === 'COMPLETED');
  const cancelled  = appointments.filter((a) => a.status === 'CANCELLED');
  const tabRows    = [upcoming, past, cancelled][tab];

  const showAction = tab === 0; // only Upcoming tab has cancel button

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">My Appointments</Typography>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />}
          onClick={() => load()} sx={{ textTransform: 'none' }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Past (${past.length})`} />
        <Tab label={`Cancelled (${cancelled.length})`} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : tabRows.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No appointments found.
          </Typography>
          {tab === 0 && (
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/dashboard/doctors')}
              sx={{ mt: 2, textTransform: 'none', bgcolor: '#1976d2' }}>
              Book New Appointment
            </Button>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Doctor</strong></TableCell>
                <TableCell><strong>Date &amp; Time</strong></TableCell>
                <TableCell><strong>Symptoms</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                {showAction && <TableCell align="center"><strong>Action</strong></TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {tabRows.map((a) => {
                const chip      = STATUS_CHIP[a.status] ?? { label: a.status, color: 'default' };
                const canCancel = a.status === 'PENDING' || a.status === 'CONFIRMED';
                return (
                  <TableRow key={a.id} hover>
                    <TableCell>Dr. {a.doctorName}</TableCell>
                    <TableCell>{formatDT(a.dateTime)}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {a.symptoms}
                    </TableCell>
                    <TableCell>
                      <Chip label={chip.label} color={chip.color} size="small" />
                    </TableCell>
                    {showAction && (
                      <TableCell align="center">
                        {canCancel && (
                          <Button size="small" color="error" variant="outlined"
                            startIcon={<CancelIcon />}
                            disabled={cancelling === a.id}
                            onClick={() => setConfirmId(a.id)}
                            sx={{ textTransform: 'none' }}>
                            {cancelling === a.id ? 'Cancelling…' : 'Cancel'}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)}>
        <DialogTitle>Cancel Appointment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)} sx={{ textTransform: 'none' }}>
            Keep It
          </Button>
          <Button onClick={handleCancelConfirm} color="error" variant="contained"
            sx={{ textTransform: 'none' }}>
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
