// Mock data for the Payroll & Employee Management Dashboard

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive';
  salaryType: 'hour' | 'day' | 'month';
  salary: number;
  hireDate: string;
  department: string;
  avatar?: string;
  settings: {
    dailyWorkHours: number;
    hourPrice: number;
    dayPrice: number;
    monthPrice: number;
    extraHoursPrice: number;
    autoAttendance: boolean;
  };
}

export interface Attendance {
  [x: string]: string;
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  workedHours: number;
  attendence_type: 'present' | 'late' | 'absent' | 'vacation' | 'Overtime';
}

export interface Payment {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  amount: number;
  payment_type: string;
  description: string;
}

export interface Vacation {
  id: string;
  employeeId: string;
  employeeName: string;
  vacation_type:string;
  start_date: string;
  end_date: string;
  days: number;
  vacation_status: string;
}

export const employees: Employee[] = [
  {
    id: '1',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@store.com',
    phone: '+1 555-0101',
    jobTitle: 'Store Manager',
    role: 'admin',
    status: 'active',
    salaryType: 'month',
    salary: 5500,
    hireDate: '2021-03-15',
    department: 'Management',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 35,
      dayPrice: 280,
      monthPrice: 5500,
      extraHoursPrice: 45,
      autoAttendance: true,
    },
  },
  {
    id: '2',
    fullName: 'Michael Chen',
    email: 'michael.chen@store.com',
    phone: '+1 555-0102',
    jobTitle: 'Sales Associate',
    role: 'employee',
    status: 'active',
    salaryType: 'hour',
    salary: 18,
    hireDate: '2022-06-20',
    department: 'Sales',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 18,
      dayPrice: 144,
      monthPrice: 2880,
      extraHoursPrice: 25,
      autoAttendance: false,
    },
  },
  {
    id: '3',
    fullName: 'Emily Rodriguez',
    email: 'emily.rodriguez@store.com',
    phone: '+1 555-0103',
    jobTitle: 'Inventory Manager',
    role: 'manager',
    status: 'active',
    salaryType: 'month',
    salary: 4200,
    hireDate: '2021-09-10',
    department: 'Inventory',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 28,
      dayPrice: 224,
      monthPrice: 4200,
      extraHoursPrice: 38,
      autoAttendance: true,
    },
  },
  {
    id: '4',
    fullName: 'James Wilson',
    email: 'james.wilson@store.com',
    phone: '+1 555-0104',
    jobTitle: 'Cashier',
    role: 'employee',
    status: 'active',
    salaryType: 'hour',
    salary: 16,
    hireDate: '2023-01-05',
    department: 'Sales',
    settings: {
      dailyWorkHours: 6,
      hourPrice: 16,
      dayPrice: 96,
      monthPrice: 1920,
      extraHoursPrice: 22,
      autoAttendance: false,
    },
  },
  {
    id: '5',
    fullName: 'Amanda Foster',
    email: 'amanda.foster@store.com',
    phone: '+1 555-0105',
    jobTitle: 'Visual Merchandiser',
    role: 'employee',
    status: 'active',
    salaryType: 'day',
    salary: 180,
    hireDate: '2022-11-15',
    department: 'Marketing',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 22,
      dayPrice: 180,
      monthPrice: 3600,
      extraHoursPrice: 30,
      autoAttendance: true,
    },
  },
  {
    id: '6',
    fullName: 'David Thompson',
    email: 'david.thompson@store.com',
    phone: '+1 555-0106',
    jobTitle: 'Security Officer',
    role: 'employee',
    status: 'inactive',
    salaryType: 'hour',
    salary: 20,
    hireDate: '2020-08-20',
    department: 'Security',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 20,
      dayPrice: 160,
      monthPrice: 3200,
      extraHoursPrice: 28,
      autoAttendance: false,
    },
  },
  {
    id: '7',
    fullName: 'Lisa Martinez',
    email: 'lisa.martinez@store.com',
    phone: '+1 555-0107',
    jobTitle: 'Customer Service Rep',
    role: 'employee',
    status: 'active',
    salaryType: 'hour',
    salary: 17,
    hireDate: '2023-04-01',
    department: 'Customer Service',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 17,
      dayPrice: 136,
      monthPrice: 2720,
      extraHoursPrice: 24,
      autoAttendance: false,
    },
  },
  {
    id: '8',
    fullName: 'Robert Kim',
    email: 'robert.kim@store.com',
    phone: '+1 555-0108',
    jobTitle: 'Shift Supervisor',
    role: 'manager',
    status: 'active',
    salaryType: 'month',
    salary: 3800,
    hireDate: '2022-02-28',
    department: 'Operations',
    settings: {
      dailyWorkHours: 8,
      hourPrice: 24,
      dayPrice: 192,
      monthPrice: 3800,
      extraHoursPrice: 32,
      autoAttendance: true,
    },
  },
];

export const attendanceRecords: Attendance[] = [
  { id: '1', employeeId: '1', employeeName: 'Sarah Johnson', date: '2026-01-13', entryTime: '08:55', exitTime: '17:05', workedHours: 8.17, type: 'present', isAuto: true },
  { id: '2', employeeId: '2', employeeName: 'Michael Chen', date: '2026-01-13', entryTime: '09:15', exitTime: '17:30', workedHours: 8.25, type: 'late', isAuto: false },
  { id: '3', employeeId: '3', employeeName: 'Emily Rodriguez', date: '2026-01-13', entryTime: '08:45', exitTime: '17:00', workedHours: 8.25, type: 'present', isAuto: true },
  { id: '4', employeeId: '4', employeeName: 'James Wilson', date: '2026-01-13', entryTime: null, exitTime: null, workedHours: 0, type: 'absent', isAuto: false },
  { id: '5', employeeId: '5', employeeName: 'Amanda Foster', date: '2026-01-13', entryTime: '09:00', exitTime: '17:00', workedHours: 8, type: 'present', isAuto: true },
  { id: '6', employeeId: '7', employeeName: 'Lisa Martinez', date: '2026-01-13', entryTime: '08:50', exitTime: '17:10', workedHours: 8.33, type: 'present', isAuto: false },
  { id: '7', employeeId: '8', employeeName: 'Robert Kim', date: '2026-01-13', entryTime: null, exitTime: null, workedHours: 0, type: 'vacation', isAuto: false },
  // Previous days
  { id: '8', employeeId: '1', employeeName: 'Sarah Johnson', date: '2026-01-12', entryTime: '09:00', exitTime: '17:00', workedHours: 8, type: 'present', isAuto: true },
  { id: '9', employeeId: '2', employeeName: 'Michael Chen', date: '2026-01-12', entryTime: '09:00', exitTime: '17:00', workedHours: 8, type: 'present', isAuto: false },
  { id: '10', employeeId: '3', employeeName: 'Emily Rodriguez', date: '2026-01-12', entryTime: '09:05', exitTime: '17:15', workedHours: 8.17, type: 'present', isAuto: true },
];

export const payments: Payment[] = [
  { id: '1', employeeId: '1', employeeName: 'Sarah Johnson', date: '2026-01-01', amount: 5500, type: 'salary', description: 'January 2026 Salary', status: 'paid' },
  { id: '2', employeeId: '1', employeeName: 'Sarah Johnson', date: '2026-01-10', amount: 500, type: 'bonus', description: 'Performance Bonus Q4', status: 'paid' },
  { id: '3', employeeId: '2', employeeName: 'Michael Chen', date: '2026-01-01', amount: 2880, type: 'salary', description: 'January 2026 Salary', status: 'paid' },
  { id: '4', employeeId: '3', employeeName: 'Emily Rodriguez', date: '2026-01-01', amount: 4200, type: 'salary', description: 'January 2026 Salary', status: 'paid' },
  { id: '5', employeeId: '3', employeeName: 'Emily Rodriguez', date: '2026-01-05', amount: -150, type: 'deduction', description: 'Health Insurance', status: 'paid' },
  { id: '6', employeeId: '4', employeeName: 'James Wilson', date: '2026-01-01', amount: 1920, type: 'salary', description: 'January 2026 Salary', status: 'pending' },
  { id: '7', employeeId: '5', employeeName: 'Amanda Foster', date: '2026-01-01', amount: 3600, type: 'salary', description: 'January 2026 Salary', status: 'paid' },
  { id: '8', employeeId: '7', employeeName: 'Lisa Martinez', date: '2026-01-01', amount: 2720, type: 'salary', description: 'January 2026 Salary', status: 'paid' },
  { id: '9', employeeId: '8', employeeName: 'Robert Kim', date: '2026-01-01', amount: 3800, type: 'salary', description: 'January 2026 Salary', status: 'paid' },
  { id: '10', employeeId: '8', employeeName: 'Robert Kim', date: '2026-01-08', amount: 300, type: 'bonus', description: 'Holiday Bonus', status: 'paid' },
];

export const vacations: Vacation[] = [
  { id: '1', employeeId: '8', employeeName: 'Robert Kim', type: 'annual', startDate: '2026-01-13', endDate: '2026-01-17', days: 5, status: 'approved', reason: 'Family vacation' },
  { id: '2', employeeId: '2', employeeName: 'Michael Chen', type: 'sick', startDate: '2026-01-20', endDate: '2026-01-21', days: 2, status: 'pending', reason: 'Medical appointment' },
  { id: '3', employeeId: '5', employeeName: 'Amanda Foster', type: 'personal', startDate: '2026-01-25', endDate: '2026-01-25', days: 1, status: 'approved', reason: 'Personal matters' },
  { id: '4', employeeId: '1', employeeName: 'Sarah Johnson', type: 'annual', startDate: '2026-02-01', endDate: '2026-02-07', days: 7, status: 'pending', reason: 'Winter vacation' },
  { id: '5', employeeId: '3', employeeName: 'Emily Rodriguez', type: 'annual', startDate: '2025-12-24', endDate: '2025-12-31', days: 6, status: 'approved', reason: 'Holiday break' },
];

export const attendanceTypes = ['Present', 'Late', 'Absent', 'Vacation', 'Half Day'];
export const paymentTypes = ['Salary', 'Bonus', 'Deduction', 'Overtime', 'Commission'];
export const vacationTypes = ['Annual', 'Sick', 'Personal', 'Unpaid', 'Maternity/Paternity'];
export const roles = ['Admin', 'Manager', 'Employee', 'Viewer'];

export const dashboardStats = {
  totalEmployees: employees.length,
  activeEmployees: employees.filter(e => e.status === 'active').length,
  todayAttendancePercent: 85,
  monthlyPayrollTotal: payments.filter(p => p.date.startsWith('2026-01') && p.type === 'salary').reduce((sum, p) => sum + p.amount, 0),
  employeesOnVacation: vacations.filter(v => v.status === 'approved' && v.startDate <= '2026-01-13' && v.endDate >= '2026-01-13').length,
};

export const attendanceTrendData = [
  { day: 'Mon', present: 7, late: 1, absent: 0 },
  { day: 'Tue', present: 6, late: 1, absent: 1 },
  { day: 'Wed', present: 7, late: 0, absent: 1 },
  { day: 'Thu', present: 5, late: 2, absent: 1 },
  { day: 'Fri', present: 6, late: 1, absent: 1 },
  { day: 'Sat', present: 4, late: 0, absent: 0 },
  { day: 'Sun', present: 2, late: 0, absent: 0 },
];

export const payrollBreakdownData = [
  { name: 'Salaries', value: 28120, color: 'hsl(var(--chart-1))' },
  { name: 'Bonuses', value: 800, color: 'hsl(var(--chart-2))' },
  { name: 'Deductions', value: 150, color: 'hsl(var(--chart-3))' },
];

export const vacationUsageData = [
  { name: 'Used', value: 45, color: 'hsl(var(--chart-1))' },
  { name: 'Remaining', value: 115, color: 'hsl(var(--chart-2))' },
];
