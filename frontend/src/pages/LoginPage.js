import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Link as MuiLink, InputAdornment, IconButton,
} from '@mui/material';
import {
  LocalHospital, Visibility, VisibilityOff, Person, Lock,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed. Please check your credentials.'
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
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          overflow: 'visible',
        }}
      >
        {/* Blue icon header that pops above the card */}
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
            Healthcare Portal
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
            Sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              autoFocus
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
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
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>

            <Typography variant="body2" textAlign="center" color="text.secondary">
              Don't have an account?{' '}
              <MuiLink component={Link} to="/register" fontWeight={600} underline="hover">
                Register here
              </MuiLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
