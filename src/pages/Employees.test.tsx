import { describe, expect, it } from "vitest";

import { isEmployeeCreateFormComplete, normalizeNumericInputValue, toEmployeePayload } from "@/pages/Employees";

describe("Employees auto attendance form", () => {
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
      vacation_days: "21",
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
        vacation_days: "21",
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
        vacation_days: "21",
        dues: "0",
        auto_attendance_enabled: true,
      }),
    ).toBe(false);
  });
});
