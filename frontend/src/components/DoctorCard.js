import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardActions, Avatar, Typography,
  Chip, Button, Box,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

const SPECIALIZATION_COLORS = {
  Cardiology:       'error',
  Neurology:        'secondary',
  Orthopedics:      'warning',
  Pediatrics:       'success',
  Dermatology:      'info',
  'General Medicine': 'default',
};

export default function DoctorCard({ doctor }) {
  const navigate = useNavigate();
  const {
    id, name, specialization,
    experience, rating, fees,
  } = doctor;

  const chipColor = SPECIALIZATION_COLORS[specialization] ?? 'default';

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Avatar + Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 52, height: 52, fontSize: 22 }}>
            {name?.[0]?.toUpperCase() ?? 'D'}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
              Dr. {name}
            </Typography>
            {specialization && (
              <Chip
                label={specialization}
                color={chipColor}
                size="small"
                icon={<LocalHospitalIcon />}
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        </Box>

        {/* Experience */}
        {experience != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WorkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {experience} years experience
            </Typography>
          </Box>
        )}

        {/* Rating */}
        {rating != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <StarIcon fontSize="small" sx={{ color: '#f9a825' }} />
            <Typography variant="body2" color="text.secondary">
              {rating} / 5
            </Typography>
          </Box>
        )}

        {/* Fees */}
        {fees != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CurrencyRupeeIcon fontSize="small" sx={{ color: '#2e7d32' }} />
            <Typography variant="body2" color="text.secondary">
              ₹{fees} per consultation
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate(`/dashboard/book-appointment/${id}`)}
          sx={{ textTransform: 'none', bgcolor: '#1976d2' }}
        >
          Book Appointment
        </Button>
      </CardActions>
    </Card>
  );
}
