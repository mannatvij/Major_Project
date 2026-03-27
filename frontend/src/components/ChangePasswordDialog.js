import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, CircularProgress, Box, IconButton,
  InputAdornment,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { userAPI } from '../services/api';

export default function ChangePasswordDialog({ open, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const toggleShow = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const validate = () => {
    if (!form.currentPassword) return 'Current password is required.';
    if (!form.newPassword || form.newPassword.length < 6) return 'New password must be at least 6 characters.';
    if (form.newPassword !== form.confirmPassword) return 'Passwords do not match.';
    if (form.newPassword === form.currentPassword) return 'New password must differ from the current password.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      await userAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        onClose();
      }, 1500);
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data || 'Failed to change password.';
      setError(typeof msg === 'string' ? msg : 'Current password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess(false);
    onClose();
  };

  const passwordField = (label, name, showKey) => (
    <TextField
      label={label}
      name={name}
      type={show[showKey] ? 'text' : 'password'}
      value={form[name]}
      onChange={handleChange}
      fullWidth
      margin="normal"
      disabled={loading || success}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => toggleShow(showKey)} edge="end">
              {show[showKey] ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight="bold">Change Password</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }}>Password changed successfully!</Alert>}
        <Box>
          {passwordField('Current Password', 'currentPassword', 'current')}
          {passwordField('New Password', 'newPassword', 'new')}
          {passwordField('Confirm New Password', 'confirmPassword', 'confirm')}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || success}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Saving…' : 'Change Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
