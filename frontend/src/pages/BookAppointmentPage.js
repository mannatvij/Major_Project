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
import { doctorAPI, appointmentAPI } from '../services/api';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const { data } = await appointmentAPI.create({
        doctorId,
        dateTime: `${appointmentDate}T${appointmentTime}:00`,
        symptoms: symptoms.trim(),
      });
      setBooked(data);
      success('Appointment booked successfully!');
      setTimeout(() => navigate('/dashboard/appointments'), 3000);
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
                      {submitting ? 'Booking…' : 'Book Appointment'}
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
