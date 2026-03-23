import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { getToken, setToken, removeToken, getUser } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getUser());
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/signup', { email, password });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    navigate('/admin/login');
  };

  // Keep token validated on init — if getToken() exists but getUser() returned null, clear it
  if (getToken() && !getUser()) {
    removeToken();
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
