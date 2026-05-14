import { apiClient } from '@/services/apiClient';
import type { EmployeeRead } from '@/types/api';

export const selfService = {
  profile: () => apiClient.get<EmployeeRead>('/me/profile'),
};
