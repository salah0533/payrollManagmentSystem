import { apiRequest } from "@/lib/api-client";
import type { AuthTokens, CurrentUser } from "@/types/domain";

export const authApi = {
  login(payload: { identifier: string; password: string }) {
    return apiRequest<AuthTokens>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },
  getMe() {
    return apiRequest<CurrentUser>("/auth/me");
  },
  changePassword(payload: { current_password: string; new_password: string }) {
    return apiRequest<null>("/auth/change-password", {
      method: "POST",
      body: payload,
    });
  },
  logout() {
    return apiRequest<unknown>("/auth/logout", {
      method: "POST",
    });
  },
};
