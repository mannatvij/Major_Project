import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, Rating, Alert,
} from '@mui/material';
import { reviewAPI } from '../services/api';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Below average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

/**
 * Patient-facing dialog for rating a doctor after a completed appointment.
 * Submits POST /api/reviews and emits the saved review via onSaved.
 */
export default function RatingDialog({ open, onClose, appointment, onSaved }) {
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(-1);
  const [comment, setComment] = useState('');
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const reset = () => { setRating(0); setHover(-1); setComment(''); setError(''); setSaving(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (rating < 1) { setError('Please pick a rating from 1 to 5.'); return; }
    setError(''); setSaving(true);
    try {
      const { data } = await reviewAPI.create({
        appointmentId: appointment.id,
        rating,
        comment: comment.trim() || null,
      });
      onSaved?.(data);
      handleClose();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Could not submit review.');
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  const labelKey = hover !== -1 ? hover : rating;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Rate Dr. {appointment.doctorName}
        <Typography variant="caption" display="block" color="text.secondary">
          {appointment.dateTime
            ? new Date(appointment.dateTime).toLocaleString('en-IN', {
                dateStyle: 'medium', timeStyle: 'short',
              })
            : ''}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Rating
            name="doctor-rating"
            size="large"
            value={rating}
            onChange={(_, v) => setRating(v ?? 0)}
            onChangeActive={(_, v) => setHover(v)}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 20 }}>
            {labelKey > 0 ? RATING_LABELS[labelKey] : 'Tap a star to rate'}
          </Typography>
        </Box>

        <TextField
          label="Share your experience (optional)"
          fullWidth multiline rows={4}
          placeholder="What did you like? Anything you'd improve?"
          value={comment} onChange={(e) => setComment(e.target.value)}
          inputProps={{ maxLength: 1000 }}
          helperText={`${comment.length}/1000`}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || rating < 1}>
          {saving ? 'Submitting…' : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
