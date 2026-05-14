import { apiClient } from '@/services/apiClient';
import type { RoleRead, UserRead } from '@/types/api';

export interface UserCreatePayload {
  username: string;
  email?: string | null;
  password: string;
  employee_id?: number | null;
  role_ids: number[];
  is_active?: boolean;
  must_change_password?: boolean;
}

export interface UserUpdatePayload {
  username?: string;
  email?: string | null;
  employee_id?: number | null;
  is_active?: boolean;
  must_change_password?: boolean;
}

export const userService = {
  list: () => apiClient.get<UserRead[]>('/users/'),
  roles: () => apiClient.get<RoleRead[]>('/users/roles'),
  create: (payload: UserCreatePayload) => apiClient.post<UserRead>('/users/', payload),
  update: (id: number, payload: UserUpdatePayload) => apiClient.put<UserRead>(`/users/${id}`, payload),
  activate: (id: number) => apiClient.post<UserRead>(`/users/${id}/activate`),
  deactivate: (id: number) => apiClient.post<UserRead>(`/users/${id}/deactivate`),
  assignRoles: (id: number, roleIds: number[]) => apiClient.post<UserRead>(`/users/${id}/roles`, { role_ids: roleIds }),
  resetPassword: (id: number, newPassword: string, mustChangePassword = true) =>
    apiClient.post<UserRead>(`/users/${id}/reset-password`, {
      new_password: newPassword,
      must_change_password: mustChangePassword,
    }),
};
