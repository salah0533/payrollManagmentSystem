import { apiClient } from '@/services/apiClient';
import type { LookupItem } from '@/types/api';

export const lookupService = {
  attendanceTypes: () => apiClient.get<LookupItem[]>('/att_types/'),
  paymentTypes: () => apiClient.get<LookupItem[]>('/payment_types/'),
  salaryTypes: () => apiClient.get<LookupItem[]>('/salary_types/'),
  vacationTypes: () => apiClient.get<LookupItem[]>('/vacation_types/'),
  vacationStatuses: () => apiClient.get<LookupItem[]>('/vacation_status/'),
};
