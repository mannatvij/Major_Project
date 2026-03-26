import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Link as MuiLink, CircularProgress, InputAdornment, IconButton,
  MenuItem, FormControl, InputLabel, Select,
} from '@mui/material';
import {
  LocalHospital, Visibility, VisibilityOff, Person, Lock, Email, Badge,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    if (!form.username.trim())         return 'Username is required.';
    if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!EMAIL_RE.test(form.email))    return 'Please enter a valid email address.';
    if (form.password.length < 6)      return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password, form.role);
      setSuccess(`Account created! Welcome, ${form.username}. Redirecting to dashboard…`);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)',
        p: 2,
      }}
    >
      <Card
        elevation={16}
        sx={{ width: '100%', maxWidth: 460, borderRadius: 3, overflow: 'visible' }}
      >
        {/* Floating icon */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mt: -4.5,
            mb: 1,
            boxShadow: '0 4px 20px rgba(21,101,192,0.4)',
          }}
        >
          <LocalHospital sx={{ fontSize: 38, color: '#fff' }} />
        </Box>

        <CardContent sx={{ px: 4, pb: 4 }}>
          <Typography variant="h5" fontWeight={700} textAlign="center" color="primary.main" mb={0.5}>
            Create Account
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
            Join the Healthcare Portal
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <TextField
              fullWidth
              label="Username"
              value={form.username}
              onChange={set('username')}
              margin="normal"
              autoFocus
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Person color="action" /></InputAdornment>
                ),
              }}
            />

            {/* Email */}
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={form.email}
              onChange={set('email')}
              margin="normal"
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Email color="action" /></InputAdornment>
                ),
              }}
            />

            {/* Password */}
            <TextField
              fullWidth
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Lock color="action" /></InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass((p) => !p)} edge="end">
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password */}
            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              margin="normal"
              autoComplete="new-password"
              error={form.confirmPassword !== '' && form.password !== form.confirmPassword}
              helperText={
                form.confirmPassword !== '' && form.password !== form.confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Lock color="action" /></InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirm((p) => !p)} edge="end">
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Role */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">I am a…</InputLabel>
              <Select
                labelId="role-label"
                value={form.role}
                label="I am a…"
                onChange={set('role')}
                startAdornment={
                  <InputAdornment position="start"><Badge color="action" /></InputAdornment>
                }
              >
                <MenuItem value="PATIENT">Patient</MenuItem>
                <MenuItem value="DOCTOR">Doctor</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || Boolean(success)}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.4,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '1rem',
                background: 'linear-gradient(90deg, #1565c0, #1976d2)',
                '&:hover': { background: 'linear-gradient(90deg, #0d47a1, #1565c0)' },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>

            <Typography variant="body2" textAlign="center" color="text.secondary">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login" fontWeight={600} underline="hover">
                Sign in here
              </MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
