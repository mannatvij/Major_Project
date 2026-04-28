import { createTheme } from '@mui/material/styles';

const RADIUS = 12;

const lightPalette = {
  mode: 'light',
  primary:    { main: '#1976d2', light: '#42a5f5', dark: '#0d47a1' },
  secondary:  { main: '#dc004e' },
  success:    { main: '#2e7d32' },
  warning:    { main: '#ed6c02' },
  error:      { main: '#d32f2f' },
  background: { default: '#eef2f7', paper: '#ffffff' },
  divider:    'rgba(0,0,0,0.08)',
};

const darkPalette = {
  mode: 'dark',
  primary:    { main: '#64b5f6', light: '#90caf9', dark: '#1e88e5' },
  secondary:  { main: '#f06292' },
  success:    { main: '#66bb6a' },
  warning:    { main: '#ffa726' },
  error:      { main: '#ef5350' },
  background: { default: '#0f172a', paper: '#1e293b' },
  divider:    'rgba(255,255,255,0.08)',
  text:       { primary: '#e2e8f0', secondary: '#94a3b8' },
};

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.02em' },
  h2: { fontWeight: 800, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, letterSpacing: '-0.01em' },
  h4: { fontWeight: 700, letterSpacing: '-0.01em' },
  h5: { fontWeight: 700, letterSpacing: '-0.005em' },
  h6: { fontWeight: 700 },
  button: { fontWeight: 600, letterSpacing: 0 },
};

const buildShadows = (mode) => {
  const base = mode === 'dark' ? '0,0,0' : '15,23,42';
  const arr = ['none'];
  for (let i = 1; i <= 24; i++) {
    const y = Math.min(2 + i, 26);
    const blur = Math.min(4 + i * 2, 50);
    const a = Math.min(0.04 + i * 0.012, 0.3).toFixed(3);
    arr.push(`0 ${y}px ${blur}px rgba(${base},${a})`);
  }
  return arr;
};

export const buildTheme = (mode = 'light') => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const isDark  = mode === 'dark';
  return createTheme({
    palette,
    typography: sharedTypography,
    shape: { borderRadius: RADIUS },
    shadows: buildShadows(mode),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(at 20% 10%, rgba(100,181,246,0.08) 0, transparent 45%), radial-gradient(at 85% 80%, rgba(240,98,146,0.06) 0, transparent 45%)'
              : 'radial-gradient(at 20% 10%, rgba(25,118,210,0.08) 0, transparent 45%), radial-gradient(at 85% 80%, rgba(220,0,78,0.05) 0, transparent 45%)',
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar':       { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)',
            borderRadius: 8,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.3)',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: RADIUS,
            fontWeight: 600,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
            '&:hover': { transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0)' },
          },
          containedPrimary: {
            boxShadow: isDark
              ? '0 6px 16px rgba(100,181,246,0.25)'
              : '0 6px 16px rgba(25,118,210,0.28)',
            '&:hover': {
              boxShadow: isDark
                ? '0 10px 22px rgba(100,181,246,0.35)'
                : '0 10px 22px rgba(25,118,210,0.38)',
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS,
            backgroundImage: 'none',
            transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, borderRadius: 8 },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS,
            transition: 'box-shadow 0.18s ease',
            '&.Mui-focused': {
              boxShadow: isDark
                ? '0 0 0 3px rgba(100,181,246,0.25)'
                : '0 0 0 3px rgba(25,118,210,0.15)',
            },
          },
        },
      },
      MuiSelect: {
        defaultProps: { size: 'small' },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'saturate(180%) blur(14px)',
            WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 8, fontSize: 12 },
        },
      },
    },
  });
};

const theme = buildTheme('light');
export default theme;
