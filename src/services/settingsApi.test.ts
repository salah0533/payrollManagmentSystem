import { afterEach, describe, expect, it, vi } from "vitest";

import { settingsApi } from "@/services/settingsApi";

function mockApiResponse(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ status: true, message: "ok", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("settingsApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists work schedules from the new collection endpoint", async () => {
    mockApiResponse([
      {
        id: 1,
        name: "Morning",
        start_time: "08:00:00",
        end_time: "17:00:00",
        break_start_time: "12:00:00",
        break_end_time: "13:00:00",
        break_minutes: 60,
        weekly_off_days: ["friday", "saturday"],
        timezone: "Africa/Algiers",
        is_default: true,
        created_at: "2026-05-19T00:00:00Z",
        updated_at: "2026-05-19T00:00:00Z",
      },
    ]);

    const schedules = await settingsApi.listWorkSchedules();

    expect(schedules).toHaveLength(1);
    expect(schedules[0].name).toBe("Morning");
  });

  it("sends schedule updates to the schedule-by-id endpoint", async () => {
    mockApiResponse({ id: 2, name: "Evening" });

    await settingsApi.updateWorkScheduleById(2, {
      name: "Evening",
      start_time: "10:00:00",
      end_time: "19:00:00",
      break_start_time: "14:00:00",
      break_end_time: "15:00:00",
      break_minutes: 60,
      weekly_off_days: ["friday", "saturday"],
      timezone: "Africa/Algiers",
      is_default: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/work-schedules/2"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("\"name\":\"Evening\""),
      }),
    );
  });

  it("returns the monthly payroll calculation mode from the payroll policy endpoint", async () => {
    mockApiResponse({
      id: 1,
      name: "default",
      payroll_cycle: "monthly",
      minimum_overtime_minutes: 30,
      minimum_auto_pay_minutes: 0,
      allowed_late_minutes: 0,
      default_currency: "DZD",
      significant_change_threshold: 1,
      paid_vacation_counts_for_daily: true,
      overtime_enabled: true,
      monthly_payroll_calculation_mode: "calendar_days",
      auto_recalculate_draft_payroll: true,
      lock_payroll_after_payment: true,
      allow_vacation_carryover: true,
      max_vacation_carryover_days: null,
      carryover_expiry_month: null,
      carryover_expiry_day: null,
      reserve_vacation_days_on_pending: false,
      created_at: "2026-05-19T00:00:00Z",
      updated_at: "2026-05-19T00:00:00Z",
    });

    const policy = await settingsApi.getPayrollPolicy();

    expect(policy.monthly_payroll_calculation_mode).toBe("calendar_days");
  });

  it("sends the monthly payroll calculation mode when updating payroll policy", async () => {
    mockApiResponse({ id: 1, monthly_payroll_calculation_mode: "working_days" });

    await settingsApi.updatePayrollPolicy({
      name: "default",
      payroll_cycle: "monthly",
      minimum_overtime_minutes: 30,
      minimum_auto_pay_minutes: 0,
      allowed_late_minutes: 0,
      default_currency: "DZD",
      significant_change_threshold: 1,
      paid_vacation_counts_for_daily: true,
      overtime_enabled: true,
      monthly_payroll_calculation_mode: "working_days",
      auto_recalculate_draft_payroll: true,
      lock_payroll_after_payment: true,
      allow_vacation_carryover: true,
      max_vacation_carryover_days: null,
      carryover_expiry_month: null,
      carryover_expiry_day: null,
      reserve_vacation_days_on_pending: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/payroll-policy"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("\"monthly_payroll_calculation_mode\":\"working_days\""),
      }),
    );
  });
});
