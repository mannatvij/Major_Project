import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Chip, Button, Box, Divider,
  Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import EventIcon from '@mui/icons-material/Event';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PaymentIcon from '@mui/icons-material/Payment';
import ConfirmDialog from './ConfirmDialog';
import { calendarAPI, paymentAPI } from '../services/api';

const STATUS_CHIP = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'warning' },
  PENDING:   { label: 'Pending',   color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'primary' },
  COMPLETED: { label: 'Completed', color: 'default' },
  CANCELLED: { label: 'Cancelled', color: 'error'   },
};

const PAYMENT_CHIP = {
  PAID:     { label: 'Paid',     color: 'success' },
  REFUNDED: { label: 'Refunded', color: 'info'    },
  FAILED:   { label: 'Failed',   color: 'error'   },
};

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AppointmentCard({ appointment: a, userRole, onStatusChange, acting }) {
  const chip        = STATUS_CHIP[a.status] ?? { label: a.status, color: 'default' };
  const paymentChip = PAYMENT_CHIP[a.paymentStatus];
  const isActive    = a.status === 'PENDING' || a.status === 'CONFIRMED';
  const isAwaitingPayment = a.status === 'PENDING_PAYMENT';
  const isPast      = a.dateTime && new Date(a.dateTime) < new Date();
  const [paying, setPaying] = useState(false);

  // Confirm dialog state for destructive actions
  const [confirmAction, setConfirmAction] = useState(null); // { statusKey, title, message, label }

  // Calendar menu state
  const [calAnchor, setCalAnchor]   = useState(null);
  const [calLoading, setCalLoading] = useState(false);

  const requestConfirm = (statusKey, title, message, label) => {
    setConfirmAction({ statusKey, title, message, label });
  };

  const handleConfirmed = () => {
    if (confirmAction) onStatusChange(a.id, confirmAction.statusKey);
    setConfirmAction(null);
  };

  const handleDownloadIcs = async () => {
    setCalAnchor(null);
    setCalLoading(true);
    try {
      const blob = await calendarAPI.downloadIcs(a.id);
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `appointment-${a.id?.slice(-6) ?? 'cal'}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Calendar] ICS download failed', err);
    } finally {
      setCalLoading(false);
    }
  };

  const handleResumePayment = async () => {
    setPaying(true);
    try {
      const { data: order } = await paymentAPI.createOrder(a.id);

      const verify = (paymentId, signature) => paymentAPI.verify({
        razorpayOrderId:   order.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      if (!order.liveMode) {
        await verify('pay_demo_' + Math.random().toString(36).slice(2, 14), 'demo');
        if (onStatusChange) onStatusChange(a.id, '__refresh__');
        return;
      }

      // Live mode — load Razorpay script and open checkout
      await new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = resolve; s.onerror = reject;
        document.body.appendChild(s);
      });

      const rzp = new window.Razorpay({
        key: order.keyId, amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR', order_id: order.orderId,
        name: 'Smart Healthcare',
        handler: async (resp) => {
          await verify(resp.razorpay_payment_id, resp.razorpay_signature);
          if (onStatusChange) onStatusChange(a.id, '__refresh__');
        },
      });
      rzp.open();
    } catch (err) {
      console.error('[Payment] Resume failed', err);
    } finally {
      setPaying(false);
    }
  };

  const handleOpenCalendarLink = async (type) => {
    setCalAnchor(null);
    setCalLoading(true);
    try {
      const res = await calendarAPI.getLinks(a.id);
      const url = res.data[type];
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[Calendar] Link open failed', err);
    } finally {
      setCalLoading(false);
    }
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
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Chip label={chip.label} color={chip.color} size="small" />
              {paymentChip && (
                <Chip label={paymentChip.label} color={paymentChip.color} size="small" variant="outlined" />
              )}
            </Box>
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

          {/* Add to Calendar */}
          {a.status === 'CONFIRMED' && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={calLoading ? <CircularProgress size={14} /> : <EventIcon />}
                onClick={(e) => setCalAnchor(e.currentTarget)}
                disabled={calLoading}
                sx={{ textTransform: 'none' }}
              >
                Add to Calendar
              </Button>
              <Menu
                anchorEl={calAnchor}
                open={Boolean(calAnchor)}
                onClose={() => setCalAnchor(null)}
              >
                <MenuItem onClick={handleDownloadIcs}>
                  <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Download .ics (Apple / Outlook)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleOpenCalendarLink('google')}>
                  <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Google Calendar</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleOpenCalendarLink('outlook')}>
                  <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Outlook Calendar</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}

          {/* Resume payment CTA */}
          {userRole === 'PATIENT' && isAwaitingPayment && a.fee > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<PaymentIcon />}
                onClick={handleResumePayment}
                disabled={paying}
              >
                {paying ? 'Opening checkout…' : `Pay ₹${a.fee} now`}
              </Button>
            </Box>
          )}

          {/* Action buttons */}
          {(isActive || isAwaitingPayment) && onStatusChange && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {/* Patient: cancel PENDING only */}
              {userRole === 'PATIENT' && (a.status === 'PENDING' || a.status === 'PENDING_PAYMENT') && (
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
                  {a.status === 'PENDING' && !isPast && (
                    <Button size="small" variant="outlined" color="primary"
                      startIcon={<CheckCircleIcon />} disabled={acting}
                      onClick={() => onStatusChange(a.id, 'CONFIRMED')}>
                      Accept
                    </Button>
                  )}
                  {a.status === 'PENDING' && !isPast && (
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
                  {a.status === 'PENDING' && isPast && (
                    <Chip label="Slot expired — cannot accept" size="small" color="default"
                      sx={{ fontSize: 11, color: 'text.secondary' }} />
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
