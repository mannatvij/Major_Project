import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { useThemeMode } from '../context/ThemeModeContext';
import {
  AppBar, Toolbar, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Button, Avatar, useMediaQuery, useTheme, IconButton, Tooltip,
  BottomNavigation, BottomNavigationAction, Paper, alpha,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ConfirmDialog from './ConfirmDialog';
import NotificationBell from './NotificationBell';

const DRAWER_WIDTH = 248;

const PATIENT_NAV = [
  { label: 'Dashboard',       icon: <DashboardIcon />,      path: '/dashboard' },
  { label: 'Browse Doctors',  icon: <LocalHospitalIcon />,  path: '/dashboard/doctors' },
  { label: 'My Appointments', icon: <CalendarTodayIcon />,  path: '/dashboard/appointments' },
  { label: 'AI Assistant',    icon: <SmartToyIcon />,       path: '/dashboard/chat' },
  { label: 'Profile',         icon: <PersonIcon />,         path: '/dashboard/profile' },
];

const DOCTOR_NAV = [
  { label: 'Dashboard',    icon: <DashboardIcon />,      path: '/dashboard' },
  { label: 'Appointments', icon: <CalendarTodayIcon />,  path: '/dashboard/doctor-appointments' },
  { label: 'Availability', icon: <EventAvailableIcon />, path: '/dashboard/availability' },
  { label: 'Profile',      icon: <PersonIcon />,         path: '/dashboard/profile' },
];

const ADMIN_NAV = [
  { label: 'Dashboard',       icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'User Management', icon: <PeopleIcon />,    path: '/dashboard/users' },
  { label: 'Statistics',      icon: <BarChartIcon />,  path: '/dashboard/statistics' },
];

export default function DashboardLayout({ children }) {
  const { user, logout, isDoctor, isAdmin } = useAuth();
  const { info } = useSnackbar();
  const { mode, toggle } = useThemeMode();
  const navigate  = useNavigate();
  const location  = useLocation();
  const muiTheme  = useTheme();
  const isDark    = muiTheme.palette.mode === 'dark';
  const isMobile  = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [logoutOpen, setLogoutOpen] = useState(false);

  const NAV_ITEMS = isAdmin ? ADMIN_NAV : isDoctor ? DOCTOR_NAV : PATIENT_NAV;
  const activeIndex = NAV_ITEMS.findIndex((n) => n.path === location.pathname);

  const handleLogout = () => {
    logout();
    info('You have been logged out.');
    navigate('/login', { replace: true });
  };

  const primary = muiTheme.palette.primary.main;

  const sidebar = (
    <Box sx={{ overflow: 'auto', mt: 1, px: 1 }}>
      <List>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = location.pathname === path;
          return (
            <ListItem key={label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(path)}
                sx={{
                  position: 'relative',
                  borderRadius: 2,
                  pl: 2,
                  py: 1.1,
                  color: active ? 'primary.main' : 'text.primary',
                  background: active
                    ? `linear-gradient(90deg, ${alpha(primary, isDark ? 0.22 : 0.14)}, ${alpha(primary, 0)})`
                    : 'transparent',
                  transition: 'background 0.2s, color 0.2s, transform 0.15s',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0, top: 8, bottom: 8, width: 3,
                    borderRadius: 4,
                    background: active ? primary : 'transparent',
                    transition: 'background 0.2s',
                  },
                  '&:hover': {
                    background: alpha(primary, isDark ? 0.18 : 0.1),
                    transform: 'translateX(2px)',
                  },
                }}
              >
                <ListItemIcon sx={{
                  color: active ? 'primary.main' : 'text.secondary',
                  minWidth: 38,
                  transition: 'color 0.2s',
                }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: 14 }}
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
      {/* Glass AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: isDark
            ? alpha(muiTheme.palette.background.paper, 0.75)
            : alpha('#ffffff', 0.78),
          color: 'text.primary',
          borderBottom: `1px solid ${muiTheme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.primary.light})`,
              boxShadow: `0 6px 16px ${alpha(primary, 0.4)}`,
            }}>
              <LocalHospitalIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} noWrap sx={{
              background: `linear-gradient(90deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.primary.light})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Smart Healthcare
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={toggle} size="small" sx={{
                border: `1px solid ${muiTheme.palette.divider}`,
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'rotate(20deg)' },
              }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {!isAdmin && <NotificationBell />}
            <Avatar sx={{
              bgcolor: 'primary.main', color: '#fff', width: 34, height: 34, fontSize: 14, fontWeight: 700,
              boxShadow: `0 4px 12px ${alpha(primary, 0.4)}`,
            }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
            {!isMobile && (
              <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                {user?.username ?? 'User'}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={() => setLogoutOpen(true)}
              sx={{ ml: 0.5 }}
            >
              {isMobile ? '' : 'Logout'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: isDark ? alpha(muiTheme.palette.background.paper, 0.6) : alpha('#ffffff', 0.7),
              backdropFilter: 'blur(12px)',
              borderRight: `1px solid ${muiTheme.palette.divider}`,
            },
          }}
        >
          <Toolbar />
          {sidebar}
        </Drawer>
      )}

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          minHeight: '100vh',
          pb: { xs: 9, sm: 3 },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* Mobile bottom nav */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
            borderTop: `1px solid ${muiTheme.palette.divider}`,
            background: isDark ? alpha(muiTheme.palette.background.paper, 0.92) : alpha('#ffffff', 0.95),
            backdropFilter: 'blur(12px)',
          }}
          elevation={0}
        >
          <BottomNavigation
            showLabels
            value={activeIndex === -1 ? 0 : activeIndex}
            onChange={(_, newVal) => navigate(NAV_ITEMS[newVal].path)}
            sx={{ bgcolor: 'transparent' }}
          >
            {NAV_ITEMS.map(({ label, icon }) => (
              <BottomNavigationAction key={label} label={label} icon={icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}

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
