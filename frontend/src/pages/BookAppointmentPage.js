import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Card, CardContent, TextField, Button,
  Typography, Alert, Grid, Box, Chip, Divider, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { doctorAPI, appointmentAPI } from '../services/api';

export default function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor]               = useState(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError]     = useState('');

  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [symptoms, setSymptoms]               = useState('');
  const [formError, setFormError]             = useState('');
  const [booked, setBooked]                   = useState(null); // holds AppointmentResponse
  const [submitting, setSubmitting]           = useState(false);

  // Today's date string for min= attribute on date picker
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const { data } = await doctorAPI.getById(doctorId);
        setDoctor(data);
      } catch (err) {
        setDoctorError('Could not load doctor details. Please go back and try again.');
      } finally {
        setDoctorLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

  const validate = () => {
    if (!appointmentDate) return 'Please select a date.';
    if (appointmentDate < today) return 'Appointment date must be today or in the future.';
    if (!appointmentTime) return 'Please select a time.';
    if (!symptoms.trim()) return 'Please describe your symptoms.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const dateTime = `${appointmentDate}T${appointmentTime}:00`;
      const { data } = await appointmentAPI.create({
        doctorId,
        dateTime,
        symptoms: symptoms.trim(),
      });
      setBooked(data);
      setTimeout(() => navigate('/dashboard/appointments'), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (doctorLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (doctorError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{doctorError}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/doctors')}>
          Back to Doctors
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard/doctors')}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        Back to Doctors
      </Button>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Book Appointment
      </Typography>

      <Grid container spacing={3}>
        {/* Doctor info card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Dr. {doctor?.name}
              </Typography>
              {doctor?.specialization && (
                <Chip
                  label={doctor.specialization}
                  icon={<LocalHospitalIcon />}
                  color="primary"
                  size="small"
                  sx={{ mb: 2 }}
                />
              )}
              {doctor?.experience != null && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Experience: {doctor.experience} years
                </Typography>
              )}
              {doctor?.fees != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <CurrencyRupeeIcon fontSize="small" sx={{ color: '#2e7d32' }} />
                  <Typography variant="body1" fontWeight="bold" color="#2e7d32">
                    ₹{doctor.fees} per consultation
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Booking form */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Appointment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Available slots hint */}
              {doctor?.availableSlots?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Available slots — click to prefill:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {doctor.availableSlots.slice(0, 8).map((iso) => {
                      const d   = new Date(iso);
                      const dateStr = d.toISOString().split('T')[0];
                      const timeStr = d.toTimeString().slice(0, 5);
                      const label   = d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
                      return (
                        <Chip key={iso} label={label} size="small" variant="outlined"
                          color="primary" clickable disabled={!!booked}
                          onClick={() => { setAppointmentDate(dateStr); setAppointmentTime(timeStr); }} />
                      );
                    })}
                  </Box>
                </Box>
              )}
              <Divider sx={{ mb: 3 }} />

              {booked && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #a5d6a7' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#2e7d32" gutterBottom>
                    Appointment Booked!
                  </Typography>
                  <Typography variant="body2">Doctor: Dr. {booked.doctorName}</Typography>
                  <Typography variant="body2">
                    Date &amp; Time: {new Date(booked.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography variant="body2">Status:</Typography>
                    <Chip label="PENDING" color="warning" size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Awaiting confirmation from Dr. {booked.doctorName}. Redirecting to your appointments…
                  </Typography>
                </Box>
              )}

              {formError && (
                <Alert severity="error" sx={{ mb: 3 }}>
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
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      disabled={!!booked}
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
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      disabled={!!booked}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Symptoms / Reason for visit"
                      multiline
                      rows={4}
                      fullWidth
                      required
                      placeholder="Describe your symptoms or reason for the appointment..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      disabled={!!booked}
                    />
                  </Grid>

                  {/* Total fees (read-only) */}
                  {doctor?.fees != null && (
                    <Grid item xs={12}>
                      <TextField
                        label="Consultation Fee"
                        value={`₹${doctor.fees}`}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        InputLabelProps={{ shrink: true }}
                        sx={{ bgcolor: '#f9f9f9' }}
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
                      sx={{ textTransform: 'none', bgcolor: '#1976d2', py: 1.5 }}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'Book Appointment'}
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
