import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { apiClient } from '@/services/apiClient';
import type { AuthUser, RoleCode } from '@/types/api';
import { getPrimaryRole } from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  primaryRole: RoleCode | null;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthUser | null>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: RoleCode) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await authService.logout();
    apiClient.clearTokens();
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!apiClient.getAccessToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const currentUser = await authService.me();
      setUser(currentUser);
      return currentUser;
    } catch {
      apiClient.clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const tokens = await authService.login(identifier, password);
    apiClient.setTokens(tokens);
    const currentUser = await authService.me();
    setUser(currentUser);
    return currentUser;
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const handleLogout = () => {
      apiClient.clearTokens();
      setUser(null);
    };
    window.addEventListener('payrollpro:logout', handleLogout);
    return () => window.removeEventListener('payrollpro:logout', handleLogout);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      primaryRole: getPrimaryRole(user),
      login,
      logout,
      refreshMe,
      hasPermission: (permission: string) => Boolean(user?.permissions.includes(permission)),
      hasRole: (role: RoleCode) => Boolean(user?.roles.includes(role)),
    }),
    [loading, login, logout, refreshMe, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
