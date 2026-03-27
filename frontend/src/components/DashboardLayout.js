import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import {
  AppBar, Toolbar, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Button, Avatar, useMediaQuery, useTheme,
  BottomNavigation, BottomNavigationAction, Paper,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ConfirmDialog from './ConfirmDialog';

const DRAWER_WIDTH = 240;

const PATIENT_NAV = [
  { label: 'Dashboard',       icon: <DashboardIcon />,      path: '/dashboard' },
  { label: 'Browse Doctors',  icon: <LocalHospitalIcon />,  path: '/dashboard/doctors' },
  { label: 'My Appointments', icon: <CalendarTodayIcon />,  path: '/dashboard/appointments' },
  { label: 'Profile',         icon: <PersonIcon />,         path: '/dashboard/profile' },
];

const DOCTOR_NAV = [
  { label: 'Dashboard',           icon: <DashboardIcon />,      path: '/dashboard' },
  { label: 'Appointments',        icon: <CalendarTodayIcon />,  path: '/dashboard/doctor-appointments' },
  { label: 'Availability',        icon: <EventAvailableIcon />, path: '/dashboard/availability' },
  { label: 'Profile',             icon: <PersonIcon />,         path: '/dashboard/profile' },
];

export default function DashboardLayout({ children }) {
  const { user, logout, isDoctor } = useAuth();
  const { info } = useSnackbar();
  const navigate  = useNavigate();
  const location  = useLocation();
  const muiTheme  = useTheme();
  const isMobile  = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [logoutOpen, setLogoutOpen] = useState(false);

  const NAV_ITEMS = isDoctor ? DOCTOR_NAV : PATIENT_NAV;

  // Map path → BottomNavigation index
  const activeIndex = NAV_ITEMS.findIndex((n) => n.path === location.pathname);

  const handleLogout = () => {
    logout();
    info('You have been logged out.');
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <Box sx={{ overflow: 'auto', mt: 1 }}>
      <List>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = location.pathname === path;
          return (
            <ListItem key={label} disablePadding sx={{ mx: 1, mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(path)}
                sx={{
                  borderRadius: 2,
                  bgcolor: active ? '#e3f2fd' : 'transparent',
                  color: active ? 'primary.main' : 'inherit',
                  '&:hover': { bgcolor: '#e3f2fd' },
                }}
              >
                <ListItemIcon sx={{ color: active ? 'primary.main' : 'inherit', minWidth: 40 }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontWeight: active ? 600 : 400, fontSize: 14 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ── Top AppBar ─────────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: 'primary.main' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold" noWrap>
            Smart Healthcare
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#fff', color: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
            {!isMobile && (
              <Typography variant="body2" sx={{ color: '#fff' }}>
                {user?.username ?? 'User'}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={() => setLogoutOpen(true)}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
            >
              {isMobile ? '' : 'Logout'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar (desktop only) ─────────────────────────────────────── */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#f8f9fa',
              borderRight: '1px solid #e0e0e0',
            },
          }}
        >
          <Toolbar />
          {sidebar}
        </Drawer>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          minHeight: '100vh',
          bgcolor: 'background.default',
          // On mobile add bottom padding so content isn't hidden under BottomNavigation
          pb: { xs: 9, sm: 3 },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* ── Bottom Navigation (mobile only) ───────────────────────────── */}
      {isMobile && (
        <Paper
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
          elevation={8}
        >
          <BottomNavigation
            showLabels
            value={activeIndex === -1 ? 0 : activeIndex}
            onChange={(_, newVal) => navigate(NAV_ITEMS[newVal].path)}
          >
            {NAV_ITEMS.map(({ label, icon }) => (
              <BottomNavigationAction key={label} label={label} icon={icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      {/* ── Logout confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Log out?"
        message="Are you sure you want to log out of Smart Healthcare?"
        confirmLabel="Log Out"
        cancelLabel="Stay"
        confirmColor="error"
      />
    </Box>
  );
}
