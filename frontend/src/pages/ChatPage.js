import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, TextField, Button, Typography, Avatar,
  Grid, Card, CardContent, Chip, CircularProgress, Divider,
} from '@mui/material';
import SendIcon           from '@mui/icons-material/Send';
import SmartToyIcon       from '@mui/icons-material/SmartToy';
import PersonIcon         from '@mui/icons-material/Person';
import RestartAltIcon     from '@mui/icons-material/RestartAlt';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CurrencyRupeeIcon  from '@mui/icons-material/CurrencyRupee';
import WorkIcon           from '@mui/icons-material/Work';
import StarIcon           from '@mui/icons-material/Star';

// Per-specialty visuals
import FavoriteIcon              from '@mui/icons-material/Favorite';
import PsychologyIcon            from '@mui/icons-material/Psychology';
import AccessibilityNewIcon      from '@mui/icons-material/AccessibilityNew';
import SpaIcon                   from '@mui/icons-material/Spa';
import MedicalServicesIcon       from '@mui/icons-material/MedicalServices';
import RestaurantIcon            from '@mui/icons-material/Restaurant';
import HearingIcon               from '@mui/icons-material/Hearing';
import VisibilityIcon            from '@mui/icons-material/Visibility';
import ChildCareIcon             from '@mui/icons-material/ChildCare';
import SelfImprovementIcon       from '@mui/icons-material/SelfImprovement';

import { chatAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';

// Quick-pick symptom suggestions shown before first user message
const QUICK_PICKS = [
  'I have a headache and feel dizzy',
  'Chest pain and breathing difficulty',
  'Fever, cough and body ache',
  'Stomach pain and nausea',
  'Rash on skin and itching',
  'Back pain when I walk',
];

// Maps backend specializations to an icon + brand colour for consistent theming
// across the recommendation header, doctor cards and booking CTA.
const SPEC_META = {
  Cardiology:          { Icon: FavoriteIcon,         color: '#c62828' },
  Neurology:           { Icon: PsychologyIcon,       color: '#6a1b9a' },
  Orthopedics:         { Icon: AccessibilityNewIcon, color: '#e65100' },
  Dermatology:         { Icon: SpaIcon,              color: '#0277bd' },
  'General Physician': { Icon: MedicalServicesIcon,  color: '#1565c0' },
  Gastroenterology:    { Icon: RestaurantIcon,       color: '#2e7d32' },
  ENT:                 { Icon: HearingIcon,          color: '#00838f' },
  Ophthalmology:       { Icon: VisibilityIcon,       color: '#558b2f' },
  Pediatrics:          { Icon: ChildCareIcon,        color: '#00695c' },
  Psychiatry:          { Icon: SelfImprovementIcon,  color: '#4527a0' },
};
const DEFAULT_META = { Icon: MedicalServicesIcon, color: '#37474f' };

function metaFor(spec) {
  return SPEC_META[spec] ?? DEFAULT_META;
}

function renderContent(text) {
  // Bold **text** → <strong>
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function ChatPage() {
  const navigate              = useNavigate();
  const { error: showError }  = useSnackbar();
  const bottomRef             = useRef(null);

  const [sessionId, setSessionId]           = useState(null);
  const [messages, setMessages]             = useState([]);
  const [input, setInput]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [starting, setStarting]             = useState(true);
  const [doctors, setDoctors]               = useState([]);
  const [spec, setSpec]                     = useState(null);
  const [userHasSentMsg, setUserHasSentMsg] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, doctors, scrollToBottom]);

  const startSession = useCallback(async () => {
    setStarting(true);
    setMessages([]);
    setDoctors([]);
    setSpec(null);
    setUserHasSentMsg(false);
    try {
      const { data } = await chatAPI.startChat();
      setSessionId(data.sessionId);
      setMessages([data.message]);
    } catch {
      showError('Could not start the health assistant. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [showError]);

  useEffect(() => { startSession(); }, [startSession]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || !sessionId) return;

    setInput('');
    setUserHasSentMsg(true);
    setMessages((prev) => [...prev, { sender: 'patient', content: msg, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const { data } = await chatAPI.sendMessage(sessionId, msg);
      setMessages((prev) => [...prev, data.message]);
      if (data.recommendedDoctors?.length) {
        setDoctors(data.recommendedDoctors);
        setSpec(data.recommendedSpecialization);
      } else {
        setDoctors([]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const recMeta = spec ? metaFor(spec) : null;
  const RecIcon = recMeta?.Icon;

  return (
    <Container maxWidth="md" sx={{ pb: 4 }}>
      {/* Page title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">AI Health Assistant</Typography>
          <Typography variant="body2" color="text.secondary">
            Describe your symptoms — I'll suggest the right specialist.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RestartAltIcon />}
          onClick={startSession} disabled={starting || loading} sx={{ textTransform: 'none' }}>
          New Chat
        </Button>
      </Box>

      <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', height: '70vh', borderRadius: 2, overflow: 'hidden' }}>

        {/* ── Message list ───────────────────────────────────────────────── */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f5f7fa' }}>
          {starting ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isBot = msg.sender === 'bot';
                return (
                  <Box key={i} sx={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', mb: 1.5 }}>
                    {isBot && (
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1, mt: 0.5, flexShrink: 0 }}>
                        <SmartToyIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    )}
                    <Paper
                      elevation={1}
                      sx={{
                        px: 2, py: 1.5,
                        maxWidth: '75%',
                        bgcolor: isBot ? 'background.paper' : 'primary.main',
                        color:   isBot ? 'text.primary' : '#fff',
                        borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                        {renderContent(msg.content)}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.65, fontSize: 10 }}>
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                      </Typography>
                    </Paper>
                    {!isBot && (
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, ml: 1, mt: 0.5, flexShrink: 0 }}>
                        <PersonIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    )}
                  </Box>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1 }}>
                    <SmartToyIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Paper elevation={1} sx={{ px: 2, py: 1, borderRadius: '4px 16px 16px 16px' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {[0, 1, 2].map((n) => (
                        <Box key={n} sx={{
                          width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main',
                          animation: 'bounce 1.2s infinite',
                          animationDelay: `${n * 0.2}s`,
                          '@keyframes bounce': {
                            '0%, 80%, 100%': { transform: 'scale(0.8)', opacity: 0.5 },
                            '40%':           { transform: 'scale(1.2)', opacity: 1 },
                          },
                        }} />
                      ))}
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        Analysing…
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Quick picks — show only before user has typed anything */}
              {!userHasSentMsg && !loading && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Quick suggestions:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {QUICK_PICKS.map((q) => (
                      <Chip key={q} label={q} size="small" variant="outlined"
                        onClick={() => send(q)} clickable
                        sx={{ fontSize: 12, cursor: 'pointer' }} />
                    ))}
                  </Box>
                </Box>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </Box>

        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <Divider />
        <Box sx={{ p: 1.5, bgcolor: 'background.paper', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth multiline maxRows={3} size="small"
            placeholder="Describe your symptoms…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading || starting}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <Button
            variant="contained" onClick={() => send()}
            disabled={loading || starting || !input.trim()}
            sx={{ minWidth: 48, height: 40, borderRadius: 3, px: 2 }}
          >
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Paper>

      {/* ── Recommended doctors ─────────────────────────────────────────── */}
      {doctors.length > 0 && recMeta && (
        <Box sx={{ mt: 3 }}>
          {/* Recommendation banner with specialty icon */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              border: `1px solid ${recMeta.color}33`,
              bgcolor: `${recMeta.color}0d`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: recMeta.color, width: 44, height: 44 }}>
              <RecIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                Recommended specialist
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: recMeta.color, lineHeight: 1.2 }}>
                {spec}
              </Typography>
            </Box>
          </Paper>

          <Grid container spacing={2}>
            {doctors.map((doc) => {
              const meta = metaFor(doc.specialization ?? spec);
              const Icon = meta.Icon;
              return (
                <Grid item xs={12} sm={6} key={doc.id}>
                  <Card
                    elevation={2}
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'transform .2s, box-shadow .2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
                    }}
                  >
                    {/* Colored header */}
                    <Box sx={{
                      bgcolor: meta.color,
                      color: '#fff',
                      px: 2, py: 1.5,
                      display: 'flex', alignItems: 'center', gap: 1.5,
                    }}>
                      <Avatar sx={{
                        bgcolor: 'rgba(255,255,255,0.18)',
                        border: '2px solid rgba(255,255,255,0.4)',
                      }}>
                        <Icon sx={{ color: '#fff' }} />
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          Dr. {doc.name}
                        </Typography>
                        <Chip
                          label={doc.specialization}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.22)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 20,
                          }}
                        />
                      </Box>
                    </Box>

                    <CardContent sx={{ pb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <WorkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {doc.experience} yr{doc.experience !== 1 ? 's' : ''} experience
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        {doc.rating != null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon fontSize="small" sx={{ color: '#f9a825' }} />
                            <Typography variant="body2" color="text.secondary">
                              {doc.rating} / 5
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CurrencyRupeeIcon fontSize="small" sx={{ color: 'success.main' }} />
                          <Typography variant="body2" color="success.main" fontWeight={600}>
                            ₹{doc.fees}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<EventAvailableIcon />}
                        onClick={() => navigate(`/dashboard/book-appointment/${doc.id}`)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor: meta.color,
                          '&:hover': { bgcolor: meta.color, filter: 'brightness(0.9)' },
                        }}
                      >
                        Book Appointment
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Container>
  );
}
