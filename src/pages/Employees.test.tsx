import { describe, expect, it } from "vitest";

import {
  canShowEmployeeDeleteAction,
  canSubmitGuardedDelete,
  isEmployeeCreateFormComplete,
  normalizeCompensationFormBySalaryType,
  normalizeNumericInputValue,
  shouldShowCompensationField,
  toEmployeePayload,
} from "@/pages/Employees";
import type { CurrentUser } from "@/types/domain";

describe("Employees auto attendance form", () => {
  const adminUser = {
    id: 1,
    employee_id: null,
    username: "admin",
    language: "en",
    is_active: true,
    must_change_password: false,
    roles: ["admin"],
    permissions: ["employees.delete"],
  } as CurrentUser;

  it("does not expose employee deletion on the HR employees page", () => {
    expect(canShowEmployeeDeleteAction("hr", adminUser)).toBe(false);
    expect(canShowEmployeeDeleteAction("admin", adminUser)).toBe(true);
  });

  it("requires an admin password before guarded delete submit", () => {
    expect(canSubmitGuardedDelete("")).toBe(false);
    expect(canSubmitGuardedDelete("   ")).toBe(false);
    expect(canSubmitGuardedDelete("AdminPass123!")).toBe(true);
    expect(canSubmitGuardedDelete("AdminPass123!", true)).toBe(false);
  });

  it("includes auto_attendance_enabled in the create payload", async () => {
    const payload = toEmployeePayload({
      first_name: "Jane",
      last_name: "Auto",
      email: "jane@example.com",
      phone_country_iso: "dz",
      phone_number: "5551234",
      department_id: "",
      position_id: "",
      position: "",
      status: "active",
      hire_date: "2026-05-01",
      salary_type: "0",
      monthly_price: "1000",
      day_price: "100",
      hour_price: "10",
      extra_hours_price: "15",
      vacation_days: "30",
      dues: "0",
      auto_attendance_enabled: true,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        auto_attendance_enabled: true,
      }),
    );
  });

  it("treats 0E-10 input values as plain zero in the form", () => {
    expect(normalizeNumericInputValue("0E-10")).toBe("0");
  });

  it("requires the create form mandatory fields before enabling submission", () => {
    expect(
      isEmployeeCreateFormComplete({
        first_name: "Jane",
        last_name: "Auto",
        email: "jane@example.com",
        phone_country_iso: "dz",
        phone_number: "5551234",
        department_id: "1",
        position_id: "2",
        position: "Engineer",
        status: "active",
        hire_date: "2026-05-01",
        salary_type: "0",
        monthly_price: "1000",
        day_price: "100",
        hour_price: "10",
        extra_hours_price: "15",
        vacation_days: "30",
        dues: "0",
        auto_attendance_enabled: true,
      }),
    ).toBe(true);

    expect(
      isEmployeeCreateFormComplete({
        first_name: "Jane",
        last_name: "",
        email: "jane@example.com",
        phone_country_iso: "dz",
        phone_number: "5551234",
        department_id: "1",
        position_id: "2",
        position: "Engineer",
        status: "active",
        hire_date: "2026-05-01",
        salary_type: "0",
        monthly_price: "1000",
        day_price: "100",
        hour_price: "10",
        extra_hours_price: "15",
        vacation_days: "30",
        dues: "0",
        auto_attendance_enabled: true,
      }),
    ).toBe(false);
  });

  it("zeros hidden compensation values for monthly salary type", () => {
    const payload = toEmployeePayload({
      first_name: "Jane",
      last_name: "Auto",
      email: "jane@example.com",
      phone_country_iso: "dz",
      phone_number: "5551234",
      department_id: "",
      position_id: "",
      position: "",
      status: "active",
      hire_date: "2026-05-01",
      salary_type: "0",
      monthly_price: "1000",
      day_price: "100",
      hour_price: "10",
      extra_hours_price: "15",
      vacation_days: "30",
      dues: "0",
      auto_attendance_enabled: true,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        month_price: 1000,
        day_price: 0,
        hour_price: 0,
      }),
    );
  });

  it("zeros hidden compensation values for hourly salary type", () => {
    const payload = toEmployeePayload(
      {
        first_name: "Jane",
        last_name: "Auto",
        email: "jane@example.com",
        phone_country_iso: "dz",
        phone_number: "5551234",
        department_id: "",
        position_id: "",
        position: "",
        status: "active",
        hire_date: "2026-05-01",
        salary_type: "2",
        monthly_price: "1000",
        day_price: "100",
        hour_price: "10",
        extra_hours_price: "15",
        vacation_days: "30",
        dues: "0",
        auto_attendance_enabled: true,
      },
      "hourly",
    );

    expect(payload).toEqual(
      expect.objectContaining({
        month_price: 0,
        day_price: 0,
        hour_price: 10,
      }),
    );
  });

  it("zeros hidden compensation values for daily salary type", () => {
    const normalizedForm = normalizeCompensationFormBySalaryType(
      {
        first_name: "Jane",
        last_name: "Auto",
        email: "jane@example.com",
        phone_country_iso: "dz",
        phone_number: "5551234",
        department_id: "",
        position_id: "",
        position: "",
        status: "active",
        hire_date: "2026-05-01",
        salary_type: "1",
        monthly_price: "1000",
        day_price: "100",
        hour_price: "10",
        extra_hours_price: "15",
        vacation_days: "30",
        dues: "0",
        auto_attendance_enabled: true,
      },
      "daily",
    );

    expect(normalizedForm.monthly_price).toBe("0");
    expect(normalizedForm.day_price).toBe("100");
    expect(normalizedForm.hour_price).toBe("0");
  });

  it("shows only the relevant compensation fields for each salary type", () => {
    expect(shouldShowCompensationField("monthly_price", "monthly")).toBe(true);
    expect(shouldShowCompensationField("day_price", "monthly")).toBe(false);
    expect(shouldShowCompensationField("hour_price", "monthly")).toBe(false);

    expect(shouldShowCompensationField("monthly_price", "daily")).toBe(false);
    expect(shouldShowCompensationField("day_price", "daily")).toBe(true);
    expect(shouldShowCompensationField("hour_price", "daily")).toBe(false);

    expect(shouldShowCompensationField("monthly_price", "hourly")).toBe(false);
    expect(shouldShowCompensationField("day_price", "hourly")).toBe(false);
    expect(shouldShowCompensationField("hour_price", "hourly")).toBe(true);

    expect(shouldShowCompensationField("extra_hours_price", "hourly")).toBe(true);
    expect(shouldShowCompensationField("dues", "daily")).toBe(true);
  });
});
