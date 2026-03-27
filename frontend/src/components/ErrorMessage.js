import React from 'react';
import { Alert, Button, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function ErrorMessage({ message, onRetry }) {
  const display = message || 'Something went wrong. Please try again.';
  return (
    <Box sx={{ my: 3 }}>
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : null
        }
      >
        {display}
      </Alert>
    </Box>
  );
}
