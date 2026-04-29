import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Typography, Box, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { adminAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

function fmtDateTime(dt) {
  return dt ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export default function DoctorApprovalsPage() {
  const { success, error: showError } = useSnackbar();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getPendingDoctors();
      setPending(data);
    } catch (e) {
      showError(e.response?.data?.message ?? 'Failed to load pending doctors.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, kind) => {
    setActing(id);
    try {
      if (kind === 'APPROVE') {
        await adminAPI.approveDoctor(id);
        success('Doctor approved — now visible to patients.');
      } else {
        await adminAPI.rejectDoctor(id);
        success('Doctor rejected and deactivated.');
      }
      setPending((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      showError(e.response?.data?.message ?? 'Action failed.');
    } finally {
      setActing(null);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Doctor Approvals</Typography>
          <Typography variant="body2" color="text.secondary">
            New doctor signups stay hidden from patients until you approve them.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={load}>
          Refresh
        </Button>
      </Box>

      {loading ? (
        <LoadingSpinner message="Loading pending doctors…" />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={HourglassBottomIcon}
          title="Nothing pending"
          subtitle="All doctor signups have been reviewed."
        />
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.100' }}>
              <TableRow>
                <TableCell><strong>Doctor</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Specialization</strong></TableCell>
                <TableCell><strong>Qualification</strong></TableCell>
                <TableCell><strong>Registered</strong></TableCell>
                <TableCell align="center"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>
                    Dr. {d.username}
                    <Chip label="Pending" color="warning" size="small" sx={{ ml: 1 }} />
                  </TableCell>
                  <TableCell>{d.email}</TableCell>
                  <TableCell>{d.specialization ?? '—'}</TableCell>
                  <TableCell>{d.qualification ?? '—'}</TableCell>
                  <TableCell>{fmtDateTime(d.createdAt)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button
                        size="small" variant="contained" color="success"
                        startIcon={<VerifiedIcon />}
                        disabled={acting === d.id}
                        onClick={() => act(d.id, 'APPROVE')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small" variant="outlined" color="error"
                        startIcon={<BlockIcon />}
                        disabled={acting === d.id}
                        onClick={() => act(d.id, 'REJECT')}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
