export type RoleCode = "admin" | "hr" | "employee" | string;
export type LanguageCode = "en" | "fr" | "ar";

export interface Permission {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  module?: string | null;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_system_role: boolean;
  permissions: Permission[];
}

export interface AuthMeEmployee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  position?: string | null;
  status: string;
}

export interface CurrentUser {
  id: number;
  employee_id: number | null;
  username: string;
  email?: string | null;
  language: LanguageCode;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  roles: RoleCode[];
  permissions: string[];
  employee?: AuthMeEmployee | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  refresh_expires_in_seconds: number;
  must_change_password: boolean;
}

export interface User {
  id: number;
  employee_id: number | null;
  username: string;
  email?: string | null;
  language: LanguageCode;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone: string;
  department_id?: number | null;
  position_id?: number | null;
  position?: string | null;
  status: string;
  hire_date?: string | null;
  dues: number | string;
  salary_type: number;
  monthly_price: number | string;
  day_price: number | string;
  hour_price: number | string;
  extra_hours_price: number | string;
  vacation_days: number;
  auto_attendance_enabled: boolean;
  auto_attendance_effective_from?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id?: number | null;
}

export interface SalaryType {
  id: number;
  code?: string;
  label?: string;
  salary_type: string;
}

export interface EmployeeReference {
  id: number;
  name: string;
  is_active: boolean;
}

export interface AttendanceEvent {
  id: number;
  employee_id: number;
  attendance_day_id?: number | null;
  event_type: string;
  event_time: string;
  source: string;
  note?: string | null;
  created_at: string;
  created_by?: number | null;
}

export interface AttendanceDay {
  id: number;
  employee_id: number;
  work_date: string;
  work_schedule_id?: number | null;
  check_in_time?: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  check_out_time?: string | null;
  expected_work_minutes: number;
  actual_work_minutes: number;
  break_minutes: number;
  normal_paid_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  late_makeup_minutes: number;
  overtime_minutes: number;
  absence_minutes: number;
  unpaid_minutes: number;
  status: string;
  review_status?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  locked_at?: string | null;
  is_manually_corrected: boolean;
  calculated_at: string;
  created_at: string;
  updated_at: string;
  events: AttendanceEvent[];
}

export interface AttendanceActionPayload {
  event_time?: string;
  note?: string;
}

export interface AttendanceActionResult {
  event: AttendanceEvent;
  attendance_day: AttendanceDay;
}

export interface AttendanceCorrection {
  id: number;
  attendance_day_id: number;
  employee_id: number;
  original_event_id?: number | null;
  field_changed: string;
  correction_type: string;
  target_status?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  old_values_json?: Record<string, unknown> | null;
  new_values_json?: Record<string, unknown> | null;
  options_json?: Record<string, unknown> | null;
  reason: string;
  corrected_by?: number | null;
  corrected_at: string;
}

export interface AttendanceCorrectionPayload {
  employee_id: number;
  work_date: string;
  correction_type?: "field" | "smart_status";
  field_changed?: string;
  new_value?: string | null;
  new_values_json?: Partial<Record<"check_in_time" | "break_start_time" | "break_end_time" | "check_out_time", string | null>>;
  target_status?: string | null;
  options?: Record<string, unknown>;
  original_event_id?: number | null;
  reason: string;
}

export interface AttendanceSmartCorrectionPayload {
  target_status: string;
  reason: string;
  options?: {
    late_minutes?: number;
    check_in_time?: string;
    check_out_time?: string;
  };
}

export interface AttendanceReviewPayload {
  review_status: "draft" | "needs_review" | "approved" | "locked";
  note?: string | null;
}

export interface AttendanceCorrectionResult {
  correction: AttendanceCorrection;
  attendance_day: AttendanceDay;
}

export interface VacationType {
  id: number;
  code?: string;
  label?: string;
  vacation_type: string;
}

export interface VacationStatus {
  id: number;
  code?: string;
  label?: string;
  vacation_status: string;
}

export interface Vacation {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  vacation_type: number | string;
  vacation_status: number | string;
  is_paid?: boolean;
  reason?: string | null;
}

export interface SelfVacationRequestPayload {
  start_date: string;
  end_date: string;
  vacation_type: number;
  is_paid: boolean;
}

export interface VacationPayload extends SelfVacationRequestPayload {
  employee_id: number;
  vacation_status: number;
}

export interface VacationUpdatePayload {
  id: number;
  employee_id?: number;
  start_date?: string;
  end_date?: string;
  vacation_type?: number;
  vacation_status?: number;
  is_paid?: boolean;
}

export interface AnnualVacationEntitlement {
  employee_id: number;
  year: number;
  allowed_days: number;
}

export interface AnnualVacationEntitlementPayload {
  emp_id: number;
  year: number;
  allowed_days: number;
}

export interface AnnualVacationEntitlementDeletePayload {
  emp_id: number;
  year: number;
}

export interface VacationBalanceYear {
  year: number;
  entitlement_days: number;
  entitlement_source_year?: number | null;
  entitlement_source: string;
  carried_over_days: number;
  active_carryover_days: number;
  carryover_used_days: number;
  carryover_expired_days: number;
  carryover_expires_on?: string | null;
  starting_balance_days: number;
  approved_days: number;
  pending_request_days: number;
  reserved_days: number;
  consumed_days: number;
  remaining_entitlement_days: number;
  available_days: number;
  overdrawn_days: number;
  carryover_to_next_year: number;
}

export interface VacationBalancePolicy {
  allow_vacation_carryover: boolean;
  max_vacation_carryover_days?: number | null;
  carryover_expiry_month?: number | null;
  carryover_expiry_day?: number | null;
  reserve_vacation_days_on_pending: boolean;
}

export interface VacationBalance {
  employee_id: number;
  employee_name: string;
  as_of: string;
  policy: VacationBalancePolicy;
  current_year: number;
  current_year_balance?: VacationBalanceYear | null;
  years: VacationBalanceYear[];
}

export interface PayrollCalculationData extends Record<string, unknown> {
  actual_work_minutes?: number;
  normal_paid_minutes?: number;
  earned_paid_minutes?: number;
  earned_unpaid_minutes?: number;
  paid_minutes?: number;
  unpaid_minutes?: number;
  overtime_minutes?: number;
  period_expected_minutes?: number;
  missing_workday_minutes?: number;
  partial_unpaid_minutes?: number;
  auto_minute_rate?: number | string;
  attendance_deduction?: number | string;
  earned_attendance_deduction?: number | string;
  manual_deduction_amount?: number | string;
  earned_deduction_amount?: number | string;
  late_penalty_amount?: number | string;
  earned_net_salary?: number | string;
  payable_amount?: number | string;
  approved_payable_amount?: number | string;
  held_for_review_amount?: number | string;
  final_net_salary?: number | string;
  needs_review_reasons?: string[];
}

export interface EmployeePayroll {
  id: number;
  payroll_period_id: number;
  employee_id: number;
  salary_type: string;
  base_salary: number | string;
  normal_amount: number | string;
  overtime_amount: number | string;
  bonus_amount: number | string;
  deduction_amount: number | string;
  late_deduction_amount: number | string;
  unpaid_vacation_deduction: number | string;
  adjustment_amount: number | string;
  gross_salary: number | string;
  net_salary: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  balance_amount: number | string;
  status: string;
  calculated_at: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  attendance_deduction_amount?: number | string;
  manual_deduction_amount?: number | string;
  late_penalty_amount?: number | string;
  calculation_data_json?: PayrollCalculationData;
  needs_review_reason?: string | null;
}

export interface PayrollPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  generated_at: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  approved_by?: number | null;
  paid_at?: string | null;
  locked_at?: string | null;
  payrolls: EmployeePayroll[];
}

export interface PayrollEmployeeBalance {
  employee_id: number;
  employee_name: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance_amount: number | string;
  payroll_count: number;
}

export interface PayrollBalanceReport {
  period_id?: number | null;
  total_amount: number | string;
  paid_amount: number | string;
  balance_amount: number | string;
  company_owes_employees: number | string;
  employees_owe_company: number | string;
  employees: PayrollEmployeeBalance[];
}

export interface PayrollDiscrepancy {
  id: number;
  employee_payroll_id?: number | null;
  payroll_period_id: number;
  employee_id: number;
  discrepancy_type: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: number | null;
  resolution_note?: string | null;
}

export interface PayrollHistory {
  id: number;
  employee_payroll_id: number;
  payroll_period_id: number;
  employee_id: number;
  old_gross_salary?: number | string | null;
  new_gross_salary: number | string;
  old_net_salary?: number | string | null;
  new_net_salary: number | string;
  reason: string;
  calculation_data_json: PayrollCalculationData;
  created_at: string;
  created_by?: number | null;
}

export interface PayrollAdjustmentPayload {
  employee_payroll_id: number;
  payroll_period_id: number;
  employee_id: number;
  adjustment_type: string;
  amount: number;
  reason: string;
}

export interface PayrollAdjustment {
  id: number;
  employee_payroll_id: number;
  payroll_period_id: number;
  employee_id: number;
  adjustment_type: string;
  amount: number | string;
  reason: string;
  created_by?: number | null;
  created_at: string;
}

export interface PayrollAdjustmentUpdatePayload {
  adjustment_type?: string;
  amount?: number;
  reason?: string;
}

export interface UserNotification {
  notification_id: string;
  recipient_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  actor_user_id?: number | null;
  priority: string;
  created_at: string;
  expires_at?: string | null;
  is_read: boolean;
  read_at?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  recipient_created_at: string;
}

export interface UserNotificationList {
  items: UserNotification[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

export interface NotificationActionResult {
  notification_id?: string | null;
  updated?: number | null;
  status: string;
}

export interface AdminNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  actor_user_id?: number | null;
  priority: string;
  created_at: string;
  expires_at?: string | null;
  recipient_count: number;
  read_count: number;
  archived_count: number;
}

export interface AdminNotificationList {
  items: AdminNotification[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkSchedule {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  weekly_off_days: string[];
  timezone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkSchedulePayload {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  weekly_off_days: string[];
  timezone: string;
  is_default: boolean;
}

export interface PayrollPolicy {
  id: number;
  name: string;
  payroll_cycle: string;
  minimum_overtime_minutes: number;
  minimum_auto_pay_minutes: number;
  allowed_late_minutes: number;
  default_currency: string;
  significant_change_threshold: number | string;
  paid_vacation_counts_for_daily: boolean;
  overtime_enabled: boolean;
  late_makeup_enabled: boolean;
  late_deduction_enabled: boolean;
  auto_recalculate_draft_payroll: boolean;
  lock_payroll_after_payment: boolean;
  holidays_json: string[];
  allow_vacation_carryover: boolean;
  max_vacation_carryover_days?: number | null;
  carryover_expiry_month?: number | null;
  carryover_expiry_day?: number | null;
  reserve_vacation_days_on_pending: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollPolicyPayload {
  name: string;
  payroll_cycle: string;
  minimum_overtime_minutes: number;
  minimum_auto_pay_minutes: number;
  allowed_late_minutes: number;
  default_currency: string;
  significant_change_threshold: number;
  paid_vacation_counts_for_daily: boolean;
  overtime_enabled: boolean;
  late_makeup_enabled: boolean;
  late_deduction_enabled: boolean;
  auto_recalculate_draft_payroll: boolean;
  lock_payroll_after_payment: boolean;
  holidays_json: string[];
  allow_vacation_carryover: boolean;
  max_vacation_carryover_days?: number | null;
  carryover_expiry_month?: number | null;
  carryover_expiry_day?: number | null;
  reserve_vacation_days_on_pending: boolean;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  old_data_json?: Record<string, unknown> | null;
  new_data_json?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_emps: number;
  total_active_emps: number;
  total_att_percent: number;
  total_vacation: number;
  present_days?: number;
  late_days?: number;
  absent_days?: number;
  vacation_days?: number;
  weekly_off_days?: number;
  incomplete_days?: number;
  needs_review_days?: number;
  total_paid_minutes?: number;
  total_unpaid_minutes?: number;
  overtime_minutes?: number;
}

export interface ApiEnvelope<T> {
  message: string;
  data: T;
  status: boolean;
}

export interface ApiValidationError {
  field: string;
  message: string;
}

export interface NotificationDispatchPayload {
  notification_type: string;
  title: string;
  message: string;
  user_ids: number[];
  role_codes: string[];
  entity_type?: string;
  entity_id?: number;
  priority: string;
  expires_at?: string | null;
}
