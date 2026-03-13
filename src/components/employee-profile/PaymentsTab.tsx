import { Payment } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface EmployeePaymentsTabProps {
  payments: Payment[];
  startDate?: string;
  endDate?: string;
}

export function EmployeePaymentsTab({ payments, startDate, endDate }: EmployeePaymentsTabProps) {
  const filteredPayments = payments.filter((p) => {
    if (!startDate || !endDate) return true;
    const d = String(p.date).split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const totalPaid = filteredPayments.filter(p => p.status === 'paid' && p.type === 'salary').reduce((sum, p) => sum + p.amount, 0);
  const totalBonuses = filteredPayments.filter(p => p.type === 'bonus').reduce((sum, p) => sum + p.amount, 0);
  const totalDeductions = filteredPayments.filter(p => p.type === 'deduction').reduce((sum, p) => sum + Math.abs(p.amount), 0);
  const pending = filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Bonuses</p>
          <p className="text-2xl font-bold text-info">${totalBonuses.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Deductions</p>
          <p className="text-2xl font-bold text-warning">${totalDeductions.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">${pending.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="data-table w-full table-fixed">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Description</th>
             {/* <th>Status</th> */}
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  No payment records found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-medium">{payment.date}</td>
                  <td className={cn(
                    'font-semibold',
                    payment.type === 'deduction' ? 'text-destructive' : 'text-success'
                  )}>
                    {payment.type === 'deduction' ? '-' : '+'}${Math.abs(payment.amount).toLocaleString()}
                  </td>
                  <td className="capitalize">{payment.type}</td>
                  <td className="text-muted-foreground">{payment.description}</td>
                  {/*{<td>
                    <StatusBadge status={payment.status} />
                  </td>*/}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
