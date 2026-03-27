import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Grid, Typography, FormControl, InputLabel,
  Select, MenuItem, Box, TextField, Pagination, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DoctorCard from '../components/DoctorCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { doctorAPI } from '../services/api';

const SPECIALIZATIONS = [
  'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Dermatology', 'General Medicine',
];

const PAGE_SIZE = 9;

export default function DoctorListPage() {
  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [specialization, setSpecialization] = useState('');
  const [searchText, setSearchText]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const debounceRef                     = useRef(null);

  // Debounce search input: wait 400ms before updating debouncedSearch
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (specialization) {
        response = await doctorAPI.search(specialization, page - 1, PAGE_SIZE);
      } else {
        response = await doctorAPI.getAll(page - 1, PAGE_SIZE);
      }
      const data = response.data;
      const list = Array.isArray(data) ? data : (data.content ?? []);
      setDoctors(list);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [specialization, page]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Client-side name filter (applied on top of API results)
  const visible = debouncedSearch
    ? doctors.filter((d) =>
        (d.name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : doctors;

  const handleSpecializationChange = (e) => {
    setSpecialization(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSpecialization('');
    setSearchText('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <Container maxWidth="lg">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Browse Doctors
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Name search */}
          <TextField
            placeholder="Search by name…"
            value={searchText}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Specialization filter */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Filter by Specialization</InputLabel>
            <Select
              value={specialization}
              label="Filter by Specialization"
              onChange={handleSpecializationChange}
            >
              <MenuItem value="">All Specializations</MenuItem>
              {SPECIALIZATIONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && <ErrorMessage message={error} onRetry={fetchDoctors} />}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner message="Finding doctors…" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LocalHospitalIcon}
          title="No doctors found"
          subtitle={
            specialization || debouncedSearch
              ? 'No doctors match your filters. Try clearing them.'
              : 'No doctors are available at the moment.'
          }
          actionLabel={specialization || debouncedSearch ? 'Clear Filters' : undefined}
          onAction={specialization || debouncedSearch ? handleResetFilters : undefined}
        />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {visible.length} doctor{visible.length !== 1 ? 's' : ''}
            {specialization ? ` in ${specialization}` : ''}
          </Typography>

          <Grid container spacing={3}>
            {visible.map((doctor) => (
              <Grid item xs={12} sm={6} md={4} key={doctor.id}>
                <DoctorCard doctor={doctor} />
              </Grid>
            ))}
          </Grid>

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
