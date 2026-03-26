import React, { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const { data } = await authAPI.login({ username, password });

    // data = { token, tokenType, expiresIn, username, role }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      username: data.username,
      role: data.role,
    }));

    setToken(data.token);
    setUser({ username: data.username, role: data.role });

    return data;
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password, role) => {
    const { data } = await authAPI.register({ username, email, password, role });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      username: data.username,
      role: data.role,
    }));

    setToken(data.token);
    setUser({ username: data.username, role: data.role });

    return data;
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────
  const isAuthenticated = Boolean(token);
  const isPatient = user?.role === 'PATIENT';
  const isDoctor  = user?.role === 'DOCTOR';
  const isAdmin   = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isPatient,
      isDoctor,
      isAdmin,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
