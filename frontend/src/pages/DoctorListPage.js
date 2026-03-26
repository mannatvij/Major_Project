import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Typography, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Alert, Box,
} from '@mui/material';
import DoctorCard from '../components/DoctorCard';
import { doctorAPI } from '../services/api';

const SPECIALIZATIONS = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'General Medicine',
];

export default function DoctorListPage() {
  const [doctors, setDoctors]                     = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');

  const fetchDoctors = async (specialization = '') => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (specialization) {
        response = await doctorAPI.search(specialization);
      } else {
        response = await doctorAPI.getAll();
      }

      // Handle both paginated { content: [...] } and plain array responses
      const data = response.data;
      setDoctors(Array.isArray(data) ? data : (data.content ?? []));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSpecializationChange = (e) => {
    const value = e.target.value;
    setSelectedSpecialization(value);
    fetchDoctors(value);
  };

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Browse Doctors
        </Typography>

        {/* Specialization filter */}
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel>Filter by Specialization</InputLabel>
          <Select
            value={selectedSpecialization}
            label="Filter by Specialization"
            onChange={handleSpecializationChange}
          >
            <MenuItem value="">All Specializations</MenuItem>
            {SPECIALIZATIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : doctors.length === 0 ? (
        <Alert severity="info">No doctors found.</Alert>
      ) : (
        <Grid container spacing={3}>
          {doctors.map((doctor) => (
            <Grid item xs={12} sm={6} md={4} key={doctor.id}>
              <DoctorCard doctor={doctor} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
