import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Box, Button,
  Chip, Alert, CircularProgress, Grid, TextField, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { userAPI, doctorAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';
import LoadingSpinner from '../components/LoadingSpinner';

function toISO(date, time) {
  return `${date}T${time}:00`;
}

function formatSlot(isoStr) {
  return new Date(isoStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DoctorAvailabilityPage() {
  const { success: showSuccess, error: showError } = useSnackbar();
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const [newDate, setNewDate]   = useState('');
  const [newTime, setNewTime]   = useState('');

  const today = new Date().toISOString().split('T')[0];

  // ── Load current slots ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data: profile } = await userAPI.getProfile();       // { id, username, … }
        const { data: doctor  } = await doctorAPI.getById(profile.id);
        setSlots(doctor.availableSlots ?? []);
      } catch {
        setError('Failed to load your availability slots.');
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  // ── Add a new slot ──────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!newDate || !newTime) { setError('Please select both date and time.'); return; }
    const iso = toISO(newDate, newTime);
    if (slots.includes(iso)) { setError('That slot already exists.'); return; }
    setError('');
    setSlots((prev) => [...prev, iso].sort());
    setNewDate(''); setNewTime('');
  };

  // ── Remove a slot ───────────────────────────────────────────────────────────
  const handleRemove = (iso) => {
    setSlots((prev) => prev.filter((s) => s !== iso));
  };

  // ── Save to backend ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await doctorAPI.updateAvailability({ availableSlots: slots });
      showSuccess('Availability updated successfully!');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to save availability.';
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading availability…" />;

  return (
    <Container maxWidth="md">
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Manage Availability
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add or remove your available appointment slots. Changes are saved when you click Save.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Add new slot */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Add a Slot</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField label="Date" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }} inputProps={{ min: today }}
                value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Time" type="time" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button variant="contained" fullWidth startIcon={<AddIcon />}
                onClick={handleAdd} sx={{ textTransform: 'none', bgcolor: '#1976d2' }}>
                Add
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Current slots list */}
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Current Slots ({slots.length})
            </Typography>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave} disabled={saving}
              sx={{ textTransform: 'none', bgcolor: '#2e7d32' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {slots.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No slots added yet. Add some above.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {slots.map((iso) => (
                <Chip
                  key={iso}
                  label={formatSlot(iso)}
                  onDelete={() => handleRemove(iso)}
                  deleteIcon={<DeleteIcon />}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
