import { Vacation } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';

interface EmployeeVacationsTabProps {
  vacations: Vacation[];
  startDate?: string;
  endDate?: string;
}

export function EmployeeVacationsTab({ vacations, startDate, endDate }: EmployeeVacationsTabProps) {
  const filteredVacations = vacations.filter((v) => {
    if (!startDate || !endDate) return true;
    const start = v.start_date ?? v.startDate;
    const end = v.end_date ?? v.endDate;
    return start <= endDate && end >= startDate; // overlap check
  });

  const totalAllowed = 21; // Days per year
  const usedDays = filteredVacations.filter(v => v.status === 'approved').reduce((sum, v) => sum + v.days, 0);
  const pendingDays = filteredVacations.filter(v => v.status === 'pending').reduce((sum, v) => sum + v.days, 0);
  const remainingDays = totalAllowed - usedDays;
  const usagePercent = (usedDays / totalAllowed) * 100;

  return (
    <div className="space-y-6">
      {/* Vacation Balance */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Yearly Vacation Balance</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used: {usedDays} days</span>
            <span className="text-muted-foreground">Remaining: {remainingDays} days</span>
          </div>
          <Progress value={usagePercent} className="h-3" />
          <div className="grid gap-4 sm:grid-cols-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Allowed</p>
              <p className="text-xl font-bold">{totalAllowed} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Used</p>
              <p className="text-xl font-bold text-info">{usedDays} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-warning">{pendingDays} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold text-success">{remainingDays} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vacation History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="data-table w-full table-fixed">
          <thead>
            <tr>
              <th>Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredVacations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No vacation records found
                </td>
              </tr>
            ) : (
              filteredVacations.map((vacation) => (
                <tr key={vacation.id}>
                  <td className="capitalize font-medium">{vacation.type}</td>
                  <td>{vacation.startDate}</td>
                  <td>{vacation.endDate}</td>
                  <td>{vacation.days}</td>
                  <td className="text-muted-foreground">{vacation.reason}</td>
                  <td>
                    <StatusBadge status={vacation.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
