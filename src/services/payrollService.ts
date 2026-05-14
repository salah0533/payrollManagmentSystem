import { apiClient } from '@/services/apiClient';
import type { CurrentPayrollRead, EmployeePayrollRead, PayrollPeriodRead } from '@/types/api';

export const payrollService = {
  periods: () => apiClient.get<PayrollPeriodRead[]>('/payroll/periods'),
  generateCurrent: (targetDate?: string, recalculate = true) =>
    apiClient.post<PayrollPeriodRead>('/payroll/periods/current', undefined, {
      target_date: targetDate,
      recalculate,
    }),
  period: (periodId: number) => apiClient.get<PayrollPeriodRead>(`/payroll/period/${periodId}`),
  recalculatePeriod: (periodId: number) =>
    apiClient.post<EmployeePayrollRead[]>(`/payroll/recalculate-period/${periodId}`),
  approve: (employeePayrollId: number) => apiClient.post<EmployeePayrollRead>(`/payroll/approve/${employeePayrollId}`),
  markPaid: (employeePayrollId: number) => apiClient.post<EmployeePayrollRead>(`/payroll/mark-paid/${employeePayrollId}`),
  currentMine: () => apiClient.get<CurrentPayrollRead>('/me/payroll/current'),
};
