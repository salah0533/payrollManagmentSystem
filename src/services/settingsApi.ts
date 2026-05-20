import { apiRequest } from "@/lib/api-client";
import type { PayrollPolicy, PayrollPolicyPayload, WorkSchedule, WorkSchedulePayload } from "@/types/domain";

export const settingsApi = {
  getLegacySettings() {
    return apiRequest<Record<string, unknown>>("/settings/");
  },
  updateLegacySettings(payload: Record<string, unknown>) {
    return apiRequest<unknown>("/settings/", {
      method: "POST",
      body: payload,
    });
  },
  getWorkSchedule() {
    return apiRequest<WorkSchedule>("/settings/work-schedule");
  },
  listWorkSchedules() {
    return apiRequest<WorkSchedule[]>("/settings/work-schedules");
  },
  createWorkSchedule(payload: WorkSchedulePayload) {
    return apiRequest<WorkSchedule>("/settings/work-schedules", {
      method: "POST",
      body: payload,
    });
  },
  updateWorkSchedule(payload: WorkSchedulePayload) {
    return apiRequest<WorkSchedule>("/settings/work-schedule", {
      method: "PUT",
      body: payload,
    });
  },
  updateWorkScheduleById(scheduleId: number, payload: WorkSchedulePayload) {
    return apiRequest<WorkSchedule>(`/settings/work-schedules/${scheduleId}`, {
      method: "PUT",
      body: payload,
    });
  },
  getPayrollPolicy() {
    return apiRequest<PayrollPolicy>("/settings/payroll-policy");
  },
  getPayrollCurrency() {
    return apiRequest<{ default_currency: string }>("/settings/payroll-currency");
  },
  updatePayrollPolicy(payload: PayrollPolicyPayload) {
    return apiRequest<PayrollPolicy>("/settings/payroll-policy", {
      method: "PUT",
      body: payload,
    });
  },
};
