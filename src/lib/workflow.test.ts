import { describe, expect, it } from "vitest";

import {
  canAdjustPayroll,
  canApprovePayroll,
  canRecalculatePayroll,
  canRecordPayrollPayment,
  getSmartCorrectionStatuses,
  getPayrollDiscrepancySummary,
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

  it("does not offer absent as a smart correction status for weekly off rows", () => {
    expect(getSmartCorrectionStatuses({ status: "weekly_off" } as AttendanceDay)).not.toContain("absent");
    expect(getSmartCorrectionStatuses({ status: "present" } as AttendanceDay)).toContain("absent");
  });
});

describe("payroll workflow guards", () => {
  it("distinguishes blocking vs warning discrepancies", () => {
    const row = payroll("draft");
    const warning = discrepancy({ severity: "medium" });
    const blocking = discrepancy();

    expect(hasOpenDiscrepancyForPayroll(row, [warning])).toBe(true);
    expect(getPayrollDiscrepancySummary(row, [warning])).toMatchObject({
      openCount: 1,
      blockingCount: 0,
      warningCount: 1,
      hasBlocking: false,
      hasWarning: true,
    });
    expect(canApprovePayroll(row, [warning])).toBe(true);
    expect(canApprovePayroll(row, [blocking])).toBe(false);
    expect(canApprovePayroll(row, [blocking, discrepancy({ status: "resolved" })])).toBe(false);
  });

  it("allows payment only after approval and only when blocking discrepancies are absent", () => {
    expect(canRecordPayrollPayment(payroll("draft"))).toBe(false);
    expect(canRecordPayrollPayment(payroll("approved"))).toBe(true);
    expect(canRecordPayrollPayment(payroll("approved"), [discrepancy({ severity: "medium" })])).toBe(true);
    expect(canRecordPayrollPayment(payroll("approved"), [discrepancy({ severity: "high" })])).toBe(false);
    expect(canRecalculatePayroll(payroll("draft"))).toBe(true);
    expect(canRecalculatePayroll(payroll("paid"))).toBe(false);
    expect(canAdjustPayroll(payroll("locked"))).toBe(false);
  });
});
