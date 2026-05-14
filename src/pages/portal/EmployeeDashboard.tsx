import { useMemo } from 'react';
import { CalendarDays, Clock, FileText, User, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/ui/status-badge';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { DonutBreakdownChart, StatusBarChart, type ChartDatum } from '@/components/dashboard/AnalyticsCharts';
import { attendanceService } from '@/services/attendanceService';
import { leaveService } from '@/services/leaveService';
import { payrollService } from '@/services/payrollService';
import { selfService } from '@/services/selfService';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, monthBounds } from '@/lib/format';
import { EmployeeProfileRequired } from '@/components/portal/EmployeeProfileRequired';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const month = monthBounds();

  const profileQuery = useQuery({
    queryKey: ['employee-profile', user?.employee_id],
    queryFn: selfService.profile,
    enabled: Boolean(user?.employee_id),
  });
  const payrollQuery = useQuery({
    queryKey: ['my-current-payroll'],
    queryFn: payrollService.currentMine,
    enabled: Boolean(user?.employee_id),
    retry: false,
  });
  const leaveQuery = useQuery({
    queryKey: ['my-leave'],
    queryFn: leaveService.own,
    enabled: Boolean(user?.employee_id),
  });
  const attendanceQuery = useQuery({
    queryKey: ['my-attendance', month.start, month.end],
    queryFn: () => attendanceService.ownRange(month.start, month.end),
    enabled: Boolean(user?.employee_id),
  });

  const profile = profileQuery.data;
  const attendance = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data]);
  const leave = useMemo(() => leaveQuery.data ?? [], [leaveQuery.data]);
  const payroll = payrollQuery.data?.payroll;

  const approvedLeaveDays = leave
    .filter((item) => item.vacation_status === 1)
    .reduce((sum, item) => sum + Math.max(1, (new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / 86400000 + 1), 0);
  const remainingLeave = Math.max(0, (profile?.vacation_days ?? 0) - approvedLeaveDays);
  const presentDays = attendance.filter((item) => ['present', 'late'].includes(item.status)).length;
  const attendanceRate = attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0;
  const pendingRequests = leave.filter((item) => item.vacation_status === 0).length;
  const profileFields = [profile?.first_name, profile?.last_name, profile?.email, profile?.phone, profile?.position, profile?.hire_date];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  const salaryBreakdown = useMemo<ChartDatum[]>(() => {
    if (!payroll) return [];
    const deductions =
      Number(payroll.deduction_amount || 0) +
      Number(payroll.late_deduction_amount || 0) +
      Number(payroll.unpaid_vacation_deduction || 0);

    return [
      { name: 'Base salary', value: Number(payroll.base_salary || 0), color: 'hsl(var(--chart-1))' },
      { name: 'Overtime', value: Number(payroll.overtime_amount || 0), color: 'hsl(var(--chart-2))' },
      { name: 'Bonus', value: Number(payroll.bonus_amount || 0), color: 'hsl(var(--chart-3))' },
      { name: 'Deductions', value: deductions, color: 'hsl(var(--chart-5))' },
    ].filter((item) => Number(item.value) > 0);
  }, [payroll]);

  const attendanceTrend = useMemo<ChartDatum[]>(() => {
    return attendance.slice(-10).map((record) => ({
      name: new Date(record.work_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present: ['present', 'late'].includes(record.status) ? 1 : 0,
      late: record.late_minutes > 0 || record.status === 'late' ? 1 : 0,
      absent: record.status === 'absent' ? 1 : 0,
    }));
  }, [attendance]);

  if (!user?.employee_id) {
    return <EmployeeProfileRequired />;
  }

  if (profileQuery.isLoading || leaveQuery.isLoading || attendanceQuery.isLoading) {
    return <LoadingSkeleton rows={6} />;
  }
  if (profileQuery.error || leaveQuery.error || attendanceQuery.error) {
    return <ErrorMessage />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader
        role="employee"
        eyebrow="Employee self-service"
        title={`Hi, ${profile?.first_name || user?.username || 'there'}`}
        description="Your payroll, attendance, leave balance, and profile status in a calm personal workspace."
        icon={User}
        metrics={[
          { label: 'Department', value: profile?.department_id ? `Department ${profile.department_id}` : 'Not assigned' },
          { label: 'Position', value: profile?.position || 'Employee' },
          { label: 'Payroll status', value: payroll?.status?.replace(/_/g, ' ') || 'Not generated' },
        ]}
      >
        <Button asChild className="bg-white text-blue-950 hover:bg-white/90">
          <Link to="/employee/leave">
            <CalendarDays className="mr-2 h-4 w-4" />
            Request Leave
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
          <Link to="/employee/payroll">View Payslip</Link>
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Net Salary" value={formatCurrency(payroll?.net_salary)} description={payrollQuery.data?.period.name} icon={WalletCards} tone="success" />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} description="current month" icon={Clock} tone="info" progress={attendanceRate} />
        <StatCard title="Leave Balance" value={remainingLeave} description="days remaining" icon={CalendarDays} tone="success" />
        <StatCard title="Pending Requests" value={pendingRequests} description="leave requests" icon={FileText} tone="warning" />
        <StatCard title="Profile Completion" value={`${profileCompletion}%`} icon={User} progress={profileCompletion} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="dashboard-card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold">My Profile Summary</h2>
            <p className="text-sm text-muted-foreground">Core employee details connected to your account.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
            <ProgressRing value={profileCompletion} label="Complete" tone="info" description="Keep profile details current for payroll accuracy." />
            <div className="space-y-3">
              {[
                ['Full name', profile?.full_name],
                ['Email', profile?.email || user?.email],
                ['Position', profile?.position],
                ['Hire date', profile?.hire_date],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="truncate font-medium">{value || 'Not set'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ChartCard title="Attendance This Month" description="Your recent attendance status across recorded work days." badge="Backend data">
          {attendanceTrend.length ? (
            <StatusBarChart
              data={attendanceTrend}
              bars={[
                { key: 'present', name: 'Present', color: 'hsl(var(--success))' },
                { key: 'late', name: 'Late', color: 'hsl(var(--warning))' },
                { key: 'absent', name: 'Absent', color: 'hsl(var(--destructive))' },
              ]}
            />
          ) : (
            <EmptyState title="No attendance records" description="Your monthly attendance will appear after records are added." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Salary Breakdown" description="Current payroll components from your latest period." badge="Backend data">
          {salaryBreakdown.length ? (
            <DonutBreakdownChart data={salaryBreakdown} valueFormatter={formatCurrency} />
          ) : (
            <EmptyState title="No current payroll" description="A payslip breakdown will appear after payroll is generated." />
          )}
        </ChartCard>

        <section className="dashboard-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Leave Balance</h2>
              <p className="text-sm text-muted-foreground">Used and remaining leave from your allocation.</p>
            </div>
            <StatusBadge status={pendingRequests ? 'pending' : 'active'} />
          </div>
          <div className="grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
            <ProgressRing
              value={profile?.vacation_days ? (approvedLeaveDays / profile.vacation_days) * 100 : 0}
              label="Used"
              tone="success"
            />
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Annual allowance</p>
                <p className="mt-1 text-2xl font-semibold">{profile?.vacation_days ?? 0} days</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="text-lg font-semibold">{approvedLeaveDays}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold">{remainingLeave}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
