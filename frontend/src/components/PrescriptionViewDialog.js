import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Divider, Alert, CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { prescriptionAPI } from '../services/api';

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';
}

/**
 * Read-only prescription viewer. Loads /api/prescriptions/appointment/{id}
 * and offers a "Download PDF" button.
 */
export default function PrescriptionViewDialog({ open, onClose, appointmentId }) {
  const [rx,      setRx]      = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!open || !appointmentId) return;
    setLoading(true); setError(''); setRx(null);
    prescriptionAPI.getByAppointment(appointmentId)
      .then(({ data }) => setRx(data))
      .catch((e) => setError(e.response?.data?.message ?? 'Could not load prescription.'))
      .finally(() => setLoading(false));
  }, [open, appointmentId]);

  const handleDownload = async () => {
    if (!rx) return;
    try {
      const blob = await prescriptionAPI.downloadPdf(rx.id);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `prescription-${rx.id.slice(-8)}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Could not download PDF.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Prescription</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {rx && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Issued by</Typography>
              <Typography variant="h6">Dr. {rx.doctorName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {[rx.doctorQualification, rx.doctorSpecialization].filter(Boolean).join(' · ')}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Issued on {fmtDate(rx.createdAt)} · #{rx.id?.slice(-8)}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">Diagnosis</Typography>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {rx.diagnosis}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Medications</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Medication</TableCell>
                  <TableCell>Dosage</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rx.medications?.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      {m.name}
                      {m.notes && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {m.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{m.dosage}</TableCell>
                    <TableCell>{m.frequency}</TableCell>
                    <TableCell>{m.duration ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {rx.advice && (
              <>
                <Typography variant="subtitle2" color="text.secondary">Advice</Typography>
                <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {rx.advice}
                </Typography>
              </>
            )}

            {rx.followUpDate && (
              <Typography variant="body2" fontWeight={600}>
                Follow-up: {fmtDate(rx.followUpDate)}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={!rx}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
