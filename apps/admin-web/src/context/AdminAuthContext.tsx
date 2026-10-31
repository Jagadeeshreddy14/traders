import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi } from '../services/api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'DELIVERY_PARTNER';
  isActive: boolean;
  isVerified: boolean;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const cached = localStorage.getItem('pt_admin_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAdminSession = async () => {
      const token = localStorage.getItem('pt_admin_access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await adminApi.get('/auth/admin-check');
        const user = response.data?.data?.user;
        if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
          setAdminUser(user);
          localStorage.setItem('pt_admin_user', JSON.stringify(user));
        } else {
          throw new Error('Not authorized as administrator');
        }
      } catch (err) {
        localStorage.removeItem('pt_admin_access_token');
        localStorage.removeItem('pt_admin_refresh_token');
        localStorage.removeItem('pt_admin_user');
        setAdminUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAdminSession();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await adminApi.post('/auth/login', { email, password });
      const { user: userData, tokens } = response.data.data;

      // Strict role enforcement for administrative dashboard
      if (userData.role !== 'ADMIN' && userData.role !== 'STAFF') {
        throw new Error('Access denied: You do not possess administrator credentials for Paven Traders.');
      }

      localStorage.setItem('pt_admin_access_token', tokens.accessToken);
      localStorage.setItem('pt_admin_refresh_token', tokens.refreshToken);
      localStorage.setItem('pt_admin_user', JSON.stringify(userData));

      setAdminUser(userData);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Admin authentication failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('pt_admin_refresh_token');
      await adminApi.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.warn('Admin logout warning:', err);
    } finally {
      localStorage.removeItem('pt_admin_access_token');
      localStorage.removeItem('pt_admin_refresh_token');
      localStorage.removeItem('pt_admin_user');
      setAdminUser(null);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, error, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
