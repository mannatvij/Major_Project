import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Card, CardContent, Typography, Box, Chip, Avatar, Button,
  Divider, Rating, Pagination, Grid, Skeleton, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import StarIcon from '@mui/icons-material/Star';
import EventIcon from '@mui/icons-material/Event';
import { doctorAPI, reviewAPI } from '../services/api';
import EmptyState from '../components/EmptyState';
import RateReviewIcon from '@mui/icons-material/RateReview';

const PAGE_SIZE = 5;

function fmtDateTime(dt) {
  return dt
    ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}

export default function DoctorProfilePage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor]           = useState(null);
  const [doctorErr, setDoctorErr]     = useState('');
  const [reviewsPage, setReviewsPage] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [page, setPage]               = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    doctorAPI.getById(id)
      .then(({ data }) => setDoctor(data))
      .catch(() => setDoctorErr('Could not load doctor details.'));
  }, [id]);

  const loadReviews = useCallback((p) => {
    setLoading(true);
    reviewAPI.listForDoctor(id, p, PAGE_SIZE)
      .then(({ data }) => setReviewsPage(data))
      .catch(() => setReviewsPage({ content: [], totalPages: 0, totalElements: 0 }))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadReviews(page); }, [loadReviews, page]);

  if (doctorErr) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{doctorErr}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/doctors')}>
          Back to Doctors
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      {/* Doctor info card */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          {!doctor ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Avatar sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36 }}>
                  {(doctor.name?.[0] ?? 'D').toUpperCase()}
                </Avatar>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Typography variant="h5" fontWeight="bold">Dr. {doctor.name}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 1 }}>
                  {doctor.specialization && (
                    <Chip icon={<LocalHospitalIcon />} label={doctor.specialization}
                      color="primary" size="small" />
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Rating value={doctor.rating ?? 0} precision={0.1} readOnly size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {doctor.rating?.toFixed(1) ?? '—'} / 5
                    {doctor.reviewCount > 0 && (
                      <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                        ({doctor.reviewCount} review{doctor.reviewCount === 1 ? '' : 's'})
                      </Typography>
                    )}
                  </Typography>
                </Box>
                {doctor.qualification && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon fontSize="small" color="action" />
                    <Typography variant="body2">{doctor.qualification}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon fontSize="small" color="action" />
                  <Typography variant="body2">{doctor.experience} years experience</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CurrencyRupeeIcon fontSize="small" sx={{ color: 'success.main' }} />
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    ₹{doctor.fees} per consultation
                  </Typography>
                </Box>
                {doctor.bio && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {doctor.bio}
                  </Typography>
                )}
                <Button
                  variant="contained"
                  startIcon={<EventIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/dashboard/book-appointment/${doctor.id}`)}
                >
                  Book Appointment
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RateReviewIcon color="primary" />
        Patient Reviews ({reviewsPage.totalElements ?? 0})
      </Typography>

      {loading && (
        <>
          <Skeleton variant="rectangular" height={80} sx={{ mb: 1.5 }} />
          <Skeleton variant="rectangular" height={80} sx={{ mb: 1.5 }} />
        </>
      )}

      {!loading && reviewsPage.content?.length === 0 && (
        <EmptyState
          icon={StarIcon}
          title="No reviews yet"
          subtitle="Be the first to review this doctor after your appointment."
        />
      )}

      {!loading && reviewsPage.content?.map((r) => (
        <Card key={r.id} variant="outlined" sx={{ mb: 1.5 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating value={r.rating} readOnly size="small" />
                <Typography variant="body2" fontWeight={600}>{r.rating}/5</Typography>
              </Box>
              <Typography variant="caption" color="text.disabled">
                {fmtDateTime(r.createdAt)}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {r.patientName}
            </Typography>
            {r.comment && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.comment}</Typography>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {!loading && reviewsPage.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={reviewsPage.totalPages}
            page={page + 1}
            onChange={(_, p) => setPage(p - 1)}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
}
