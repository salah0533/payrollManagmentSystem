import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { configureApiClient } from "@/lib/api-client";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "@/lib/auth-storage";
import { changeAppLanguage } from "@/lib/i18n";
import { getNotificationsPath, getRoleHomePath } from "@/lib/roles";
import { authApi } from "@/services/authApi";
import { notificationApi } from "@/services/notificationApi";
import type { CurrentUser, LanguageCode } from "@/types/domain";

type AuthContextValue = {
  token: string | null;
  refreshToken: string | null;
  currentUser: CurrentUser | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  unreadNotificationCount: number;
  login: (payload: { identifier: string; password: string }) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<CurrentUser | null>;
  changePassword: (payload: { current_password: string; new_password: string }) => Promise<CurrentUser | null>;
  updateLanguagePreference: (language: LanguageCode) => Promise<CurrentUser | null>;
  refreshUnreadNotificationCount: () => Promise<number>;
  clearSession: (redirectToLogin?: boolean) => void;
  notificationsPath: string;
  homePath: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function canReadOwnNotifications(user: CurrentUser | null) {
  return Boolean(user?.permissions.includes("notifications.read_own"));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(
    (redirectToLogin = true) => {
      clearStoredSession();
      setToken(null);
      setRefreshToken(null);
      setCurrentUser(null);
      setUnreadNotificationCount(0);

      if (redirectToLogin) {
        startTransition(() => {
          navigate("/login", {
            replace: true,
            state: { from: location.pathname + location.search },
          });
        });
      }
    },
    [location.pathname, location.search, navigate],
  );

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!token || !canReadOwnNotifications(currentUser) || currentUser?.must_change_password) {
      setUnreadNotificationCount(0);
      return 0;
    }

    const unread = await notificationApi.getUnreadCount();
    setUnreadNotificationCount(unread.unread_count);
    return unread.unread_count;
  }, [currentUser, token]);

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      setCurrentUser(null);
      return null;
    }

    const user = await authApi.getMe();
    await changeAppLanguage(user.language);
    setCurrentUser(user);

    if (user.must_change_password || !canReadOwnNotifications(user)) {
      setUnreadNotificationCount(0);
    } else {
      await refreshUnreadNotificationCount();
    }

    return user;
  }, [refreshUnreadNotificationCount, token]);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => token,
      onUnauthorized: () => clearSession(true),
      onForbidden: () => {
        if (location.pathname !== "/forbidden") {
          startTransition(() => navigate("/forbidden", { replace: true }));
        }
      },
    });
  }, [clearSession, location.pathname, navigate, token]);

  useEffect(() => {
    const restoreSession = async () => {
      const stored = loadStoredSession();
      if (!stored) {
        setIsLoading(false);
        return;
      }

      setToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);

      try {
        const user = await authApi.getMe(stored.accessToken);
        await changeAppLanguage(user.language);
        setCurrentUser(user);

        if (!user.must_change_password && canReadOwnNotifications(user)) {
          const unread = await notificationApi.getUnreadCount(stored.accessToken);
          setUnreadNotificationCount(unread.unread_count);
        }
      } catch {
        clearSession(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [clearSession]);

  const login = useCallback(async (payload: { identifier: string; password: string }) => {
    const session = await authApi.login(payload);
    saveStoredSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });

    setToken(session.access_token);
    setRefreshToken(session.refresh_token);

    const user = await authApi.getMe(session.access_token);
    await changeAppLanguage(user.language);
    setCurrentUser(user);

    if (!user.must_change_password && canReadOwnNotifications(user)) {
      const unread = await notificationApi.getUnreadCount(session.access_token);
      setUnreadNotificationCount(unread.unread_count);
    } else {
      setUnreadNotificationCount(0);
    }

    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Ignore logout network failures because the backend logout is stateless.
    } finally {
      clearSession(true);
    }
  }, [clearSession, token]);

  const changePassword = useCallback(
    async (payload: { current_password: string; new_password: string }) => {
      await authApi.changePassword(payload);
      return refreshCurrentUser();
    },
    [refreshCurrentUser],
  );

  const updateLanguagePreference = useCallback(
    async (language: LanguageCode) => {
      if (!token) {
        return null;
      }

      const user = await authApi.updateLanguage(language);
      await changeAppLanguage(user.language);
      setCurrentUser(user);
      return user;
    },
    [token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      refreshToken,
      currentUser,
      roles: currentUser?.roles ?? [],
      permissions: currentUser?.permissions ?? [],
      isAuthenticated: Boolean(token && currentUser),
      isLoading,
      unreadNotificationCount,
      login,
      logout,
      refreshCurrentUser,
      updateLanguagePreference,
      changePassword,
      refreshUnreadNotificationCount,
      clearSession,
      notificationsPath: getNotificationsPath(currentUser),
      homePath: getRoleHomePath(currentUser),
    }),
    [
      changePassword,
      clearSession,
      currentUser,
      isLoading,
      login,
      logout,
      refreshCurrentUser,
      refreshToken,
      refreshUnreadNotificationCount,
      token,
      unreadNotificationCount,
      updateLanguagePreference,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
