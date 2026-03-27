import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'info' });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setState({ open: true, message, severity });
  }, []);

  const success = useCallback((msg) => showSnackbar(msg, 'success'), [showSnackbar]);
  const error   = useCallback((msg) => showSnackbar(msg, 'error'),   [showSnackbar]);
  const info    = useCallback((msg) => showSnackbar(msg, 'info'),    [showSnackbar]);
  const warning = useCallback((msg) => showSnackbar(msg, 'warning'), [showSnackbar]);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar, success, error, info, warning }}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used inside <SnackbarProvider>');
  return ctx;
}
