import { afterEach, describe, expect, it, vi } from "vitest";

import { attendanceApi } from "@/services/attendanceApi";

function mockApiResponse(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ status: true, message: "ok", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("attendanceApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wires smart correction to the backend smart-correction endpoint", async () => {
    mockApiResponse({ correction: { id: 1 }, attendance_day: { id: 2 } });

    await attendanceApi.smartCorrection(7, "2026-05-15", {
      target_status: "present",
      reason: "Missed punch approved by HR",
      options: { check_in_time: "09:00", check_out_time: "17:00" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/attendance/day/7/2026-05-15/smart-correction",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          target_status: "present",
          reason: "Missed punch approved by HR",
          options: { check_in_time: "09:00", check_out_time: "17:00" },
        }),
      }),
    );
  });

  it("wires review status updates to the attendance review endpoint", async () => {
    mockApiResponse({ id: 2, review_status: "approved" });

    await attendanceApi.reviewDay(7, "2026-05-15", {
      review_status: "approved",
      note: "Approved from review queue",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/attendance/day/7/2026-05-15/review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          review_status: "approved",
          note: "Approved from review queue",
        }),
      }),
    );
  });

  it("posts multi-field manual corrections to the manual correction endpoint", async () => {
    mockApiResponse({ correction: { id: 3 }, attendance_day: { id: 4 } });

    await attendanceApi.manualCorrection({
      employee_id: 7,
      work_date: "2026-05-15",
      correction_type: "field",
      new_values_json: {
        check_in_time: "09:05",
        break_start_time: "12:00",
        break_end_time: "12:30",
        check_out_time: "17:10",
      },
      reason: "Adjusted multiple punches from manager report",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/attendance/manual-correction",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          employee_id: 7,
          work_date: "2026-05-15",
          correction_type: "field",
          new_values_json: {
            check_in_time: "09:05",
            break_start_time: "12:00",
            break_end_time: "12:30",
            check_out_time: "17:10",
          },
          reason: "Adjusted multiple punches from manager report",
        }),
      }),
    );
  });
});
