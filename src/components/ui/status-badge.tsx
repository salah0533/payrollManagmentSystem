import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  // Attendance
  present: 'bg-emerald-100 text-emerald-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  overtime: 'bg-blue-100 text-blue-700',

  // Leave
  paid_vacation: 'bg-green-200 text-green-800',
  not_paid_vacation: 'bg-rose-200 text-rose-800',
  sick_leave: 'bg-yellow-200 text-yellow-800',

  // Optional (if still used elsewhere)
  vacation: 'bg-cyan-100 text-cyan-700',
  paid: 'bg-green-100 text-green-700',

  // Workflow
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  proved: 'bg-green-100 text-green-700', // typo fallback
  rejected: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',

  // Misc
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  canceled:"Canceled",
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  vacation: 'Vacation',
  paid: 'Paid',
  overtime:"Overtime",
  "paid_vacation":'Paid Vacation',
  "not_paid_vacation":'Not Paid Vacation',
  "sick_leave":'Sick Leave',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
