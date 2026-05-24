import type { AttendanceDay, EmployeePayroll, PayrollDiscrepancy } from "@/types/domain";

export const attendanceStatuses = [
  "present",
  "late",
  "absent",
  "unpaid",
  "paid_vacation",
  "unpaid_vacation",
  "sick_leave",
  "weekly_off",
  "holiday",
  "incomplete",
] as const;

export const smartAttendanceStatuses = [
  "present",
  "late",
  "absent",
  "unpaid",
  "paid_vacation",
  "unpaid_vacation",
  "sick_leave",
  "weekly_off",
] as const;

export const calendarBulkCorrectionStatuses = [
  "present",
  "absent",
  "unpaid",
  "unpaid_vacation",
  "paid_vacation",
  "weekly_off",
  "sick_leave",
  "delete",
] as const;

export const attendanceReviewStatuses = ["draft", "needs_review", "approved", "locked"] as const;

export const payrollFinalStatuses = ["locked"] as const;
export const payrollPaidStatuses = ["locked"] as const;
export const notificationTypes = ["general", "attendance", "payroll", "vacation", "employee", "system"] as const;
export const notificationPriorities = ["low", "normal", "high"] as const;
export const roleCodes = ["admin", "hr", "employee"] as const;

export type AttendanceReviewStatus = (typeof attendanceReviewStatuses)[number];

export function getAttendanceReviewStatus(day?: Pick<AttendanceDay, "review_status"> | null): AttendanceReviewStatus {
  const status = day?.review_status || "draft";
  return attendanceReviewStatuses.includes(status as AttendanceReviewStatus) ? (status as AttendanceReviewStatus) : "draft";
}

export function isAttendanceLocked(day?: Pick<AttendanceDay, "review_status" | "locked_at"> | null) {
  return getAttendanceReviewStatus(day) === "locked" || Boolean(day?.locked_at);
}

export function getSmartCorrectionStatuses(day?: Pick<AttendanceDay, "status"> | null) {
  if (day?.status === "weekly_off") {
    return smartAttendanceStatuses.filter((status) => status !== "absent" && status !== "unpaid_vacation");
  }
  return smartAttendanceStatuses;
}

export function hasOpenDiscrepancyForPayroll(payroll: EmployeePayroll, discrepancies: PayrollDiscrepancy[] = []) {
  return getPayrollDiscrepancySummary(payroll, discrepancies).openCount > 0;
}

function getPayrollDiscrepanciesForRow(payroll: EmployeePayroll, discrepancies: PayrollDiscrepancy[] = []) {
  return discrepancies.filter(
    (item) =>
      item.status !== "resolved" &&
      (item.employee_payroll_id === payroll.id ||
        (item.employee_payroll_id == null &&
          item.employee_id === payroll.employee_id &&
          item.payroll_period_id === payroll.payroll_period_id)),
  );
}

export function getPayrollDiscrepancySummary(payroll?: EmployeePayroll | null, discrepancies: PayrollDiscrepancy[] = []) {
  if (!payroll) {
    return {
      openCount: 0,
      blockingCount: 0,
      warningCount: 0,
      hasBlocking: false,
      hasWarning: false,
    };
  }

  const openItems = getPayrollDiscrepanciesForRow(payroll, discrepancies);
  const blockingCount = openItems.filter((item) => item.severity === "high").length;
  const warningCount = openItems.length - blockingCount;
  return {
    openCount: openItems.length,
    blockingCount,
    warningCount,
    hasBlocking: blockingCount > 0,
    hasWarning: warningCount > 0,
  };
}

export function canRecalculatePayroll(payroll?: Pick<EmployeePayroll, "status"> | null) {
  return Boolean(payroll && !payrollFinalStatuses.includes(payroll.status as never));
}

export function canAdjustPayroll(payroll?: Pick<EmployeePayroll, "status"> | null) {
  return Boolean(payroll && !payrollFinalStatuses.includes(payroll.status as never));
}

export function canApprovePayroll(payroll?: EmployeePayroll | null, discrepancies: PayrollDiscrepancy[] = []) {
  const summary = getPayrollDiscrepancySummary(payroll, discrepancies);
  return Boolean(payroll && payroll.status !== "locked" && !payrollPaidStatuses.includes(payroll.status as never) && !summary.hasBlocking);
}

export function canUnapprovePayroll() {
  return false;
}

export function canReopenLockedPayroll() {
  return false;
}

export function canRecordPayrollPayment(payroll?: EmployeePayroll | null, discrepancies: PayrollDiscrepancy[] = []) {
  const summary = getPayrollDiscrepancySummary(payroll, discrepancies);
  return Boolean(payroll && payroll.status !== "locked" && !summary.hasBlocking);
}
