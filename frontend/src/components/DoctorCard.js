import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Chip, Button, Box } from '@mui/material';
import StarIcon         from '@mui/icons-material/Star';
import WorkIcon         from '@mui/icons-material/Work';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import SchoolIcon       from '@mui/icons-material/School';

const SPEC_COLOR = {
  'General Physician': '#1565c0',
  Cardiology:          '#c62828',
  Neurology:           '#6a1b9a',
  Orthopedics:         '#e65100',
  Dermatology:         '#0277bd',
  Gastroenterology:    '#2e7d32',
  ENT:                 '#00838f',
  Ophthalmology:       '#558b2f',
  Psychiatry:          '#4527a0',
  Pediatrics:          '#00695c',
};

export default function DoctorCard({ doctor }) {
  const navigate = useNavigate();
  const { id, name, specialization, experience, rating, fees, qualification } = doctor;
  const color   = SPEC_COLOR[specialization] ?? '#37474f';
  const initial = (name?.[0] ?? 'D').toUpperCase();

  return (
    <Card
      elevation={2}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
      }}
    >
      {/* ── HEADER ── */}
      <Box sx={{
        height: 140,
        flexShrink: 0,
        bgcolor: color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        px: 1,
        boxSizing: 'border-box',
      }}>
        <Avatar sx={{
          width: 52, height: 52, fontSize: 22, fontWeight: 700,
          bgcolor: 'rgba(255,255,255,0.18)',
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.45)',
          flexShrink: 0,
        }}>
          {initial}
        </Avatar>

        <Typography sx={{
          fontSize: 14, fontWeight: 700, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: '90%', lineHeight: 1,
        }}>
          Dr. {name}
        </Typography>

        <Chip label={specialization} size="small" sx={{
          bgcolor: 'rgba(255,255,255,0.22)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 10,
          height: 20,
          border: '1px solid rgba(255,255,255,0.38)',
          '& .MuiChip-label': { px: '8px' },
        }} />
      </Box>

      {/* ── STATS (grows to fill) ── */}
      <Box sx={{
        flexGrow: 1,
        px: 2,
        pt: '12px',
        pb: '8px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
      }}>
        {/* Qualification */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: 20 }}>
          <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary"
            sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
            {qualification ?? '—'}
          </Typography>
        </Box>

        {/* Experience */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: 20 }}>
          <WorkIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
            {experience} years experience
          </Typography>
        </Box>

        {/* Rating + Fees side by side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '18px', minHeight: 20 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <StarIcon sx={{ fontSize: 16, color: '#f9a825', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
              {rating} / 5
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CurrencyRupeeIcon sx={{ fontSize: 16, color: '#2e7d32', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
              ₹{fees}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── BUTTON (pinned to bottom) ── */}
      <Box sx={{
        px: 2,
        pb: 2,
        pt: 0,
        flexShrink: 0,
      }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate(`/dashboard/book-appointment/${id}`)}
          sx={{
            fontWeight: 600,
            bgcolor: color,
            height: 36,
            '&:hover': { bgcolor: color, filter: 'brightness(0.88)' },
          }}
        >
          Book Appointment
        </Button>
      </Box>
    </Card>
  );
}
