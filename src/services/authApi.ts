import { apiRequest } from "@/lib/api-client";
import type { AuthTokens, CurrentUser, LanguageCode } from "@/types/domain";

export const authApi = {
  login(payload: { identifier: string; password: string }) {
    return apiRequest<AuthTokens>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },
  getMe(accessToken?: string) {
    return apiRequest<CurrentUser>("/auth/me", {
      accessToken,
    });
  },
  changePassword(payload: { current_password: string; new_password: string }) {
    return apiRequest<null>("/auth/change-password", {
      method: "POST",
      body: payload,
    });
  },
  updateLanguage(language: LanguageCode) {
    return apiRequest<CurrentUser>("/auth/language", {
      method: "PATCH",
      body: { language },
    });
  },
  logout() {
    return apiRequest<unknown>("/auth/logout", {
      method: "POST",
    });
  },
};
