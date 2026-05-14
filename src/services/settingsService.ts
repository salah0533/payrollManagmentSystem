import { apiClient } from '@/services/apiClient';
import type { PayrollPolicyRead, SettingsRead, WorkScheduleRead } from '@/types/api';

export const settingsService = {
  legacy: () => apiClient.get<SettingsRead>('/settings/'),
  updateLegacy: (entryTime: string, exitTime: string) =>
    apiClient.post('/settings/', { entryTime, exitTime }),
  workSchedule: () => apiClient.get<WorkScheduleRead>('/settings/work-schedule'),
  updateWorkSchedule: (payload: Partial<WorkScheduleRead>) => apiClient.put<WorkScheduleRead>('/settings/work-schedule', payload),
  payrollPolicy: () => apiClient.get<PayrollPolicyRead>('/settings/payroll-policy'),
  updatePayrollPolicy: (payload: Partial<PayrollPolicyRead>) => apiClient.put<PayrollPolicyRead>('/settings/payroll-policy', payload),
};
