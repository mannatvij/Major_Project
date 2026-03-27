import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Card, CardContent, Typography, TextField, Button, Box,
  Chip, Grid, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Alert, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import { userAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';
import ChangePasswordDialog from '../components/ChangePasswordDialog';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Constants ────────────────────────────────────────────────────────────────
const BLOOD_GROUPS   = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS        = ['Male', 'Female', 'Other'];
const SPECIALIZATIONS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology',
  'Pediatrics', 'Gynecology', 'Oncology', 'Psychiatry', 'General Medicine',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
};

const roleColor = (role) => {
  if (role === 'PATIENT') return 'primary';
  if (role === 'DOCTOR')  return 'success';
  return 'default';
};

export default function ProfilePage() {
  const { success: showSuccess, error: showError } = useSnackbar();
  const [profile, setProfile]   = useState(null);
  const [form, setForm]         = useState({});
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [alert, setAlert]       = useState(null);   // { type, msg }
  const [pwdOpen, setPwdOpen]   = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.getProfile();
      setProfile(data);
      setForm(buildForm(data));
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load profile.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const buildForm = (p) => ({
    email:          p.email ?? '',
    // patient
    age:            p.age ?? '',
    gender:         p.gender ?? '',
    bloodGroup:     p.bloodGroup ?? '',
    medicalHistory: (p.medicalHistory ?? []).join('\n'),
    // doctor
    specialization: p.specialization ?? '',
    experience:     p.experience ?? '',
    qualification:  p.qualification ?? '',
    fees:           p.fees ?? '',
  });

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setAlert(null);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const payload = { email: form.email };

      if (profile.role === 'PATIENT') {
        if (form.age)            payload.age           = parseInt(form.age, 10);
        if (form.gender)         payload.gender        = form.gender;
        if (form.bloodGroup)     payload.bloodGroup    = form.bloodGroup;
        payload.medicalHistory = form.medicalHistory
          ? form.medicalHistory.split('\n').map((s) => s.trim()).filter(Boolean)
          : [];
      }

      if (profile.role === 'DOCTOR') {
        if (form.specialization) payload.specialization = form.specialization;
        if (form.experience)     payload.experience     = parseInt(form.experience, 10);
        if (form.qualification)  payload.qualification  = form.qualification;
        if (form.fees)           payload.fees           = parseFloat(form.fees);
      }

      const { data } = await userAPI.updateProfile(payload);
      setProfile(data);
      setForm(buildForm(data));
      setEditing(false);
      setAlert({ type: 'success', msg: 'Profile updated successfully!' });
      showSuccess('Profile updated successfully!');
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data || 'Failed to save profile.';
      const display = typeof msg === 'string' ? msg : 'Save failed.';
      setAlert({ type: 'error', msg: display });
      showError(display);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(buildForm(profile));
    setEditing(false);
    setAlert(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner message="Loading profile…" />;

  const isPatient = profile?.role === 'PATIENT';
  const isDoctor  = profile?.role === 'DOCTOR';

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">My Profile</Typography>
        <Button
          variant="outlined"
          startIcon={<LockIcon />}
          onClick={() => setPwdOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Change Password
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.msg}
        </Alert>
      )}

      <Card elevation={2}>
        <CardContent sx={{ p: 4 }}>
          {/* ── Header row ──────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">{profile.username}</Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Chip label={profile.role} color={roleColor(profile.role)} size="small" />
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Member since {fmtDate(profile.createdAt)}
                </Typography>
              </Box>
            </Box>

            {!editing ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                sx={{ textTransform: 'none' }}
              >
                Edit Profile
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={saving}
                  sx={{ textTransform: 'none' }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ textTransform: 'none' }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── Common fields ───────────────────────────────────────────── */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="text.secondary">
            Account Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Username"
                value={profile.username}
                disabled
                fullWidth
                helperText="Username cannot be changed"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={!editing}
                fullWidth
                type="email"
              />
            </Grid>
          </Grid>

          {/* ── Patient-specific fields ─────────────────────────────────── */}
          {isPatient && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="text.secondary">
                Health Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Age"
                    name="age"
                    type="number"
                    value={form.age}
                    onChange={handleChange}
                    disabled={!editing}
                    fullWidth
                    inputProps={{ min: 0, max: 150 }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      name="gender"
                      value={form.gender}
                      label="Gender"
                      onChange={handleChange}
                    >
                      {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Blood Group</InputLabel>
                    <Select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      label="Blood Group"
                      onChange={handleChange}
                    >
                      {BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Medical History"
                    name="medicalHistory"
                    value={form.medicalHistory}
                    onChange={handleChange}
                    disabled={!editing}
                    fullWidth
                    multiline
                    rows={4}
                    helperText="Enter each condition/note on a separate line"
                    placeholder="e.g. Hypertension&#10;Type 2 Diabetes&#10;Allergic to Penicillin"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* ── Doctor-specific fields ──────────────────────────────────── */}
          {isDoctor && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="text.secondary">
                Professional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Specialization</InputLabel>
                    <Select
                      name="specialization"
                      value={form.specialization}
                      label="Specialization"
                      onChange={handleChange}
                    >
                      {SPECIALIZATIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Years of Experience"
                    name="experience"
                    type="number"
                    value={form.experience}
                    onChange={handleChange}
                    disabled={!editing}
                    fullWidth
                    inputProps={{ min: 0, max: 60 }}
                    InputProps={{ endAdornment: <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>yrs</Typography> }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Qualification"
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    disabled={!editing}
                    fullWidth
                    placeholder="e.g. MBBS, MD (Cardiology)"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Consultation Fee"
                    name="fees"
                    type="number"
                    value={form.fees}
                    onChange={handleChange}
                    disabled={!editing}
                    fullWidth
                    inputProps={{ min: 0 }}
                    InputProps={{ startAdornment: <Typography variant="body2" color="text.secondary" sx={{ pr: 0.5 }}>₹</Typography> }}
                  />
                </Grid>

                {/* Rating is read-only */}
                {profile.rating != null && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Rating"
                      value={`${profile.rating} / 5.0`}
                      disabled
                      fullWidth
                      helperText="Set by patient reviews"
                    />
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      <ChangePasswordDialog open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </Container>
  );
}
