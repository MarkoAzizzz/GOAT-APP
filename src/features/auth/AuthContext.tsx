import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../../lib/storage';
import { API_BASE_URL, ApiError, setUnauthorizedHandler } from '../../lib/api';
import { AuthUser, login as loginRequest } from './authService';

const ACCESS_KEY = 'goat.access';
const REFRESH_KEY = 'goat.refresh';
const USER_KEY = 'goat.user';

// Refresh a bit before the access token actually expires so an in-flight
// request never races the clock; if it's already past that point (e.g. the
// app was backgrounded through the deadline), refresh immediately.
const REFRESH_MARGIN_MS = 60_000;

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// No `atob` on native/Hermes, so JWT payloads are base64-decoded by hand
// here rather than pulling in a dependency for one field (`exp`).
function base64Decode(input: string): string {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    if (char === '=') break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(base64Decode(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

type AuthState = {
  status: 'checking' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  // Hoisted (function declaration, not const) so refreshAccessToken below
  // can reference it before its textual definition — the two are mutually
  // recursive (each refresh reschedules the next one).
  function scheduleRefresh(token: string) {
    clearRefreshTimer();
    const expiryMs = decodeJwtExpiryMs(token);
    if (!expiryMs) return;
    const delay = Math.max(expiryMs - Date.now() - REFRESH_MARGIN_MS, 0);
    refreshTimer.current = setTimeout(() => {
      refreshAccessToken();
    }, delay);
  }

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefresh = await getSecureItem(REFRESH_KEY);
    if (!storedRefresh) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: storedRefresh }),
      });
      if (!response.ok) throw new Error('Refresh token rejected');
      const json = await response.json();
      const newAccess: string = json.access;
      // ROTATE_REFRESH_TOKENS is on server-side, so a new refresh token
      // comes back too — the old one is blacklisted the moment this succeeds.
      const newRefresh: string = json.refresh ?? storedRefresh;

      await Promise.all([setSecureItem(ACCESS_KEY, newAccess), setSecureItem(REFRESH_KEY, newRefresh)]);
      setAccessToken(newAccess);
      scheduleRefresh(newAccess);
      return newAccess;
    } catch {
      // Refresh token itself is invalid/expired/blacklisted — the session is over.
      clearRefreshTimer();
      await Promise.all([deleteSecureItem(ACCESS_KEY), deleteSecureItem(REFRESH_KEY), deleteSecureItem(USER_KEY)]);
      setUser(null);
      setAccessToken(null);
      setStatus('signedOut');
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(refreshAccessToken);
    return () => setUnauthorizedHandler(null);
  }, [refreshAccessToken]);

  useEffect(() => {
    (async () => {
      const [storedAccess, storedUser] = await Promise.all([
        getSecureItem(ACCESS_KEY),
        getSecureItem(USER_KEY),
      ]);
      if (storedAccess && storedUser) {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccess);
        setStatus('signedIn');
        scheduleRefresh(storedAccess);
      } else {
        setStatus('signedOut');
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    await Promise.all([
      setSecureItem(ACCESS_KEY, result.access),
      setSecureItem(REFRESH_KEY, result.refresh),
      setSecureItem(USER_KEY, JSON.stringify(result.user)),
    ]);
    setUser(result.user);
    setAccessToken(result.access);
    setStatus('signedIn');
    scheduleRefresh(result.access);
  }, []);

  const logout = useCallback(async () => {
    clearRefreshTimer();
    await Promise.all([
      deleteSecureItem(ACCESS_KEY),
      deleteSecureItem(REFRESH_KEY),
      deleteSecureItem(USER_KEY),
    ]);
    setUser(null);
    setAccessToken(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, accessToken, login, logout }),
    [status, user, accessToken, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
