import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Chip, Button, Box, Divider,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import ConfirmDialog from './ConfirmDialog';

const STATUS_CHIP = {
  PENDING:   { label: 'Pending',   color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'primary' },
  COMPLETED: { label: 'Completed', color: 'default' },
  CANCELLED: { label: 'Cancelled', color: 'error'   },
};

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AppointmentCard({ appointment: a, userRole, onStatusChange, acting }) {
  const chip     = STATUS_CHIP[a.status] ?? { label: a.status, color: 'default' };
  const isActive = a.status === 'PENDING' || a.status === 'CONFIRMED';

  // Confirm dialog state for destructive actions
  const [confirmAction, setConfirmAction] = useState(null); // { statusKey, title, message, label }

  const requestConfirm = (statusKey, title, message, label) => {
    setConfirmAction({ statusKey, title, message, label });
  };

  const handleConfirmed = () => {
    if (confirmAction) onStatusChange(a.id, confirmAction.statusKey);
    setConfirmAction(null);
  };

  return (
    <>
      <Card elevation={2} sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 5 },
      }}>
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Date/time + status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight="bold">
                {formatDT(a.dateTime)}
              </Typography>
            </Box>
            <Chip label={chip.label} color={chip.color} size="small" />
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* Role-specific details */}
          {userRole === 'PATIENT' ? (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Doctor:</strong> Dr. {a.doctorName}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Patient:</strong> {a.patientName}
              </Typography>
              {a.symptoms && (
                <Typography variant="body2" color="text.secondary"
                  sx={{ mb: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <strong>Symptoms:</strong> {a.symptoms}
                </Typography>
              )}
            </>
          )}

          <Typography variant="caption" color="text.disabled">
            Booked {formatDT(a.createdAt)} · #{a.id?.slice(-6)}
          </Typography>

          {/* Action buttons */}
          {isActive && onStatusChange && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {/* Patient: cancel PENDING only */}
              {userRole === 'PATIENT' && a.status === 'PENDING' && (
                <Button size="small" variant="outlined" color="error"
                  startIcon={<CancelIcon />} disabled={acting}
                  onClick={() => requestConfirm(
                    'CANCEL',
                    'Cancel Appointment?',
                    'Are you sure you want to cancel this appointment? This cannot be undone.',
                    'Yes, Cancel'
                  )}>
                  Cancel
                </Button>
              )}

              {/* Doctor actions */}
              {userRole === 'DOCTOR' && (
                <>
                  {a.status === 'PENDING' && (
                    <Button size="small" variant="outlined" color="primary"
                      startIcon={<CheckCircleIcon />} disabled={acting}
                      onClick={() => onStatusChange(a.id, 'CONFIRMED')}>
                      Accept
                    </Button>
                  )}
                  {a.status === 'PENDING' && (
                    <Button size="small" variant="outlined" color="error"
                      startIcon={<CancelIcon />} disabled={acting}
                      onClick={() => requestConfirm(
                        'CANCELLED',
                        'Reject Appointment?',
                        'Are you sure you want to reject this appointment request?',
                        'Yes, Reject'
                      )}>
                      Reject
                    </Button>
                  )}
                  {a.status === 'CONFIRMED' && (
                    <Button size="small" variant="outlined" color="success"
                      startIcon={<DoneAllIcon />} disabled={acting}
                      onClick={() => onStatusChange(a.id, 'COMPLETED')}>
                      Mark Complete
                    </Button>
                  )}
                  {a.status === 'CONFIRMED' && (
                    <Button size="small" variant="outlined" color="error"
                      startIcon={<CancelIcon />} disabled={acting}
                      onClick={() => requestConfirm(
                        'CANCEL',
                        'Cancel Appointment?',
                        'Are you sure you want to cancel this confirmed appointment?',
                        'Yes, Cancel'
                      )}>
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmed}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.label}
        cancelLabel="Go Back"
        confirmColor="error"
      />
    </>
  );
}
