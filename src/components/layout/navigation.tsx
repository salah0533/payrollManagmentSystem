import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ClipboardList,
  Clock3,
  FileClock,
  Home,
  Landmark,
  Settings,
  Shield,
  Users,
  WalletCards,
} from "lucide-react";

export type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresPermission?: string;
};

export const adminNavigation: NavigationItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Home },
  { to: "/admin/users", label: "Users", icon: Shield },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/attendance", label: "Attendance", icon: Clock3 },
  { to: "/admin/payroll", label: "Payroll", icon: WalletCards },
  { to: "/admin/vacations", label: "Vacations", icon: Landmark },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList, requiresPermission: "audit.read" },
];

export const hrNavigation: NavigationItem[] = [
  { to: "/hr/dashboard", label: "Dashboard", icon: Home },
  { to: "/hr/employees", label: "Employees", icon: Users },
  { to: "/hr/attendance", label: "Attendance", icon: Clock3 },
  { to: "/hr/payroll", label: "Payroll", icon: WalletCards },
  { to: "/hr/vacations", label: "Vacations", icon: Landmark },
  { to: "/hr/notifications", label: "Notifications", icon: Bell },
];

export const employeeNavigation: NavigationItem[] = [
  { to: "/employee/home", label: "Home", icon: Home },
  { to: "/employee/profile", label: "Profile", icon: Users },
  { to: "/employee/attendance", label: "Attendance", icon: Clock3 },
  { to: "/employee/payroll", label: "Payroll", icon: WalletCards },
  { to: "/employee/vacations", label: "Vacations", icon: Landmark },
  { to: "/employee/notifications", label: "Notifications", icon: Bell },
];

export const notificationPriorities = ["low", "normal", "high"] as const;
export const notificationTypes = [
  "general",
  "vacation_request_submitted",
  "vacation_approved",
  "vacation_rejected",
  "vacation_cancelled",
  "attendance_missing_checkin",
  "attendance_missing_checkout",
  "attendance_late",
  "attendance_correction_review_required",
  "payroll_draft_ready",
  "payroll_needs_review",
  "payroll_approved",
  "payroll_paid",
  "payroll_discrepancy_detected",
  "account_created",
  "password_changed",
  "must_change_password",
] as const;

export const payrollAdjustmentTypes = [
  "bonus",
  "allowance",
  "deduction",
  "penalty",
  "manual_correction",
] as const;

export const attendanceCorrectionFields = [
  "check_in_time",
  "break_start_time",
  "break_end_time",
  "check_out_time",
  "status",
] as const;

export const workWeekOptions = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const payrollCycles = ["monthly", "biweekly", "weekly"] as const;

export const vacationStatuses = ["pending", "approved", "rejected", "cancelled"] as const;

export const attendanceActions = [
  { code: "check-in", label: "Check In" },
  { code: "break-start", label: "Break Start" },
  { code: "break-end", label: "Break End" },
  { code: "check-out", label: "Check Out" },
] as const;

export const hrDashboardFocus = [
  "Review late or incomplete attendance records.",
  "Check vacation requests that still need action.",
  "Open the payroll review area with the current period id.",
];

export const adminDashboardFocus = [
  "Review the operational dashboards and recent notifications.",
  "Manage users and employee records with role-aware access.",
  "Audit payroll, policies, and system-wide activity from one place.",
];
