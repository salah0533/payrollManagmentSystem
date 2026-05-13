import { apiRequest } from "@/lib/api-client";
import type { DashboardStats } from "@/types/domain";

export const dashboardApi = {
  getStats() {
    return apiRequest<DashboardStats>("/stat/dashbord/cards");
  },
};
