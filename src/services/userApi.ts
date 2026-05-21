import { apiRequest } from "@/lib/api-client";
import { buildQueryString } from "@/lib/api-client";
import type { Employee, LanguageCode, Role, User } from "@/types/domain";

export const userApi = {
  list() {
    return apiRequest<User[]>("/users/");
  },
  listRoles() {
    return apiRequest<Role[]>("/users/roles");
  },
  listAvailableEmployees(includeUserId?: number | null) {
    return apiRequest<Employee[]>(`/users/available-employees${buildQueryString({ include_user_id: includeUserId })}`);
  },
  create(payload: {
    username: string;
    email?: string | null;
    password: string;
    employee_id?: number | null;
    language: LanguageCode;
    role_ids: number[];
    is_active: boolean;
    must_change_password: boolean;
  }) {
    return apiRequest<User>("/users/", {
      method: "POST",
      body: payload,
    });
  },
  update(
    userId: number,
    payload: {
      username?: string;
      email?: string | null;
      employee_id?: number | null;
      language?: LanguageCode;
      is_active?: boolean;
      must_change_password?: boolean;
    },
  ) {
    return apiRequest<User>(`/users/${userId}`, {
      method: "PUT",
      body: payload,
    });
  },
  activate(userId: number) {
    return apiRequest<User>(`/users/${userId}/activate`, {
      method: "POST",
    });
  },
  deactivate(userId: number) {
    return apiRequest<User>(`/users/${userId}/deactivate`, {
      method: "POST",
    });
  },
  remove(userId: number) {
    return apiRequest<null>(`/users/${userId}`, {
      method: "DELETE",
    });
  },
  assignRoles(userId: number, roleIds: number[]) {
    return apiRequest<User>(`/users/${userId}/roles`, {
      method: "POST",
      body: { role_ids: roleIds },
    });
  },
  removeRole(userId: number, roleId: number) {
    return apiRequest<User>(`/users/${userId}/roles/${roleId}`, {
      method: "DELETE",
    });
  },
  resetPassword(userId: number, payload: { new_password: string; must_change_password: boolean }) {
    return apiRequest<User>(`/users/${userId}/reset-password`, {
      method: "POST",
      body: payload,
    });
  },
};
