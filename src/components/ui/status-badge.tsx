import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  present: 'bg-success/10 text-success',
  late: 'bg-warning/10 text-warning',
  absent: 'bg-destructive/10 text-destructive',
  vacation: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  proved: 'Approved',
  rejected: 'Rejected',
  canceled:"Canceled",
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  vacation: 'Vacation',
  paid: 'Paid',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  console.log('Rendering StatusBadge with status:', status);
  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
