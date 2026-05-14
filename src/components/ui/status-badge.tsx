import { formatLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-red-100 text-red-700",
  overtime: "bg-blue-100 text-blue-700",
  draft: "bg-slate-100 text-slate-700",
  needs_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  locked: "bg-violet-100 text-violet-700",
  pending: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  canceled: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-yellow-100 text-yellow-700",
  normal: "bg-info/10 text-info",
  high: "bg-destructive/10 text-destructive",
  low: "bg-muted text-muted-foreground",
  paid_vacation: "bg-green-200 text-green-800",
  not_paid_vacation: "bg-rose-200 text-rose-800",
  sick_leave: "bg-yellow-200 text-yellow-800",
  vacation: "bg-cyan-100 text-cyan-700",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  present: "Present",
  late: "Late",
  absent: "Absent",
  vacation: "Vacation",
  paid: "Paid",
  overtime: "Overtime",
  paid_vacation: "Paid Vacation",
  not_paid_vacation: "Not Paid Vacation",
  sick_leave: "Sick Leave",
  draft: "Draft",
  needs_review: "Needs Review",
  locked: "Locked",
  normal: "Normal",
  high: "High",
  low: "Low",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn("status-badge shadow-sm ring-1 ring-inset ring-current/10", statusStyles[status] || "bg-muted text-muted-foreground", className)}>
      {statusLabels[status] || formatLabel(status)}
    </span>
  );
}
