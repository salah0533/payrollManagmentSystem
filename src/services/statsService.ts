import { apiClient } from '@/services/apiClient';
import type { DashboardOverview } from '@/types/api';

export const statsService = {
  overview: () => apiClient.get<DashboardOverview>('/stat/dashboard/overview'),
};
