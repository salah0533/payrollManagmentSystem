import { Vacation } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';

interface EmployeeVacationsTabProps {
  vacations: Vacation[];
  startDate?: string;
  endDate?: string;
}

export function EmployeeVacationsTab({ vacations, startDate, endDate }: EmployeeVacationsTabProps) {
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

  return (
    <div className="space-y-6">
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
