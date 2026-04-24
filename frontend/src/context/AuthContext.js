import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
const AuthContext = createContext(null);
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = localStorage.getItem('rg_token'), u = localStorage.getItem('rg_user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!token || !user) { if (socket) { socket.disconnect(); setSocket(null); } return; }
    const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket','polling'] });
    s.on('connect', () => console.log('Socket connected'));
    s.on('connect_error', e => console.error('Socket error:', e.message));
    setSocket(s);
    return () => s.disconnect();
  }, [token]); // eslint-disable-line
  const login = useCallback((userData, authToken) => {
    setUser(userData); setToken(authToken);
    localStorage.setItem('rg_token', authToken);
    localStorage.setItem('rg_user', JSON.stringify(userData));
  }, []);
  const logoutUser = useCallback(async () => {
    try { const { logout } = await import('../api/client'); await logout(); } catch (_) {}
    setUser(null); setToken(null);
    localStorage.removeItem('rg_token'); localStorage.removeItem('rg_user');
    if (socket) socket.disconnect(); setSocket(null);
  }, [socket]);
  return <AuthContext.Provider value={{ user, token, socket, login, logout: logoutUser, loading }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be inside AuthProvider'); return ctx; }
