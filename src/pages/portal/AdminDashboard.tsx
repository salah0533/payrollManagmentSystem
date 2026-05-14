import { useMemo } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Clock,
  FileCheck2,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed';
import { DonutBreakdownChart, StatusBarChart, TrendAreaChart, type ChartDatum } from '@/components/dashboard/AnalyticsCharts';
import { statsService } from '@/services/statsService';
import { userService } from '@/services/userService';
import { employeeService } from '@/services/employeeService';
import { payrollService } from '@/services/payrollService';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: statsService.overview,
  });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: userService.list });
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });
  const periodsQuery = useQuery({ queryKey: ['payroll-periods'], queryFn: payrollService.periods });

  const payrollTrend = useMemo(() => {
    const periods = periodsQuery.data ?? [];
    const realTrend = periods
      .slice(0, 6)
      .reverse()
      .map((period) => ({
        name: period.name.split(' ')[0] || formatDate(period.start_date),
        value: period.payrolls.reduce((sum, payroll) => sum + Number(payroll.net_salary || 0), 0),
      }))
      .filter((item) => item.value > 0);

    if (realTrend.length) return realTrend;

    // TODO: Replace demo analytics data with a backend payroll history endpoint when periods are empty.
    const base = Number(data?.monthly_payroll_amount || 0) || Math.max(12000, (data?.active_employees ?? 0) * 1500);
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((name, index) => ({
      name,
      value: Math.round(base * (0.82 + index * 0.035)),
    }));
  }, [data?.active_employees, data?.monthly_payroll_amount, periodsQuery.data]);

  const roleDistribution = useMemo<ChartDatum[]>(() => {
    const counts = new Map<string, number>();
    (usersQuery.data ?? []).forEach((systemUser) => {
      systemUser.roles.forEach((role) => counts.set(role.name, (counts.get(role.name) ?? 0) + 1));
    });

    return Array.from(counts.entries()).map(([name, value], index) => ({
      name,
      value,
      color: chartColors[index % chartColors.length],
    }));
  }, [usersQuery.data]);

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

  const activityItems = useMemo<ActivityItem[]>(() => {
    const alerts =
      data?.alerts?.slice(0, 4).map((alert) => ({
        title: alert.type.replace(/_/g, ' '),
        description: alert.message,
        tone: 'warning' as const,
        icon: AlertCircle,
      })) ?? [];

    const recentEmployees =
      employeesQuery.data
        ?.slice()
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 3)
        .map((employee) => ({
          title: employee.full_name,
          description: `${employee.position || 'Employee'} profile is ${employee.status}`,
          meta: formatDate(employee.created_at),
          tone: employee.status === 'active' ? ('success' as const) : ('default' as const),
          icon: Users,
        })) ?? [];

    return [...alerts, ...recentEmployees].slice(0, 6);
  }, [data?.alerts, employeesQuery.data]);

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorMessage message={error instanceof Error ? error.message : undefined} />;

  const payrollHistoryIsReal = (periodsQuery.data ?? []).some((period) => period.payrolls.length);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader
        role="admin"
        eyebrow="Admin control center"
        title={`Welcome back, ${user?.username ?? 'Admin'}`}
        description="Monitor payroll health, user access, attendance signals, and company-wide operational risk from one command view."
        icon={ShieldCheck}
        metrics={[
          { label: 'Current period', value: data?.current_payroll_status?.replace(/_/g, ' ') || 'Not generated' },
          { label: 'Attendance rate', value: `${data?.attendance_percent ?? 0}%` },
          { label: 'Employees on leave', value: data?.employees_on_leave ?? 0 },
        ]}
      >
        <Button asChild className="bg-white text-slate-950 hover:bg-white/90">
          <Link to="/admin/employees">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
          <Link to="/admin/payroll">Review Payroll</Link>
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Total Employees" value={data?.total_employees ?? 0} icon={Users} progress={100} />
        <StatCard
          title="Active Employees"
          value={data?.active_employees ?? 0}
          icon={ShieldCheck}
          tone="success"
          progress={data?.total_employees ? (data.active_employees / data.total_employees) * 100 : 0}
        />
        <StatCard title="HR Users" value={data?.hr_users ?? 0} icon={Users} tone="info" />
        <StatCard title="Pending Leave" value={data?.pending_leave_requests ?? 0} icon={CalendarDays} tone="warning" />
        <StatCard title="Attendance" value={`${data?.attendance_percent ?? 0}%`} icon={Clock} tone="info" progress={data?.attendance_percent ?? 0} />
        <StatCard title="Monthly Payroll" value={formatCurrency(data?.monthly_payroll_amount)} icon={WalletCards} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartCard
          title="Payroll Cost Trend"
          description="Net salary movement across recent payroll periods."
          badge={payrollHistoryIsReal ? 'Backend data' : 'Demo trend'}
        >
          <TrendAreaChart data={payrollTrend} valueFormatter={formatCurrency} />
        </ChartCard>

        <ChartCard title="User Role Distribution" description="System access grouped by assigned role." badge="Backend data">
          {roleDistribution.length ? (
            <DonutBreakdownChart data={roleDistribution} />
          ) : (
            <EmptyState title="No user role data" description="Create users to populate access analytics." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ChartCard title="Attendance Snapshot" description="Today status distribution across the workforce." badge="Backend data">
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

        <section className="dashboard-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Payroll Status</h2>
              <p className="text-sm text-muted-foreground">Current-period calculation and approval state.</p>
            </div>
            <StatusBadge status={data?.current_payroll_status || 'not_generated'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(data?.payroll_status_counts ?? {}).map(([status, count]) => (
              <div key={status} className="rounded-lg bg-muted/45 p-4">
                <StatusBadge status={status} />
                <p className="mt-3 text-2xl font-semibold">{count}</p>
              </div>
            ))}
            {!Object.keys(data?.payroll_status_counts ?? {}).length && (
              <EmptyState title="Payroll not generated" description="Generate the current period from Payroll Control." />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="dashboard-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Pending Work</h2>
              <p className="text-sm text-muted-foreground">Approvals and profile issues that need attention.</p>
            </div>
          </div>
          <ActivityFeed items={activityItems} />
        </section>

        <section className="dashboard-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Quick Actions</h2>
              <p className="text-sm text-muted-foreground">Common admin workflows with protected routes.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Create User', to: '/admin/users', description: 'Invite access and assign roles' },
              { label: 'Add Employee', to: '/admin/employees', description: 'Create a new employee profile' },
              { label: 'Generate Payroll', to: '/admin/payroll', description: 'Build the current pay period' },
              { label: 'Review Leave', to: '/admin/leave', description: 'Approve or reject requests' },
            ].map((action) => (
              <Button key={action.label} asChild variant="outline" className="h-auto justify-start p-4 text-left">
                <Link to={action.to}>
                  <span>
                    <span className="block font-medium">{action.label}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{action.description}</span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
