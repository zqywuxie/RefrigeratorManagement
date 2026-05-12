import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, loginUser, registerUser } from './api';

export type AuthUser = {
  username: string;
  role: 'root' | 'user';
};

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isRoot: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, role: AuthUser['role']) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('biofridge_token'));
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('biofridge_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('biofridge_token', token);
    } else {
      localStorage.removeItem('biofridge_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('biofridge_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('biofridge_user');
    }
  }, [user]);

  useEffect(() => {
    const clearSession = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('biofridge:unauthorized', clearSession);

    if (!token) {
      setUser(null);
      setLoading(false);
    } else {
      fetchCurrentUser()
        .then((data) => setUser(data.user))
        .catch(clearSession)
        .finally(() => setLoading(false));
    }

    return () => window.removeEventListener('biofridge:unauthorized', clearSession);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isRoot: user?.role === 'root',
      login: async (username, password) => {
        const data = await loginUser(username, password);
        setToken(data.token);
        setUser(data.user);
      },
      logout: () => {
        setToken(null);
        setUser(null);
        setLoading(false);
      },
      register: async (username, password, role) => {
        await registerUser(username, password, role);
      },
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
