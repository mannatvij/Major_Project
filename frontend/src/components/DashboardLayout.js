import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppBar, Toolbar, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Button, Avatar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

const DRAWER_WIDTH = 240;

const PATIENT_NAV = [
  { label: 'Dashboard',       icon: <DashboardIcon />,       path: '/dashboard' },
  { label: 'Browse Doctors',  icon: <LocalHospitalIcon />,   path: '/dashboard/doctors' },
  { label: 'My Appointments', icon: <CalendarTodayIcon />,   path: '/dashboard/appointments' },
  { label: 'Profile',         icon: <PersonIcon />,          path: '/dashboard/profile' },
];

const DOCTOR_NAV = [
  { label: 'Dashboard',          icon: <DashboardIcon />,       path: '/dashboard' },
  { label: 'Appointments',       icon: <CalendarTodayIcon />,   path: '/dashboard/doctor-appointments' },
  { label: 'Manage Availability',icon: <EventAvailableIcon />,  path: '/dashboard/availability' },
  { label: 'Profile',            icon: <PersonIcon />,          path: '/dashboard/profile' },
];

export default function DashboardLayout({ children }) {
  const { user, logout, isDoctor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const NAV_ITEMS = isDoctor ? DOCTOR_NAV : PATIENT_NAV;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ── Top AppBar ── */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1976d2' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold" noWrap>
            Smart Healthcare System
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#fff', color: '#1976d2', width: 34, height: 34, fontSize: 16 }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
            <Typography variant="body1" sx={{ color: '#fff' }}>
              {user?.username ?? 'User'}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ExitToAppIcon />}
              onClick={handleLogout}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar Drawer ── */}
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
        <Toolbar /> {/* spacer below AppBar */}
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
                      color: active ? '#1976d2' : 'inherit',
                      '&:hover': { bgcolor: '#e3f2fd' },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? '#1976d2' : 'inherit', minWidth: 40 }}>
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
      </Drawer>

      {/* ── Main content area ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          bgcolor: '#f0f4f8',
        }}
      >
        <Toolbar /> {/* spacer below AppBar */}
        {children}
      </Box>
    </Box>
  );
}
