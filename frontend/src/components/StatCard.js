import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Box, Typography, alpha, useTheme } from '@mui/material';

function useCountUp(target, enabled = true, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    if (!enabled || typeof target !== 'number' || !Number.isFinite(target)) return;
    const start = performance.now();
    const from  = 0;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, enabled, duration]);
  return value;
}

export default function StatCard({
  title, value, icon, accent = '#1976d2', subtitle, onClick, index = 0, loading = false,
}) {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === 'dark';
  const numeric  = typeof value === 'number' ? value : null;
  const animated = useCountUp(numeric ?? 0, numeric !== null && !loading);
  const display  = loading ? '…' : (numeric !== null ? animated : value);

  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${alpha(accent, isDark ? 0.35 : 0.18)}`,
        background: isDark
          ? `linear-gradient(135deg, ${alpha(accent, 0.18)} 0%, ${alpha(accent, 0.04)} 100%)`
          : `linear-gradient(135deg, ${alpha(accent, 0.14)} 0%, ${alpha(accent, 0.03)} 100%)`,
        opacity: 0,
        animation: `cardIn 0.5s ${index * 0.08}s ease both`,
        '@keyframes cardIn': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: `0 16px 32px ${alpha(accent, isDark ? 0.35 : 0.22)}`,
        } : {},
      }}
    >
      <Box sx={{
        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
        borderRadius: '50%', background: alpha(accent, isDark ? 0.22 : 0.14),
        filter: 'blur(4px)',
      }} />
      <CardContent sx={{ position: 'relative', py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: alpha(accent, isDark ? 0.28 : 0.18),
            color: accent,
            flexShrink: 0,
          }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: accent, lineHeight: 1.1 }}>
              {display}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
