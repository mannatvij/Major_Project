import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Grid, Card, CardContent, Typography, Box, Button,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert,
  Chip, Divider, List, ListItem, ListItemText, ListItemIcon, Avatar, Rating,
  Menu, ListItemAvatar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarIcon from '@mui/icons-material/Star';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DownloadIcon from '@mui/icons-material/Download';
import EventIcon from '@mui/icons-material/Event';
import PaymentsIcon from '@mui/icons-material/Payments';
import UndoIcon from '@mui/icons-material/Undo';
import DescriptionIcon from '@mui/icons-material/Description';
import RateReviewIcon from '@mui/icons-material/RateReview';
import VerifiedIcon from '@mui/icons-material/Verified';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { adminAPI } from '../services/api';

// ─── Colour palettes ──────────────────────────────────────────────────────────
const PIE_COLORS   = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];
const BAR_COLORS   = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];
const CHART_BLUE   = '#3b82f6';
const LINE_GREEN   = '#10b981';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <Card
      elevation={2}
      sx={{
        borderLeft: `5px solid ${color}`,
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
        <Box
          sx={{
            bgcolor: `${color}1a`,
            color,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold" color={color}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, children, height = 280 }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight="600" mb={2}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', height }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomBarLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 4} fill="#555" textAnchor="middle" fontSize={11}>
      {value}
    </text>
  );
}

// ─── Activity feed icon picker ────────────────────────────────────────────────
const ACTIVITY_ICON = {
  APPOINTMENT_BOOKED:   <EventIcon fontSize="small" />,
  PAYMENT_RECEIVED:     <PaymentsIcon fontSize="small" />,
  PAYMENT_FAILED:       <PaymentsIcon fontSize="small" />,
  REFUND_ISSUED:        <UndoIcon fontSize="small" />,
  PRESCRIPTION_ISSUED:  <DescriptionIcon fontSize="small" />,
  REVIEW_LEFT:          <RateReviewIcon fontSize="small" />,
};
const ACTIVITY_COLOR = {
  APPOINTMENT_BOOKED:   '#3b82f6',
  PAYMENT_RECEIVED:     '#10b981',
  PAYMENT_FAILED:       '#ef4444',
  REFUND_ISSUED:        '#f97316',
  PRESCRIPTION_ISSUED:  '#8b5cf6',
  REVIEW_LEFT:          '#f59e0b',
};

function fromNow(at) {
  if (!at) return '';
  const diff = (Date.now() - new Date(at).getTime()) / 1000;
  if (diff < 60)        return Math.round(diff)        + 's ago';
  if (diff < 3600)      return Math.round(diff / 60)   + 'm ago';
  if (diff < 86_400)    return Math.round(diff / 3600) + 'h ago';
  return Math.round(diff / 86_400) + 'd ago';
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [activity, setActivity] = useState([]);
  const [health,   setHealth]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [days,     setDays]     = useState(7);
  const [exportAnchor, setExportAnchor] = useState(null);

  const fetchAll = useCallback(async (d) => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, actRes, healthRes] = await Promise.all([
        adminAPI.getStats(d),
        adminAPI.getActivity(15),
        adminAPI.getHealth(),
      ]);
      setStats(statsRes.data);
      setActivity(actRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(days); }, [days, fetchAll]);

  const handleExport = async (type) => {
    setExportAnchor(null);
    try {
      const blob = await adminAPI.exportCsv(type);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${type}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed.');
    }
  };

  // ── Derived chart data ────────────────────────────────────────────────────
  const pieData = stats
    ? [
        { name: 'Pending',   value: Number(stats.appointmentsByStatus.pending)   },
        { name: 'Confirmed', value: Number(stats.appointmentsByStatus.confirmed) },
        { name: 'Completed', value: Number(stats.appointmentsByStatus.completed) },
        { name: 'Cancelled', value: Number(stats.appointmentsByStatus.cancelled) },
      ].filter((d) => d.value > 0)
    : [];

  const barData = stats
    ? (stats.appointmentsRecent || []).map((d) => ({
        date:  d.date.slice(5),   // "MM-DD"
        count: Number(d.count),
      }))
    : [];

  const specData = stats
    ? (stats.topSpecializations || []).map((s) => ({
        name:  s.specialization,
        count: Number(s.count),
      }))
    : [];

  const perfData = stats
    ? (stats.doctorPerformance || []).map((d) => ({
        name:      d.name,
        completed: d.completedAppointments,
      }))
    : [];

  // ── Revenue formatting ────────────────────────────────────────────────────
  const fmtRevenue = (v) =>
    v >= 1_00_000
      ? `₹${(v / 1_00_000).toFixed(1)}L`
      : v >= 1_000
      ? `₹${(v / 1_000).toFixed(1)}K`
      : `₹${v.toFixed(0)}`;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Platform overview and analytics.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {stats?.pendingDoctorApprovals > 0 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<HourglassBottomIcon />}
              onClick={() => navigate('/dashboard/doctor-approvals')}
            >
              {stats.pendingDoctorApprovals} pending approvals
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={(e) => setExportAnchor(e.currentTarget)}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)}
                onClose={() => setExportAnchor(null)}>
            <MenuItem onClick={() => handleExport('users')}>Users CSV</MenuItem>
            <MenuItem onClick={() => handleExport('appointments')}>Appointments CSV</MenuItem>
            <MenuItem onClick={() => handleExport('payments')}>Payments CSV</MenuItem>
            <MenuItem onClick={() => handleExport('reviews')}>Reviews CSV</MenuItem>
          </Menu>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              label="Date Range"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            >
              <MenuItem value={7}>Last 7 Days</MenuItem>
              <MenuItem value={30}>Last 30 Days</MenuItem>
              <MenuItem value={90}>Last 90 Days</MenuItem>
              <MenuItem value={3650}>All Time</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<PersonIcon />}
            label="Total Patients"
            value={stats?.totalPatients ?? 0}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<LocalHospitalIcon />}
            label="Total Doctors"
            value={stats?.totalDoctors ?? 0}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<CalendarTodayIcon />}
            label="Total Appointments"
            value={stats?.totalAppointments ?? 0}
            color="#f97316"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<AttachMoneyIcon />}
            label="Net Revenue"
            value={fmtRevenue(stats?.netRevenue ?? 0)}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* ── Payment KPI strip ────────────────────────────────────────────── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">Successful payments</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {stats?.paymentCounts?.paid ?? 0}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Avg ticket ₹{(stats?.avgTicketSize ?? 0).toLocaleString('en-IN')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">Refunds issued</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {stats?.paymentCounts?.refunded ?? 0}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {fmtRevenue(stats?.refundsAmount ?? 0)} refunded
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">Failed / abandoned</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {stats?.paymentCounts?.failed ?? 0}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Success rate {stats?.paymentSuccessRate ?? 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">Platform rating</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {stats?.platformAvgRating?.toFixed?.(1) ?? '—'}
                </Typography>
                <Rating value={stats?.platformAvgRating ?? 0} precision={0.1} readOnly size="small" />
              </Box>
              <Typography variant="caption" color="text.disabled">
                {stats?.totalReviews ?? 0} reviews · {stats?.totalPrescriptions ?? 0} prescriptions · {stats?.cancellationRate ?? 0}% cancelled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── System health strip ──────────────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <HealthAndSafetyIcon color="primary" />
          <Typography variant="subtitle2" sx={{ mr: 2 }}>System Health</Typography>
          <Chip
            size="small"
            color={health?.mongo?.up ? 'success' : 'error'}
            label={`MongoDB · ${health?.mongo?.up ? 'up' : 'down'}`}
          />
          <Chip
            size="small"
            color={health?.mailer?.configured ? 'success' : 'default'}
            label={`Mailer · ${health?.mailer?.configured ? 'configured' : 'not set'}`}
          />
          <Chip
            size="small"
            color={health?.ml?.enabled ? 'success' : 'default'}
            label={`ML service · ${health?.ml?.enabled ? 'enabled' : 'fallback only'}`}
          />
          <Chip
            size="small"
            color={health?.razorpay?.liveMode ? 'success' : 'warning'}
            label={`Razorpay · ${health?.razorpay?.liveMode ? 'live' : 'demo mode'}`}
          />
        </CardContent>
      </Card>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* Chart 1: Appointment Status Pie */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Appointment Status Distribution">
            {pieData.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="text.secondary">No appointment data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="35%"
                    outerRadius="65%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        {/* Chart 2: Appointments Bar (last N days) */}
        <Grid item xs={12} md={6}>
          <ChartCard title={`Appointments – Last ${days} Days`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ReTooltip />
                <Bar dataKey="count" fill={CHART_BLUE} radius={[4, 4, 0, 0]} label={<CustomBarLabel />} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Chart 3: Popular Specializations (horizontal bars) */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Top Specializations by Appointments">
            {specData.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={specData}
                  layout="vertical"
                  margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <ReTooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {specData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        {/* Chart 4: Doctor Performance Line */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Top Doctors – Completed Appointments">
            {perfData.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ReTooltip />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke={LINE_GREEN}
                    strokeWidth={2}
                    dot={{ r: 5, fill: LINE_GREEN }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        {/* Chart 5: Revenue trend */}
        <Grid item xs={12} md={8}>
          <ChartCard title={`Revenue – Last ${days} Days`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(stats?.revenueTrend ?? []).map((d) => ({
                date:   d.date.slice(5),
                amount: Number(d.amount),
              }))} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtRevenue} />
                <ReTooltip formatter={(v) => fmtRevenue(Number(v))} />
                <Area type="monotone" dataKey="amount"
                      stroke="#8b5cf6" strokeWidth={2}
                      fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Top-rated doctors */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="600" mb={1}>
                Top-rated Doctors
              </Typography>
              {(stats?.topRatedDoctors ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No reviews yet.</Typography>
              ) : (
                <List dense disablePadding>
                  {stats.topRatedDoctors.map((d, i) => (
                    <ListItem key={d.doctorId} disablePadding sx={{ py: 0.75 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: BAR_COLORS[i % BAR_COLORS.length], width: 32, height: 32, fontSize: 14 }}>
                          {(d.name?.[0] ?? 'D').toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`Dr. ${d.name}`}
                        secondary={d.specialization}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={700} color="warning.main">
                          ★ {d.rating?.toFixed?.(1) ?? d.rating}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          ({d.reviewCount})
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Reviews */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="600" mb={1}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RateReviewIcon color="primary" fontSize="small" /> Recent Reviews
              </Typography>
              {(stats?.recentReviews ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No reviews yet.</Typography>
              ) : (
                stats.recentReviews.map((r, i) => (
                  <Box key={i} sx={{ py: 1, borderBottom: i < stats.recentReviews.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating value={r.rating} readOnly size="small" />
                        <Typography variant="body2" fontWeight={600}>
                          {r.patientName} → Dr. {r.doctorName}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.disabled">{fromNow(r.createdAt)}</Typography>
                    </Box>
                    {r.comment && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        “{r.comment}”
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Activity feed */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="600" mb={1}>
                Live Activity
              </Typography>
              {activity.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No activity yet.</Typography>
              ) : (
                <List dense disablePadding>
                  {activity.map((e, i) => (
                    <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32, color: ACTIVITY_COLOR[e.type] ?? '#999' }}>
                        {ACTIVITY_ICON[e.type] ?? <EventIcon fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={e.text}
                        secondary={fromNow(e.at)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Container>
  );
}
