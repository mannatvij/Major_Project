import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Box,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
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

// ─── AdminDashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [days,    setDays]    = useState(7);

  const fetchStats = useCallback(async (d) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAPI.getStats(d);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(days); }, [days, fetchStats]);

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
            label="Total Revenue"
            value={fmtRevenue(stats?.totalRevenue ?? 0)}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

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

      </Grid>
    </Container>
  );
}
