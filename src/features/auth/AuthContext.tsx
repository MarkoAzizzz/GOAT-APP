import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../../lib/storage';
import { ApiError } from '../../lib/api';
import { AuthUser, login as loginRequest } from './authService';

const ACCESS_KEY = 'goat.access';
const REFRESH_KEY = 'goat.refresh';
const USER_KEY = 'goat.user';

type AuthState = {
  status: 'checking' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const [storedAccess, storedUser] = await Promise.all([
        getSecureItem(ACCESS_KEY),
        getSecureItem(USER_KEY),
      ]);
      if (storedAccess && storedUser) {
        setUser(JSON.parse(storedUser));
        setStatus('signedIn');
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
    setStatus('signedIn');
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      deleteSecureItem(ACCESS_KEY),
      deleteSecureItem(REFRESH_KEY),
      deleteSecureItem(USER_KEY),
    ]);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
