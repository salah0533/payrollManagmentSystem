export type RoleCode = 'admin' | 'hr' | 'employee';

export interface ApiResponse<T> {
  message: string;
  data: T;
  status: boolean;
  detail?: string;
  error_code?: string;
  errors?: Array<{ field?: string; message: string; location?: string; type?: string }>;
}

export interface AuthEmployee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  position?: string | null;
  status: string;
}

export interface AuthUser {
  id: number;
  employee_id: number | null;
  username: string;
  email?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  roles: RoleCode[];
  permissions: string[];
  employee?: AuthEmployee | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  refresh_expires_in_seconds: number;
  must_change_password: boolean;
}

export interface PermissionRead {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  module?: string | null;
}

export interface RoleRead {
  id: number;
  code: RoleCode;
  name: string;
  description?: string | null;
  is_system_role: boolean;
  permissions: PermissionRead[];
}

export interface UserRead {
  id: number;
  employee_id: number | null;
  username: string;
  email?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  roles: RoleRead[];
}

export type MoneyValue = number | string;

export interface EmployeeRead {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone: string;
  department_id?: number | null;
  position?: string | null;
  status: string;
  hire_date?: string | null;
  dues: MoneyValue;
  salary_type: number;
  monthly_price: MoneyValue;
  day_price: MoneyValue;
  hour_price: MoneyValue;
  extra_hours_price: MoneyValue;
  vacation_days: number;
  daily_work_hours: number;
  allowed_late: MoneyValue;
  min_extraTime: MoneyValue;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id?: number | null;
}

export interface DashboardOverview {
  total_employees: number;
  active_employees: number;
  hr_users: number;
  pending_leave_requests: number;
  current_payroll_status: string;
  payroll_status_counts: Record<string, number>;
  monthly_payroll_amount: number;
  attendance_percent: number;
  attendance_summary: Record<string, number>;
  employees_on_leave: number;
  alerts: Array<{ type: string; message: string }>;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  entry_time?: string | null;
  exit_time?: string | null;
  date: string;
  attendence_type: number;
}

export interface AttendanceDayRead {
  id: number;
  employee_id: number;
  work_date: string;
  check_in_time?: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  check_out_time?: string | null;
  expected_work_minutes: number;
  actual_work_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  absence_minutes: number;
  status: string;
  is_manually_corrected: boolean;
}

export interface PaymentRead {
  id: number;
  employee_id: number;
  date: string;
  amount: MoneyValue;
  payment_type: number;
  description: string;
  start?: string | null;
  end?: string | null;
}

export interface VacationRead {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  vacation_type: number;
  vacation_status: number;
  is_paid: boolean;
}

export interface LookupItem {
  id: number;
  code?: string | null;
  attendence_type?: string;
  payment_type?: string;
  salary_type?: string;
  vacation_type?: string;
  vacation_status?: string;
}

export interface EmployeePayrollRead {
  id: number;
  payroll_period_id: number;
  employee_id: number;
  salary_type: string;
  base_salary: MoneyValue;
  normal_amount: MoneyValue;
  overtime_amount: MoneyValue;
  bonus_amount: MoneyValue;
  deduction_amount: MoneyValue;
  late_deduction_amount: MoneyValue;
  unpaid_vacation_deduction: MoneyValue;
  adjustment_amount: MoneyValue;
  gross_salary: MoneyValue;
  net_salary: MoneyValue;
  status: string;
  calculated_at: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
}

export interface PayrollPeriodRead {
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
  payrolls: EmployeePayrollRead[];
}

export interface CurrentPayrollRead {
  period: PayrollPeriodRead;
  payroll: EmployeePayrollRead;
}

export interface UserNotificationRead {
  notification_id: string;
  title: string;
  message: string;
  priority: string;
  notification_type: string;
  created_at: string;
  is_read: boolean;
}

export interface NotificationListRead {
  items: UserNotificationRead[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface SettingsRead {
  id?: number;
  entry_time?: string | null;
  exit_time?: string | null;
}

export interface WorkScheduleRead {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  weekly_off_days: string[];
  timezone: string;
  is_default: boolean;
}

export interface PayrollPolicyRead {
  id: number;
  name: string;
  payroll_cycle: string;
  minimum_overtime_minutes: number;
  allowed_late_minutes: number;
  default_currency: string;
  significant_change_threshold: MoneyValue;
  paid_vacation_counts_for_daily: boolean;
  overtime_enabled: boolean;
  late_makeup_enabled: boolean;
  late_deduction_enabled: boolean;
  auto_recalculate_draft_payroll: boolean;
  lock_payroll_after_payment: boolean;
  holidays_json: string[];
}
