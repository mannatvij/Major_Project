import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, TextField, Button, Typography, Avatar,
  Grid, Card, CardContent, Chip, CircularProgress, Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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

function formatSpec(spec) {
  if (!spec) return '';
  return spec.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f7fa' }}>
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
                        bgcolor: isBot ? '#fff' : 'primary.main',
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
        <Box sx={{ p: 1.5, bgcolor: '#fff', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
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
      {doctors.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
            Recommended {formatSpec(spec)} Doctors
          </Typography>
          <Grid container spacing={2}>
            {doctors.map((doc) => (
              <Grid item xs={12} sm={6} key={doc.id}>
                <Card elevation={2} sx={{ '&:hover': { boxShadow: 5 }, transition: 'box-shadow .2s' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <LocalHospitalIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">Dr. {doc.name}</Typography>
                        <Chip label={doc.specialization} size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Experience: {doc.experience} yr{doc.experience !== 1 ? 's' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <CurrencyRupeeIcon fontSize="small" color="success" />
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        ₹{doc.fees} / consultation
                      </Typography>
                    </Box>
                    <Button variant="contained" fullWidth size="small"
                      sx={{ mt: 1.5, textTransform: 'none' }}
                      onClick={() => navigate(`/dashboard/book-appointment/${doc.id}`)}>
                      Book Appointment
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
}
