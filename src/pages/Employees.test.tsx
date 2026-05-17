import { describe, expect, it } from "vitest";

import { toEmployeePayload } from "@/pages/Employees";

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
});
