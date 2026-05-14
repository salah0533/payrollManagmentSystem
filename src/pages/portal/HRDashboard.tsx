import { useMemo } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, UserPlus, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed';
import { DonutBreakdownChart, StatusBarChart, type ChartDatum } from '@/components/dashboard/AnalyticsCharts';
import { statsService } from '@/services/statsService';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { lookupService } from '@/services/lookupService';
import { useAuth } from '@/context/AuthContext';
import { daysBetweenInclusive, formatCurrency, formatDate } from '@/lib/format';

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function HRDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: statsService.overview,
  });
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });
  const leaveQuery = useQuery({ queryKey: ['vacations', 'current'], queryFn: leaveService.current });
  const statusesQuery = useQuery({ queryKey: ['vacation-statuses'], queryFn: lookupService.vacationStatuses });

  const attendanceSummary = useMemo<ChartDatum[]>(() => {
    const summary = data?.attendance_summary ?? {};
    return [
      {
        name: 'Today',
        present: Number(summary.present ?? 0),
        late: Number(summary.late ?? 0),
        absent: Number(summary.absent ?? 0),
        vacation: Number(summary.vacation ?? summary.paid_vacation ?? 0),
      },
    ];
  }, [data?.attendance_summary]);

  const statusMap = useMemo(
    () => new Map((statusesQuery.data ?? []).map((status) => [status.id, status.vacation_status || status.code || String(status.id)])),
    [statusesQuery.data],
  );

  const leaveStatusData = useMemo<ChartDatum[]>(() => {
    const counts = new Map<string, number>();
    (leaveQuery.data ?? []).forEach((leave) => {
      const label = statusMap.get(leave.vacation_status) || String(leave.vacation_status);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value], index) => ({
      name,
      value,
      color: chartColors[index % chartColors.length],
    }));
  }, [leaveQuery.data, statusMap]);

  const employeeMix = useMemo<ChartDatum[]>(() => {
    const counts = new Map<string, number>();
    (employeesQuery.data ?? []).forEach((employee) => {
      const label = employee.position || `Department ${employee.department_id ?? 'Unassigned'}`;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    const topGroups = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return topGroups.map(([name, value], index) => ({
      name,
      value,
      color: chartColors[index % chartColors.length],
    }));
  }, [employeesQuery.data]);

  const newJoiners = useMemo(() => {
    const threshold = Date.now() - 60 * 86400000;
    return (employeesQuery.data ?? []).filter((employee) => {
      if (!employee.hire_date) return false;
      return new Date(employee.hire_date).getTime() >= threshold;
    });
  }, [employeesQuery.data]);

  const pendingLeaves = (leaveQuery.data ?? []).filter((leave) => {
    const label = statusMap.get(leave.vacation_status)?.toLowerCase();
    return label === 'pending' || leave.vacation_status === 0;
  });

  const taskItems = useMemo<ActivityItem[]>(() => {
    const leaveTasks = pendingLeaves.slice(0, 4).map((leave) => ({
      title: `Leave request #${leave.id}`,
      description: `${daysBetweenInclusive(leave.start_date, leave.end_date)} days from ${leave.start_date} to ${leave.end_date}`,
      meta: statusMap.get(leave.vacation_status) || 'Pending',
      tone: 'warning' as const,
      icon: CalendarDays,
    }));

    const alerts =
      data?.alerts?.slice(0, 3).map((alert) => ({
        title: alert.type.replace(/_/g, ' '),
        description: alert.message,
        tone: 'info' as const,
        icon: AlertCircle,
      })) ?? [];

    return [...leaveTasks, ...alerts].slice(0, 6);
  }, [data?.alerts, pendingLeaves, statusMap]);

  if (isLoading || employeesQuery.isLoading || leaveQuery.isLoading || statusesQuery.isLoading) {
    return <LoadingSkeleton rows={6} />;
  }
  if (error || employeesQuery.error || leaveQuery.error || statusesQuery.error) {
    return <ErrorMessage message={error instanceof Error ? error.message : undefined} />;
  }

  const presentToday = Number(data?.attendance_summary?.present ?? 0);
  const lateToday = Number(data?.attendance_summary?.late ?? 0);
  const openTasks = pendingLeaves.length + (data?.alerts?.length ?? 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader
        role="hr"
        eyebrow="People operations"
        title={`Good to see you, ${user?.username ?? 'HR'}`}
        description="A daily workspace for attendance follow-up, leave approvals, employee updates, and payroll readiness."
        icon={Users}
        metrics={[
          { label: 'Present today', value: presentToday },
          { label: 'Late arrivals', value: lateToday },
          { label: 'Open HR tasks', value: openTasks },
        ]}
      >
        <Button asChild className="bg-white text-emerald-950 hover:bg-white/90">
          <Link to="/hr/employees">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
          <Link to="/hr/leave">Review Leave</Link>
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Employees" value={data?.total_employees ?? 0} icon={Users} />
        <StatCard title="Active" value={data?.active_employees ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard title="Pending Leaves" value={data?.pending_leave_requests ?? 0} icon={CalendarDays} tone="warning" />
        <StatCard title="Present Today" value={presentToday} icon={Clock} tone="success" />
        <StatCard title="Late Today" value={lateToday} icon={Clock} tone="warning" />
        <StatCard title="Payroll Draft" value={formatCurrency(data?.monthly_payroll_amount)} icon={WalletCards} tone="info" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Attendance by Status" description="Today attendance grouped for operational follow-up." badge="Backend data">
          <StatusBarChart
            data={attendanceSummary}
            bars={[
              { key: 'present', name: 'Present', color: 'hsl(var(--success))' },
              { key: 'late', name: 'Late', color: 'hsl(var(--warning))' },
              { key: 'absent', name: 'Absent', color: 'hsl(var(--destructive))' },
              { key: 'vacation', name: 'Vacation', color: 'hsl(var(--info))' },
            ]}
          />
        </ChartCard>

        <ChartCard title="Leave Request Status" description="Current leave requests by review state." badge="Backend data">
          {leaveStatusData.length ? (
            <DonutBreakdownChart data={leaveStatusData} />
          ) : (
            <EmptyState title="No active leave requests" description="New requests will appear here for HR review." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <ChartCard title="Team Composition" description="Employees grouped by position or department reference." badge="Backend data">
          {employeeMix.length ? (
            <DonutBreakdownChart data={employeeMix} />
          ) : (
            <EmptyState title="No employee groups" description="Add positions or departments to improve people analytics." />
          )}
        </ChartCard>

        <section className="dashboard-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">HR Task Queue</h2>
              <p className="text-sm text-muted-foreground">Pending leave, profile, and attendance items.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/hr/leave">Open requests</Link>
            </Button>
          </div>
          <ActivityFeed items={taskItems} />
        </section>
      </div>

      <section className="dashboard-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">New Joiners</h2>
            <p className="text-sm text-muted-foreground">Employees hired in the last 60 days.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/hr/employees">View employees</Link>
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {newJoiners.length ? (
            newJoiners.slice(0, 6).map((employee) => (
              <div key={employee.id} className="rounded-lg bg-muted/40 p-4">
                <p className="font-medium">{employee.full_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{employee.position || 'Employee'}</p>
                <p className="mt-3 text-xs text-muted-foreground">Hired {formatDate(employee.hire_date)}</p>
              </div>
            ))
          ) : (
            <EmptyState title="No recent joiners" description="New hires will appear here after employee profiles are created." />
          )}
        </div>
      </section>
    </div>
  );
}
