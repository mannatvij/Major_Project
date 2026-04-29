import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, IconButton, Box, Typography, Grid, Divider, Alert, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import { prescriptionAPI } from '../services/api';

const EMPTY_MED = { name: '', dosage: '', frequency: '', duration: '', notes: '' };

/**
 * Doctor-facing dialog used to create a prescription right after marking
 * an appointment COMPLETED. Submits to /api/prescriptions.
 */
export default function PrescriptionDialog({ open, onClose, appointment, onSaved }) {
  const [diagnosis,    setDiagnosis]    = useState('');
  const [advice,       setAdvice]       = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [meds,         setMeds]         = useState([{ ...EMPTY_MED }]);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [existing,     setExisting]     = useState(null);   // existing prescription, if any

  const reset = () => {
    setDiagnosis(''); setAdvice(''); setFollowUpDate('');
    setMeds([{ ...EMPTY_MED }]); setError(''); setSaving(false);
    setExisting(null); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // When the dialog opens, try to load an existing prescription for this appointment.
  // 404 means none yet (a new one will be created). Anything else gets pre-filled.
  useEffect(() => {
    if (!open || !appointment?.id) return;
    setLoading(true); setError('');
    prescriptionAPI.getByAppointment(appointment.id)
      .then(({ data }) => {
        setExisting(data);
        setDiagnosis(data.diagnosis ?? '');
        setAdvice(data.advice ?? '');
        setFollowUpDate(data.followUpDate ?? '');
        setMeds(
          data.medications?.length
            ? data.medications.map((m) => ({
                name: m.name ?? '', dosage: m.dosage ?? '', frequency: m.frequency ?? '',
                duration: m.duration ?? '', notes: m.notes ?? '',
              }))
            : [{ ...EMPTY_MED }]
        );
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          // First prescription for this appointment — start with a blank form.
          setExisting(null);
        } else {
          setError(e.response?.data?.message ?? 'Could not load existing prescription.');
        }
      })
      .finally(() => setLoading(false));
  }, [open, appointment?.id]);

  const updateMed = (idx, key, value) => {
    setMeds((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
  };
  const addMed    = () => setMeds((prev) => [...prev, { ...EMPTY_MED }]);
  const removeMed = (idx) => setMeds((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    if (!diagnosis.trim()) return 'Diagnosis is required.';
    if (!meds.length) return 'Add at least one medication.';
    for (let i = 0; i < meds.length; i++) {
      const m = meds[i];
      if (!m.name.trim() || !m.dosage.trim() || !m.frequency.trim()) {
        return `Medication #${i + 1}: name, dosage, and frequency are required.`;
      }
    }
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const { data } = await prescriptionAPI.create({
        appointmentId: appointment.id,
        diagnosis:     diagnosis.trim(),
        advice:        advice.trim() || null,
        followUpDate:  followUpDate || null,
        medications:   meds.map((m) => ({
          name:      m.name.trim(),
          dosage:    m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration:  m.duration.trim()  || null,
          notes:     m.notes.trim()     || null,
        })),
      });
      onSaved?.(data);
      handleClose();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {existing ? 'Edit Prescription' : 'New Prescription'} for {appointment.patientName}
          {existing && (
            <Chip size="small" color="info" variant="outlined"
              icon={<HistoryIcon fontSize="small" />}
              label={'Last updated ' + new Date(existing.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium', timeStyle: 'short',
              })}
            />
          )}
        </Box>
        <Typography variant="caption" display="block" color="text.secondary">
          Appointment #{appointment.id?.slice(-6)} ·{' '}
          {appointment.dateTime
            ? new Date(appointment.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : ''}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {loading && (
          <Alert severity="info" sx={{ mb: 2 }}>Loading existing prescription…</Alert>
        )}
        {existing && !loading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Editing an existing prescription. Saving will update it and re-email the patient with the latest PDF.
          </Alert>
        )}

        <TextField
          label="Diagnosis"
          fullWidth multiline rows={3} required
          value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>Medications</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addMed}>Add medication</Button>
        </Box>

        {meds.map((m, idx) => (
          <Box key={idx} sx={{ p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Medication #{idx + 1}</Typography>
              {meds.length > 1 && (
                <IconButton size="small" color="error" onClick={() => removeMed(idx)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Name (e.g. Paracetamol 500mg)" fullWidth required
                  value={m.name} onChange={(e) => updateMed(idx, 'name', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Dosage (e.g. 1 tablet)" fullWidth required
                  value={m.dosage} onChange={(e) => updateMed(idx, 'dosage', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Frequency (e.g. Twice a day after meals)" fullWidth required
                  value={m.frequency} onChange={(e) => updateMed(idx, 'frequency', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Duration (e.g. 5 days)" fullWidth
                  value={m.duration} onChange={(e) => updateMed(idx, 'duration', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Notes (optional)" fullWidth
                  value={m.notes} onChange={(e) => updateMed(idx, 'notes', e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <TextField
          label="Advice (optional)"
          fullWidth multiline rows={2}
          value={advice} onChange={(e) => setAdvice(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Follow-up date (optional)"
          type="date" fullWidth
          InputLabelProps={{ shrink: true }}
          value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || loading}>
          {saving
            ? 'Saving…'
            : existing
              ? 'Update & Re-email Patient'
              : 'Save & Email Patient'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
