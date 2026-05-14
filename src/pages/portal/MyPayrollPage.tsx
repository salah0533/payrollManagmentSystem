import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/common/DataTable';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { StatCard } from '@/components/common/StatCard';
import { payrollService } from '@/services/payrollService';
import { formatCurrency } from '@/lib/format';
import { DollarSign, WalletCards } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EmployeeProfileRequired } from '@/components/portal/EmployeeProfileRequired';

export default function MyPayrollPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-current-payroll'],
    queryFn: payrollService.currentMine,
    enabled: Boolean(user?.employee_id),
  });

  if (!user?.employee_id) return <EmployeeProfileRequired />;

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !data) return <ErrorMessage message={error instanceof Error ? error.message : undefined} />;

  const row = data.payroll;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Payslips</h1>
        <p className="page-description">Your current payroll breakdown and payment status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Net Salary" value={formatCurrency(row.net_salary)} icon={DollarSign} tone="success" />
        <StatCard title="Gross Salary" value={formatCurrency(row.gross_salary)} icon={WalletCards} />
        <StatCard title="Status" value={row.status} icon={WalletCards} tone="info" />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{data.period.name}</h2>
            <p className="text-sm text-muted-foreground">
              {data.period.start_date} to {data.period.end_date}
            </p>
          </div>
          <StatusBadge status={row.status} />
        </div>
      </div>

      <DataTable
        data={[
          ['Base salary', row.base_salary],
          ['Normal amount', row.normal_amount],
          ['Overtime', row.overtime_amount],
          ['Bonus', row.bonus_amount],
          ['Deductions', row.deduction_amount],
          ['Late deduction', row.late_deduction_amount],
          ['Unpaid vacation', row.unpaid_vacation_deduction],
          ['Adjustments', row.adjustment_amount],
          ['Net salary', row.net_salary],
        ]}
        getRowKey={(item) => item[0]}
        columns={[
          { key: 'label', header: 'Item', render: (item) => item[0] },
          { key: 'value', header: 'Amount', render: (item) => <span className="font-semibold">{formatCurrency(item[1])}</span> },
        ]}
      />
    </div>
  );
}
