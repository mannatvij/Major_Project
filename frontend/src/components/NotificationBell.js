import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton, Badge, Popover, List, ListItem, ListItemText,
  Typography, Box, Divider, Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event';
import { notificationAPI } from '../services/api';

const POLL_MS = 5 * 60 * 1000; // refresh every 5 minutes

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchor, setAnchor]           = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getUpcoming();
      setNotifications(res.data ?? []);
    } catch {
      // silent — user may not be a patient or session expired
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const handleItemClick = () => {
    setAnchor(null);
    navigate('/dashboard/appointments');
  };

  const open  = Boolean(anchor);
  const count = notifications.length;

  return (
    <>
      <Tooltip title={count ? `${count} upcoming appointment${count > 1 ? 's' : ''}` : 'No upcoming appointments'}>
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ color: '#fff' }}
          aria-label="notifications"
        >
          <Badge badgeContent={count || null} color="error" max={9}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxHeight: 420 } }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Upcoming in the next 24 h
          </Typography>
        </Box>

        {count === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No confirmed appointments in the next 24 hours.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {notifications.map((n, i) => (
              <React.Fragment key={n.appointmentId}>
                {i > 0 && <Divider component="li" />}
                <ListItem
                  onClick={handleItemClick}
                  sx={{
                    py: 1.5, px: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                    <EventIcon fontSize="small" color="primary" sx={{ mt: 0.3, flexShrink: 0 }} />
                    <ListItemText
                      primary={n.message}
                      primaryTypographyProps={{ variant: 'body2', fontSize: 13 }}
                    />
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Footer hint */}
        {count > 0 && (
          <Box
            onClick={handleItemClick}
            sx={{
              px: 2, py: 1,
              borderTop: '1px solid #e0e0e0',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            <Typography variant="caption" color="primary.main" fontWeight={600}>
              View all appointments →
            </Typography>
          </Box>
        )}
      </Popover>
    </>
  );
}
