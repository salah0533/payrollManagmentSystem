import { Vacation } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';

interface EmployeeVacationsTabProps {
  vacations: Vacation[];
  vacationDays?:number;
  startDate?: string;
  endDate?: string;
}

export function EmployeeVacationsTab({ vacations,vacationDays, startDate, endDate }: EmployeeVacationsTabProps) {
  const filteredVacations = vacations
    .filter((v) => {
      if (!startDate || !endDate) return true;
      return v.start_date <= endDate && v.end_date >= startDate; // overlap check
    })
    .map((v) => {
      const start = new Date(v.start_date);
      const end = new Date(v.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // include start + end
      return { ...v, days };
    });

  const totalAllowed = vacationDays ?? 0; // default to 30 if not provided
  const usedDays = filteredVacations
    .filter(v => v.vacation_status === 'proved')
    .reduce((sum, v) => sum + v.days, 0);

  const pendingDays = filteredVacations
    .filter(v => v.vacation_status === 'pending')
    .reduce((sum, v) => sum + v.days, 0);
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
                  <td className="capitalize font-medium">{vacation.vacation_type=="yearly_vacation"?"annual":vacation.vacation_type}</td>
                  <td>{vacation.start_date}</td>
                  <td>{vacation.end_date}</td>
                  <td>{vacation.days}</td>
                  <td>
                    <StatusBadge status={vacation.vacation_status} />
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
