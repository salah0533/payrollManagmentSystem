import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, WalletCards } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { StatCard } from '@/components/common/StatCard';
import { employeeService } from '@/services/employeeService';
import { attendanceService } from '@/services/attendanceService';
import { formatCurrency, formatDate, monthBounds } from '@/lib/format';

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/hr') ? '/hr' : '/admin';
  const id = Number(employeeId);
  const month = monthBounds();

  const employeeQuery = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.get(id),
    enabled: Boolean(id),
  });
  const attendanceQuery = useQuery({
    queryKey: ['employee-attendance', id, month.start, month.end],
    queryFn: () => attendanceService.employeeRange(id, month.start, month.end),
    enabled: Boolean(id),
  });

  if (employeeQuery.isLoading || attendanceQuery.isLoading) return <LoadingSkeleton rows={6} />;
  if (employeeQuery.error || attendanceQuery.error || !employeeQuery.data) return <ErrorMessage />;

  const employee = employeeQuery.data;
  const initials = employee.full_name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" asChild>
        <Link to={`${basePath}/employees`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to employees
        </Link>
      </Button>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-xl text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold">{employee.full_name}</h1>
                <StatusBadge status={employee.status} />
              </div>
              <p className="mt-1 text-muted-foreground">{employee.position || 'Employee'}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {employee.email || 'No email'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </span>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Hired {formatDate(employee.hire_date)}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Monthly Salary" value={formatCurrency(employee.monthly_price)} icon={WalletCards} tone="success" />
        <StatCard title="Dues" value={formatCurrency(employee.dues)} icon={WalletCards} tone="warning" />
        <StatCard title="Vacation Days" value={employee.vacation_days} icon={WalletCards} tone="info" />
        <StatCard title="Attendance Records" value={attendanceQuery.data?.length ?? 0} icon={WalletCards} />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Employment Details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Employee ID</dt>
            <dd className="font-medium">{employee.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Department</dt>
            <dd className="font-medium">{employee.department_id ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Daily work hours</dt>
            <dd className="font-medium">{employee.daily_work_hours}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Hourly rate</dt>
            <dd className="font-medium">{formatCurrency(employee.hour_price)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Daily rate</dt>
            <dd className="font-medium">{formatCurrency(employee.day_price)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Overtime rate</dt>
            <dd className="font-medium">{formatCurrency(employee.extra_hours_price)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
