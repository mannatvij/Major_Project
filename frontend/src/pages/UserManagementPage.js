import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip, IconButton, TextField, InputAdornment,
  Select, MenuItem, FormControl, InputLabel, Toolbar,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import { adminAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';

// ─── Role chip colours ────────────────────────────────────────────────────────
const ROLE_COLOR = {
  PATIENT: 'primary',
  DOCTOR:  'success',
  ADMIN:   'secondary',
};

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, onConfirm, onClose, confirmColor = 'error' }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const { success, error: showError } = useSnackbar();

  const [users,      setUsers]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filters + pagination
  const [page,   setPage]   = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [roleFilter,   setRoleFilter]   = useState('');
  const [searchText,   setSearchText]   = useState('');
  const [searchInput,  setSearchInput]  = useState('');

  // Dialogs
  const [statusDialog, setStatusDialog] = useState({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const { data } = await adminAPI.getUsers(page, rowsPerPage, roleFilter, searchText);
      setUsers(data.content);
      setTotal(data.totalElements);
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, roleFilter, searchText]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setSearchText(searchInput);
  };

  const handleRoleFilter = (e) => {
    setPage(0);
    setRoleFilter(e.target.value);
  };

  const openStatusDialog = (user) => setStatusDialog({ open: true, user });
  const openDeleteDialog = (user) => setDeleteDialog({ open: true, user });

  const handleToggleStatus = async () => {
    const { user } = statusDialog;
    setStatusDialog({ open: false, user: null });
    try {
      await adminAPI.updateUserStatus(user.id, !user.active);
      success(`User "${user.username}" ${user.active ? 'deactivated' : 'activated'}.`);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    const { user } = deleteDialog;
    setDeleteDialog({ open: false, user: null });
    try {
      await adminAPI.deleteUser(user.id);
      success(`User "${user.username}" deleted.`);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        User Management
      </Typography>

      {/* ── Filter toolbar ─────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ borderRadius: 2, mb: 2 }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          {/* Search */}
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search username or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
            <Button type="submit" variant="outlined" size="small">
              Search
            </Button>
            {searchText && (
              <Button
                size="small"
                onClick={() => { setSearchInput(''); setSearchText(''); setPage(0); }}
              >
                Clear
              </Button>
            )}
          </Box>

          {/* Role filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={roleFilter} onChange={handleRoleFilter}>
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="PATIENT">Patient</MenuItem>
              <MenuItem value="DOCTOR">Doctor</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {total} user{total !== 1 ? 's' : ''} found
          </Typography>
        </Toolbar>
      </Paper>

      {fetchError && <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    hover
                    sx={{ opacity: u.active ? 1 : 0.6 }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{u.username}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        color={ROLE_COLOR[u.role] || 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.active ? 'Active' : 'Inactive'}
                        color={u.active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {fmtDate(u.createdAt)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={u.active ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          color={u.active ? 'warning' : 'success'}
                          onClick={() => openStatusDialog(u)}
                        >
                          {u.active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete user">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openDeleteDialog(u)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelDisplayedRows={({ from, to, count }) =>
            `Showing ${from}–${to} of ${count}`
          }
        />
      </Paper>

      {/* ── Status toggle confirm ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={statusDialog.open}
        title={statusDialog.user?.active ? 'Deactivate User?' : 'Activate User?'}
        message={
          statusDialog.user?.active
            ? `Deactivate "${statusDialog.user?.username}"? They will no longer be able to log in.`
            : `Activate "${statusDialog.user?.username}"? They will regain access.`
        }
        confirmColor={statusDialog.user?.active ? 'warning' : 'success'}
        onConfirm={handleToggleStatus}
        onClose={() => setStatusDialog({ open: false, user: null })}
      />

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete User?"
        message={`Permanently delete "${deleteDialog.user?.username}"? This action cannot be undone.`}
        confirmColor="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false, user: null })}
      />
    </Container>
  );
}
