import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Tabs, Tab, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentIcon from '@mui/icons-material/Payment';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { appointmentAPI, paymentAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_CHIP = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'warning' },
  PENDING:   { label: 'Pending',   color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'primary' },
  COMPLETED: { label: 'Completed', color: 'default' },
  CANCELLED: { label: 'Cancelled', color: 'error'   },
};

const PAYMENT_CHIP = {
  PAID:     { label: 'Paid',     color: 'success' },
  REFUNDED: { label: 'Refunded', color: 'info'    },
  FAILED:   { label: 'Failed',   color: 'error'   },
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload  = () => resolve(!!window.Razorpay);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const REFRESH_INTERVAL = 30_000;

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useSnackbar();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [tab, setTab]                   = useState(0);
  const [cancelling, setCancelling]     = useState(null);
  const [confirmId, setConfirmId]       = useState(null);
  const [paying, setPaying]             = useState(null);
  const intervalRef                     = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await appointmentAPI.getAll();
      setAppointments(data);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to load appointments.';
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
      success('Appointment cancelled.');
    } catch (err) {
      showError(err.response?.data?.message ?? 'Failed to cancel appointment.');
    } finally {
      setCancelling(null);
    }
  };

  const handlePayNow = async (appt) => {
    setPaying(appt.id);
    try {
      const { data: order } = await paymentAPI.createOrder(appt.id);
      const verify = (paymentId, signature) => paymentAPI.verify({
        razorpayOrderId:   order.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      if (!order.liveMode) {
        await verify('pay_demo_' + Math.random().toString(36).slice(2, 14), 'demo');
        success('Payment received!');
        await load(true);
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) { showError('Could not load Razorpay checkout.'); return; }

      const rzp = new window.Razorpay({
        key: order.keyId, amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR', order_id: order.orderId,
        name: 'Smart Healthcare',
        description: `Consultation with Dr. ${appt.doctorName ?? ''}`,
        handler: async (resp) => {
          try {
            await verify(resp.razorpay_payment_id, resp.razorpay_signature);
            success('Payment received!');
            load(true);
          } catch (err) {
            showError(err.response?.data?.message ?? 'Payment verification failed.');
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.on('payment.failed', (resp) => {
        showError(resp.error?.description ?? 'Payment failed.');
      });
      rzp.open();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Could not start payment.');
    } finally {
      setPaying(null);
    }
  };

  const upcoming  = appointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT'
  );
  const past      = appointments.filter((a) => a.status === 'COMPLETED');
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED');
  const tabRows   = [upcoming, past, cancelled][tab];
  const showAction = tab === 0;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">My Appointments</Typography>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />}
          onClick={() => load()} sx={{ textTransform: 'none' }}>
          Refresh
        </Button>
      </Box>

      {error && <ErrorMessage message={error} onRetry={load} />}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Past (${past.length})`} />
        <Tab label={`Cancelled (${cancelled.length})`} />
      </Tabs>

      {loading ? (
        <LoadingSpinner message="Loading appointments…" />
      ) : tabRows.length === 0 ? (
        <EmptyState
          icon={tab === 2 ? EventBusyIcon : CalendarTodayIcon}
          title={
            tab === 0 ? 'No upcoming appointments'
            : tab === 1 ? 'No past appointments'
            : 'No cancelled appointments'
          }
          subtitle={tab === 0 ? 'Book an appointment with a doctor to get started.' : undefined}
          actionLabel={tab === 0 ? 'Book Appointment' : undefined}
          onAction={tab === 0 ? () => navigate('/dashboard/doctors') : undefined}
        />
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.100' }}>
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
                const chip        = STATUS_CHIP[a.status] ?? { label: a.status, color: 'default' };
                const paymentChip = PAYMENT_CHIP[a.paymentStatus];
                const canCancel   = a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT';
                const canPay      = a.status === 'PENDING_PAYMENT' && a.fee > 0;
                return (
                  <TableRow key={a.id} hover>
                    <TableCell>Dr. {a.doctorName}</TableCell>
                    <TableCell>{formatDT(a.dateTime)}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {a.symptoms}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={chip.label} color={chip.color} size="small" />
                        {paymentChip && (
                          <Chip label={paymentChip.label} color={paymentChip.color} size="small" variant="outlined" />
                        )}
                      </Box>
                      {a.status === 'CONFIRMED' && (
                        <Typography variant="caption" display="block" color="success.main" sx={{ mt: 0.5 }}>
                          ✓ Doctor has confirmed
                        </Typography>
                      )}
                      {a.status === 'PENDING' && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          Awaiting doctor confirmation
                        </Typography>
                      )}
                      {a.status === 'PENDING_PAYMENT' && (
                        <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                          Complete payment to confirm slot
                        </Typography>
                      )}
                    </TableCell>
                    {showAction && (
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {canPay && (
                            <Button size="small" color="primary" variant="contained"
                              startIcon={<PaymentIcon />}
                              disabled={paying === a.id}
                              onClick={() => handlePayNow(a)}>
                              {paying === a.id ? 'Processing…' : `Pay ₹${a.fee}`}
                            </Button>
                          )}
                          {canCancel && (
                            <Button size="small" color="error" variant="outlined"
                              startIcon={<CancelIcon />}
                              disabled={cancelling === a.id}
                              onClick={() => setConfirmId(a.id)}>
                              {cancelling === a.id ? 'Cancelling…' : 'Cancel'}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep It"
        confirmColor="error"
      />
    </Container>
  );
}
