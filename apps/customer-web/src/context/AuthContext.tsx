import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF' | 'DELIVERY_PARTNER';
  isActive: boolean;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('pt_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('pt_access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data?.data?.user) {
          setUser(response.data.data.user);
          localStorage.setItem('pt_user', JSON.stringify(response.data.data.user));
        }
      } catch (err) {
        console.warn('Initial session validation error:', err);
        // Token was invalid or expired
        localStorage.removeItem('pt_access_token');
        localStorage.removeItem('pt_refresh_token');
        localStorage.removeItem('pt_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, tokens } = response.data.data;

      localStorage.setItem('pt_access_token', tokens.accessToken);
      localStorage.setItem('pt_refresh_token', tokens.refreshToken);
      localStorage.setItem('pt_user', JSON.stringify(userData));

      setUser(userData);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please verify your credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password, phone });
      const { user: userData, tokens } = response.data.data;

      localStorage.setItem('pt_access_token', tokens.accessToken);
      localStorage.setItem('pt_refresh_token', tokens.refreshToken);
      localStorage.setItem('pt_user', JSON.stringify(userData));

      setUser(userData);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please check your inputs.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('pt_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      localStorage.removeItem('pt_access_token');
      localStorage.removeItem('pt_refresh_token');
      localStorage.removeItem('pt_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
