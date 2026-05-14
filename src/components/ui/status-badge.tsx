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
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-info/10 text-info',
  needs_review: 'bg-warning/10 text-warning',
  locked: 'bg-primary/10 text-primary',
  not_generated: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  suspended: 'bg-warning/10 text-warning',
  incomplete: 'bg-warning/10 text-warning',
  unpaid_vacation: 'bg-destructive/10 text-destructive',
  paid_vacation: 'bg-info/10 text-info',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  vacation: 'Vacation',
  paid: 'Paid',
  draft: 'Draft',
  reviewed: 'Reviewed',
  needs_review: 'Needs review',
  locked: 'Locked',
  not_generated: 'Not generated',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
  incomplete: 'Incomplete',
  unpaid_vacation: 'Unpaid vacation',
  paid_vacation: 'Paid vacation',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = String(status || 'unknown').toLowerCase();
  const label = statusLabels[normalized] || normalized.replace(/_/g, ' ');
  return (
    <span className={cn('status-badge capitalize', statusStyles[normalized] || 'bg-muted text-muted-foreground', className)}>
      {label}
    </span>
  );
}
