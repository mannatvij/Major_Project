import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Card, CardContent, TextField, Button,
  Typography, Alert, Grid, Box, Chip, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { doctorAPI, appointmentAPI, paymentAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

// Group ISO slot strings by calendar date (YYYY-MM-DD)
function groupSlotsByDay(slots) {
  const groups = {};
  (slots ?? []).forEach((iso) => {
    const d = new Date(iso);
    if (d < new Date()) return; // skip past slots
    const key = d.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(iso);
  });
  return groups;
}

function fmtDay(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeStyle: 'short' });
}

// Lazy-loads the Razorpay checkout.js script. Resolves true when window.Razorpay is ready.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[data-razorpay="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Razorpay));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpay = '1';
    script.onload  = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate     = useNavigate();
  const { success }  = useSnackbar();

  const [doctor, setDoctor]               = useState(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError]     = useState('');

  const [selectedSlot, setSelectedSlot]   = useState('');   // ISO string
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [symptoms, setSymptoms]           = useState('');
  const [formError, setFormError]         = useState('');
  const [booked, setBooked]               = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    doctorAPI.getById(doctorId)
      .then(({ data }) => setDoctor(data))
      .catch(() => setDoctorError('Could not load doctor details. Please go back and try again.'))
      .finally(() => setDoctorLoading(false));
  }, [doctorId]);

  const handleSlotClick = (iso) => {
    const d = new Date(iso);
    setSelectedSlot(iso);
    setAppointmentDate(d.toISOString().split('T')[0]);
    setAppointmentTime(d.toTimeString().slice(0, 5));
    setFormError('');
  };

  const validate = () => {
    if (!appointmentDate) return 'Please select a date.';
    if (appointmentDate < today) return 'Appointment must be in the future.';
    if (!appointmentTime) return 'Please select a time.';
    if (!symptoms.trim()) return 'Please describe your symptoms.';
    if (symptoms.trim().length < 5) return 'Symptoms must be at least 5 characters.';
    return '';
  };

  // Opens the Razorpay checkout modal for an appointment that came back PENDING_PAYMENT.
  // On success, calls /payments/verify and resolves with the verification response.
  const startRazorpayCheckout = (appointment, order) => new Promise((resolve, reject) => {
    if (!order.liveMode) {
      // Demo mode — backend will accept any (orderId, paymentId, signature).
      // We fake a payment id and verify directly so the UX still feels real.
      paymentAPI.verify({
        razorpayOrderId:   order.orderId,
        razorpayPaymentId: 'pay_demo_' + Math.random().toString(36).slice(2, 14),
        razorpaySignature: 'demo',
      }).then((r) => resolve(r.data)).catch(reject);
      return;
    }

    const options = {
      key:      order.keyId,
      amount:   Math.round(order.amount * 100),
      currency: order.currency || 'INR',
      name:     'Smart Healthcare',
      description: `Consultation with Dr. ${doctor?.name ?? ''}`,
      order_id: order.orderId,
      handler: async (resp) => {
        try {
          const { data } = await paymentAPI.verify({
            razorpayOrderId:   resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
          resolve(data);
        } catch (err) {
          reject(err);
        }
      },
      prefill: { name: '', email: '' },
      theme: { color: '#1976d2' },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp.error?.description ?? 'Payment failed'));
    });
    rzp.open();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const { data: appointment } = await appointmentAPI.create({
        doctorId,
        dateTime: `${appointmentDate}T${appointmentTime}:00`,
        symptoms: symptoms.trim(),
      });

      // Free consultation — backend already returned PENDING; nothing more to do.
      if (appointment.status !== 'PENDING_PAYMENT') {
        setBooked(appointment);
        success('Appointment booked successfully!');
        setTimeout(() => navigate('/dashboard/appointments'), 3000);
        return;
      }

      // Paid consultation — create Razorpay order and open the checkout modal.
      const { data: order } = await paymentAPI.createOrder(appointment.id);

      if (order.liveMode) {
        const ok = await loadRazorpayScript();
        if (!ok) {
          setFormError('Could not load the Razorpay checkout. Please try again.');
          return;
        }
      }

      try {
        await startRazorpayCheckout(appointment, order);
        setBooked({ ...appointment, status: 'PENDING' });
        success('Payment received — appointment booked!');
        setTimeout(() => navigate('/dashboard/appointments'), 3000);
      } catch (payErr) {
        setFormError(
          payErr.message === 'Payment cancelled'
            ? 'Payment was cancelled. You can retry from your appointments page.'
            : (payErr.response?.data?.message ?? payErr.message ?? 'Payment failed.')
        );
      }
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (doctorLoading) return <LoadingSpinner message="Loading doctor details…" />;

  if (doctorError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <ErrorMessage message={doctorError} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/doctors')}>
          Back to Doctors
        </Button>
      </Container>
    );
  }

  const slotGroups = groupSlotsByDay(doctor?.availableSlots);
  const hasDays    = Object.keys(slotGroups).length > 0;

  return (
    <Container maxWidth="md">
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/doctors')} sx={{ mb: 2 }}>
        Back to Doctors
      </Button>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Book Appointment
      </Typography>

      <Grid container spacing={3}>
        {/* ── Doctor info ──────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Dr. {doctor?.name}
              </Typography>
              {doctor?.specialization && (
                <Chip label={doctor.specialization} icon={<LocalHospitalIcon />}
                  color="primary" size="small" sx={{ mb: 2 }} />
              )}
              {doctor?.experience != null && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Experience: {doctor.experience} years
                </Typography>
              )}
              {doctor?.qualification && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {doctor.qualification}
                </Typography>
              )}
              {doctor?.fees != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <CurrencyRupeeIcon fontSize="small" color="success" />
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    ₹{doctor.fees} per consultation
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Booking form ─────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Appointment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Booked confirmation */}
              {booked && (
                <Box sx={{ mb: 3, p: 2.5, bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #a5d6a7' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                      Appointment Request Submitted!
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Doctor:</strong> Dr. {booked.doctorName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1.5 }}>
                    <strong>Date &amp; Time:</strong> {new Date(booked.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                  <Alert severity="info" sx={{ py: 0.5, mb: 1 }}>
                    Your appointment has been booked. You will receive a confirmation email once the doctor confirms.
                  </Alert>
                  <Typography variant="caption" color="text.secondary">
                    Redirecting to your appointments…
                  </Typography>
                </Box>
              )}

              {/* Slot picker */}
              {hasDays && !booked && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <AccessTimeIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Available Time Slots
                    </Typography>
                  </Box>
                  {Object.entries(slotGroups).map(([day, daySlots]) => (
                    <Box key={day} sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        {fmtDay(day)}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {daySlots.map((iso) => {
                          const isSelected = selectedSlot === iso;
                          return (
                            <Chip
                              key={iso}
                              label={fmtTime(iso)}
                              size="small"
                              variant={isSelected ? 'filled' : 'outlined'}
                              color="primary"
                              clickable
                              onClick={() => handleSlotClick(iso)}
                              sx={{ fontWeight: isSelected ? 700 : 400 }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
                  <Divider sx={{ mt: 2, mb: 2 }} />
                </Box>
              )}

              {formError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>
                  {formError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Appointment Date"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: today }}
                      value={appointmentDate}
                      onChange={(e) => { setAppointmentDate(e.target.value); setSelectedSlot(''); }}
                      disabled={!!booked}
                      size="medium"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Appointment Time"
                      type="time"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      value={appointmentTime}
                      onChange={(e) => { setAppointmentTime(e.target.value); setSelectedSlot(''); }}
                      disabled={!!booked}
                      size="medium"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Symptoms / Reason for visit"
                      multiline
                      rows={4}
                      fullWidth
                      required
                      placeholder="Describe your symptoms or reason for the appointment…"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      disabled={!!booked}
                      size="medium"
                    />
                  </Grid>
                  {doctor?.fees != null && (
                    <Grid item xs={12}>
                      <TextField
                        label="Consultation Fee"
                        value={`₹${doctor.fees}`}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        InputLabelProps={{ shrink: true }}
                        size="medium"
                        sx={{ bgcolor: 'grey.50' }}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={submitting || !!booked}
                      sx={{ py: 1.5 }}
                    >
                      {submitting
                        ? 'Processing…'
                        : (doctor?.fees > 0 ? `Pay ₹${doctor.fees} & Book` : 'Book Appointment')}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
