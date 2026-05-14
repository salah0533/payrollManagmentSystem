import {
  BadgeHelp,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  Settings,
  User,
  Users,
  WalletCards,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { RoleCode } from '@/types/api';

export interface NavigationItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

export const roleNavigation: Record<RoleCode, NavigationItem[]> = {
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users & Roles' },
    { to: '/admin/employees', icon: BriefcaseBusiness, label: 'Employees' },
    { to: '/admin/payroll', icon: WalletCards, label: 'Payroll' },
    { to: '/admin/attendance', icon: Clock, label: 'Attendance' },
    { to: '/admin/leave', icon: CalendarDays, label: 'Leave Requests' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
  hr: [
    { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hr/employees', icon: BriefcaseBusiness, label: 'Employees' },
    { to: '/hr/attendance', icon: Clock, label: 'Attendance' },
    { to: '/hr/leave', icon: CalendarDays, label: 'Leave Requests' },
    { to: '/hr/payroll', icon: WalletCards, label: 'Payroll Assistance' },
    { to: '/hr/records', icon: ClipboardList, label: 'HR Records' },
  ],
  employee: [
    { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/profile', icon: User, label: 'My Profile' },
    { to: '/employee/attendance', icon: Clock, label: 'My Attendance' },
    { to: '/employee/payroll', icon: WalletCards, label: 'My Payslips' },
    { to: '/employee/leave', icon: CalendarDays, label: 'My Leave' },
    { to: '/employee/requests', icon: BadgeHelp, label: 'Requests' },
  ],
};
