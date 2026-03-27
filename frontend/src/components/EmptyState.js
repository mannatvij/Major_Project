import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({
  icon: Icon = InboxIcon,
  title = 'Nothing here yet',
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '30vh',
        textAlign: 'center',
        gap: 1.5,
        py: 6,
        color: 'text.secondary',
      }}
    >
      <Icon sx={{ fontSize: 64, opacity: 0.35 }} />
      <Typography variant="h6" fontWeight={600} color="text.primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          {subtitle}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
