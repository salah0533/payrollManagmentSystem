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
      late_makeup_enabled: true,
      late_deduction_enabled: false,
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
      late_makeup_enabled: true,
      late_deduction_enabled: false,
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
