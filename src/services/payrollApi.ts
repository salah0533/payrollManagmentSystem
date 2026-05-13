import { apiRequest } from "@/lib/api-client";
import type {
  EmployeePayroll,
  PayrollAdjustmentPayload,
  PayrollDiscrepancy,
  PayrollHistory,
  PayrollPeriod,
} from "@/types/domain";

export const payrollApi = {
  getPeriod(periodId: number) {
    return apiRequest<PayrollPeriod>(`/payroll/period/${periodId}`);
  },
  getEmployeePayroll(employeeId: number, periodId: number) {
    return apiRequest<EmployeePayroll>(`/payroll/employee/${employeeId}/${periodId}`);
  },
  getSelfPayroll(periodId: number) {
    return apiRequest<EmployeePayroll>(`/me/payroll?period_id=${periodId}`);
  },
  recalculateEmployee(employeeId: number, periodId: number) {
    return apiRequest<EmployeePayroll>(`/payroll/recalculate/${employeeId}/${periodId}`, {
      method: "POST",
    });
  },
  recalculatePeriod(periodId: number) {
    return apiRequest<EmployeePayroll[]>(`/payroll/recalculate-period/${periodId}`, {
      method: "POST",
    });
  },
  approve(employeePayrollId: number) {
    return apiRequest<EmployeePayroll>(`/payroll/approve/${employeePayrollId}`, {
      method: "POST",
    });
  },
  markPaid(employeePayrollId: number) {
    return apiRequest<EmployeePayroll>(`/payroll/mark-paid/${employeePayrollId}`, {
      method: "POST",
    });
  },
  getHistory(employeePayrollId: number) {
    return apiRequest<PayrollHistory[]>(`/payroll/history/${employeePayrollId}`);
  },
  getDiscrepancies(periodId: number) {
    return apiRequest<PayrollDiscrepancy[]>(`/payroll/discrepancies/${periodId}`);
  },
  resolveDiscrepancy(discrepancyId: number, resolutionNote: string) {
    return apiRequest<PayrollDiscrepancy>(`/payroll/discrepancy/${discrepancyId}/resolve`, {
      method: "POST",
      body: { resolution_note: resolutionNote },
    });
  },
  addAdjustment(payload: PayrollAdjustmentPayload) {
    return apiRequest<unknown>("/payroll/adjustment", {
      method: "POST",
      body: payload,
    });
  },
};
