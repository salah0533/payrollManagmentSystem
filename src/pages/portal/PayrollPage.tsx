import { useEffect, useMemo, useState } from 'react';
import { Check, DollarSign, RefreshCw, WalletCards } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { StatCard } from '@/components/common/StatCard';
import { employeeService } from '@/services/employeeService';
import { payrollService } from '@/services/payrollService';
import { formatCurrency, formatDate, todayIso } from '@/lib/format';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [periodId, setPeriodId] = useState<string>('');

  const periodsQuery = useQuery({ queryKey: ['payroll-periods'], queryFn: payrollService.periods });
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });

  useEffect(() => {
    if (!periodId && periodsQuery.data?.length) {
      setPeriodId(String(periodsQuery.data[0].id));
    }
  }, [periodId, periodsQuery.data]);

  const periodQuery = useQuery({
    queryKey: ['payroll-period', periodId],
    queryFn: () => payrollService.period(Number(periodId)),
    enabled: Boolean(periodId),
  });

  const employeeMap = useMemo(
    () => new Map((employeesQuery.data ?? []).map((employee) => [employee.id, employee])),
    [employeesQuery.data],
  );

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-period', periodId] });
  };

  const generateMutation = useMutation({
    mutationFn: () => payrollService.generateCurrent(todayIso(), true),
    onSuccess: (period) => {
      toast.success('Payroll period generated');
      setPeriodId(String(period.id));
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not generate payroll'),
  });

  const recalculateMutation = useMutation({
    mutationFn: () => payrollService.recalculatePeriod(Number(periodId)),
    onSuccess: () => {
      toast.success('Payroll recalculated');
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not recalculate payroll'),
  });

  const approveMutation = useMutation({
    mutationFn: payrollService.approve,
    onSuccess: refreshAll,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not approve payroll'),
  });

  const paidMutation = useMutation({
    mutationFn: payrollService.markPaid,
    onSuccess: refreshAll,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not mark payroll paid'),
  });

  if (periodsQuery.isLoading || employeesQuery.isLoading) return <LoadingSkeleton rows={8} />;
  if (periodsQuery.error || employeesQuery.error) return <ErrorMessage />;

  const period = periodQuery.data;
  const totalNet = (period?.payrolls ?? []).reduce((sum, payroll) => sum + Number(payroll.net_salary || 0), 0);
  const pendingReview = (period?.payrolls ?? []).filter((payroll) => payroll.status === 'needs_review').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Payroll Control</h1>
          <p className="page-description">Generate, review, approve, and mark payroll as paid.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => recalculateMutation.mutate()} disabled={!periodId || recalculateMutation.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <WalletCards className="mr-2 h-4 w-4" />
            Generate current
          </Button>
        </div>
      </div>

      <div className="filter-panel grid gap-3 sm:grid-cols-[260px_1fr]">
        <Select value={periodId} onValueChange={setPeriodId}>
          <SelectTrigger>
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {(periodsQuery.data ?? []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-muted-foreground">
          {period ? `${formatDate(period.start_date)} to ${formatDate(period.end_date)}` : 'No payroll period selected'}
        </div>
      </div>

      {!periodId ? (
        <EmptyState title="No payroll periods yet" description="Generate the current period to start payroll review." actionLabel="Generate payroll" onAction={() => generateMutation.mutate()} />
      ) : periodQuery.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : periodQuery.error ? (
        <ErrorMessage message={periodQuery.error instanceof Error ? periodQuery.error.message : undefined} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Period Status" value={period?.status ?? 'draft'} icon={WalletCards} />
            <StatCard title="Net Payroll" value={formatCurrency(totalNet)} icon={DollarSign} tone="success" />
            <StatCard title="Needs Review" value={pendingReview} icon={RefreshCw} tone="warning" />
          </div>
          <DataTable
            data={period?.payrolls ?? []}
            getRowKey={(payroll) => payroll.id}
            emptyTitle="No payroll rows for this period"
            columns={[
              {
                key: 'employee',
                header: 'Employee',
                render: (payroll) => {
                  const employee = employeeMap.get(payroll.employee_id);
                  const name = employee?.full_name || `Employee #${payroll.employee_id}`;

                  return (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-success/10 text-xs font-semibold text-success">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        <p className="truncate text-sm text-muted-foreground">{employee?.position || payroll.salary_type}</p>
                      </div>
                    </div>
                  );
                },
              },
              { key: 'gross', header: 'Gross', render: (payroll) => formatCurrency(payroll.gross_salary) },
              { key: 'deductions', header: 'Deductions', render: (payroll) => formatCurrency(payroll.deduction_amount) },
              { key: 'net', header: 'Net', render: (payroll) => <span className="font-semibold">{formatCurrency(payroll.net_salary)}</span> },
              { key: 'status', header: 'Status', render: (payroll) => <StatusBadge status={payroll.status} /> },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (payroll) => (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => approveMutation.mutate(payroll.id)} disabled={payroll.status === 'approved' || payroll.status === 'paid' || payroll.status === 'locked'}>
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button size="sm" onClick={() => paidMutation.mutate(payroll.id)} disabled={payroll.status === 'paid' || payroll.status === 'locked'}>
                      Paid
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
