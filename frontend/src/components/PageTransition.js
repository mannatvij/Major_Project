import React from 'react';
import { Fade, Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <Fade in key={location.pathname} timeout={320}>
      <Box sx={{ animation: 'pageRise 0.32s ease both',
        '@keyframes pageRise': {
          from: { transform: 'translateY(6px)' },
          to:   { transform: 'translateY(0)' },
        },
      }}>
        {children}
      </Box>
    </Fade>
  );
}
