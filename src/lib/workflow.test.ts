import { describe, expect, it } from "vitest";

import {
  canAdjustPayroll,
  canApprovePayroll,
  canRecalculatePayroll,
  canRecordPayrollPayment,
  getAttendanceReviewStatus,
  hasOpenDiscrepancyForPayroll,
  isAttendanceLocked,
} from "@/lib/workflow";
import type { AttendanceDay, EmployeePayroll, PayrollDiscrepancy } from "@/types/domain";

const payroll = (status: string): EmployeePayroll => ({
  id: 10,
  payroll_period_id: 2,
  employee_id: 5,
  salary_type: "monthly",
  base_salary: 1000,
  normal_amount: 1000,
  overtime_amount: 0,
  bonus_amount: 0,
  deduction_amount: 0,
  late_deduction_amount: 0,
  unpaid_vacation_deduction: 0,
  adjustment_amount: 0,
  gross_salary: 1000,
  net_salary: 1000,
  total_amount: 1000,
  paid_amount: 0,
  balance_amount: 1000,
  status,
  calculated_at: "2026-05-01T00:00:00Z",
});

const discrepancy = (overrides: Partial<PayrollDiscrepancy> = {}): PayrollDiscrepancy => ({
  id: 1,
  employee_payroll_id: 10,
  payroll_period_id: 2,
  employee_id: 5,
  discrepancy_type: "attendance_requires_review",
  description: "Attendance requires review",
  severity: "high",
  status: "open",
  created_at: "2026-05-01T00:00:00Z",
  ...overrides,
});

describe("attendance workflow guards", () => {
  it("defaults missing review_status to draft", () => {
    expect(getAttendanceReviewStatus({ review_status: undefined })).toBe("draft");
    expect(getAttendanceReviewStatus({ review_status: "not_real" })).toBe("draft");
  });

  it("treats locked status or locked_at as locked", () => {
    expect(isAttendanceLocked({ review_status: "locked" })).toBe(true);
    expect(isAttendanceLocked({ review_status: "approved", locked_at: "2026-05-01T00:00:00Z" } as AttendanceDay)).toBe(true);
    expect(isAttendanceLocked({ review_status: "approved" })).toBe(false);
  });
});

describe("payroll workflow guards", () => {
  it("blocks approval when a row has open discrepancies", () => {
    const row = payroll("draft");
    expect(hasOpenDiscrepancyForPayroll(row, [discrepancy()])).toBe(true);
    expect(canApprovePayroll(row, [discrepancy()])).toBe(false);
    expect(canApprovePayroll(row, [discrepancy({ status: "resolved" })])).toBe(true);
  });

  it("allows payment only after approval and blocks recalculation/adjustment once final", () => {
    expect(canRecordPayrollPayment(payroll("draft"))).toBe(false);
    expect(canRecordPayrollPayment(payroll("approved"))).toBe(true);
    expect(canRecalculatePayroll(payroll("draft"))).toBe(true);
    expect(canRecalculatePayroll(payroll("paid"))).toBe(false);
    expect(canAdjustPayroll(payroll("locked"))).toBe(false);
  });
});
