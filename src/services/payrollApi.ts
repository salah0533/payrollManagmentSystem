import { apiRequest, buildQueryString } from "@/lib/api-client";
import type {
  EmployeePayroll,
  EmployeeFinancialTotal,
  EmployeeLedgerResponse,
  LedgerTransaction,
  LedgerTransactionPayload,
  LedgerTransactionUpdatePayload,
  PayrollEmployeeHistoryResponse,
  PayrollBalanceReport,
  PayrollDiscrepancy,
  PayrollHistory,
  PayrollPeriod,
} from "@/types/domain";

export const payrollApi = {
  listPeriods() {
    return apiRequest<PayrollPeriod[]>("/payroll/periods");
  },
  listSelfPeriods() {
    return apiRequest<PayrollPeriod[]>("/me/payroll-periods");
  },
  getPeriod(periodId: number) {
    return apiRequest<PayrollPeriod>(`/payroll/period/${periodId}`);
  },
  getReport(periodId?: number) {
    const query = periodId ? `?period_id=${periodId}` : "";
    return apiRequest<PayrollBalanceReport>(`/payroll/report${query}`);
  },
  getEmployeeHistory(employeeId: number, page = 1, pageSize = 20) {
    const query = buildQueryString({ page, page_size: pageSize });
    return apiRequest<PayrollEmployeeHistoryResponse>(`/payroll/employee-history/${employeeId}${query}`);
  },
  getSelfReport(periodId?: number) {
    const query = periodId ? `?period_id=${periodId}` : "";
    return apiRequest<PayrollBalanceReport>(`/me/payroll-report${query}`);
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
  lockPeriod(periodId: number) {
    return apiRequest<PayrollPeriod>(`/payroll/period/${periodId}/lock`, {
      method: "POST",
    });
  },
  unlockPeriod(periodId: number) {
    return apiRequest<PayrollPeriod>(`/payroll/period/${periodId}/unlock`, {
      method: "POST",
    });
  },
  getLedger(employeeId: number, params: { page?: number; pageSize?: number; startDate?: string; endDate?: string; sort?: "asc" | "desc" } = {}) {
    const query = buildQueryString({
      page: params.page,
      page_size: params.pageSize,
      start_date: params.startDate,
      end_date: params.endDate,
      sort: params.sort,
    });
    return apiRequest<EmployeeLedgerResponse>(`/payroll/ledger/${employeeId}${query}`);
  },
  getTotal(employeeId: number) {
    return apiRequest<EmployeeFinancialTotal>(`/payroll/total/${employeeId}`);
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
  addTransaction(payload: LedgerTransactionPayload) {
    return apiRequest<LedgerTransaction>("/payroll/transaction", {
      method: "POST",
      body: payload,
    });
  },
  updateTransaction(transactionId: number, payload: LedgerTransactionUpdatePayload) {
    return apiRequest<LedgerTransaction>(`/payroll/transaction/${transactionId}`, {
      method: "PUT",
      body: payload,
    });
  },
  deleteTransaction(transactionId: number) {
    return apiRequest<{ deleted: boolean; id: number }>(`/payroll/transaction/${transactionId}`, {
      method: "DELETE",
    });
  },
};
