import { Payment } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface EmployeePaymentsTabProps {
  payments: Payment[];
  startDate?: string;
  endDate?: string;
  dues?: number;
}

export function EmployeePaymentsTab({ payments, startDate, endDate, dues }: EmployeePaymentsTabProps) {
  const filteredPayments = payments.filter((p) => {
    if (!startDate || !endDate) return true;
    const d = String(p.date).split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const totalPaid = filteredPayments.filter(p =>  p.payment_type == 'payment').reduce((sum, p) => sum + p.amount, 0);
  const totalBonuses = filteredPayments.filter(p => p.payment_type == 'bonus').reduce((sum, p) => sum + p.amount, 0);
  const totalDeductions = filteredPayments.filter(p => p.payment_type == 'deduction').reduce((sum, p) => sum + Math.abs(p.amount), 0);
  const totalAttendence = filteredPayments.filter(p => p.payment_type == 'attendence').reduce((sum, p) => sum + p.amount, 0);
  const employeeDues = Number(dues ?? 0);
  return (
    <div className="space-y-6">
      {/* Dues Card */}
      
        <div
          className={`rounded-lg border p-4 mb-2 ${
            employeeDues > 0
              ? "bg-emerald-50 border-emerald-200"
              : employeeDues < 0
              ? "bg-red-50 border-red-200"
              : "bg-muted border-border"
          }`}
        >
          <p className="text-sm text-muted-foreground">Employee Dues</p>

          <p
            className={`text-2xl font-bold ${
              employeeDues > 0
                ? "text-emerald-600"
                : employeeDues < 0
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          >
            {employeeDues.toLocaleString()} DA
          </p>
        </div>


      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold text-success">{totalPaid.toLocaleString()} DA</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Bonuses</p>
          <p className="text-2xl font-bold text-info">{totalBonuses.toLocaleString()} DA</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Deductions</p>
          <p className="text-2xl font-bold text-warning">{totalDeductions.toLocaleString()} DA</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Attendence</p>
          <p className="text-2xl font-bold">{totalAttendence.toLocaleString()} DA</p>
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
                    (payment.payment_type === 'deduction' || payment.payment_type === 'payment') ? 'text-destructive' : 'text-success'
                  )}>
                    {(payment.payment_type === 'deduction' || payment.payment_type === 'payment') ? '-' : '+'}{Math.abs(payment.amount).toLocaleString()} DA
                  </td>
                  <td className="capitalize">{payment.payment_type}</td>
                  <td className="text-muted-foreground">{payment.description=="" || payment.description == null ? "-" : payment.description}</td>
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
