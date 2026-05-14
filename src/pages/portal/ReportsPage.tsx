import { CalendarDays, Clock, FileText, Users, WalletCards } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { statsService } from '@/services/statsService';
import { formatCurrency } from '@/lib/format';

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: statsService.overview,
  });

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorMessage message={error instanceof Error ? error.message : undefined} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-description">Operational summaries built from current backend data.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Employee Report" value={data?.total_employees ?? 0} description="employees in system" icon={Users} />
        <StatCard title="Attendance Report" value={`${data?.attendance_percent ?? 0}%`} description="current attendance rate" icon={Clock} tone="info" />
        <StatCard title="Payroll Report" value={formatCurrency(data?.monthly_payroll_amount)} description="current month amount" icon={WalletCards} tone="success" />
        <StatCard title="Vacation Report" value={data?.pending_leave_requests ?? 0} description="pending requests" icon={CalendarDays} tone="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['Payroll report', 'Payroll period totals, employee net pay, and status distribution.'],
          ['Attendance report', 'Daily present, late, absent, and vacation summaries.'],
          ['Employee report', 'Active headcount, profile completeness, and compensation readiness.'],
          ['Vacation report', 'Pending, approved, rejected, and current leave records.'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button size="sm" disabled>
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
