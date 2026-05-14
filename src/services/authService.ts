import { apiClient } from '@/services/apiClient';
import type { AuthUser, TokenResponse } from '@/types/api';

export const authService = {
  login: (identifier: string, password: string) =>
    apiClient.post<TokenResponse>('/auth/login', { identifier, password }),
  me: () => apiClient.get<AuthUser>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  logout: () => apiClient.post('/auth/logout').catch(() => undefined),
};
