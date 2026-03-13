import { Attendance } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';

interface AttendanceTabProps {
  records: Attendance[];
  startDate?: string;
  endDate?: string;
}

export function EmployeeAttendanceTab({ records, startDate, endDate }: AttendanceTabProps) {
  const filteredRecords = records.filter((r) => {
    if (!startDate || !endDate) return true;
    return r.date >= startDate && r.date <= endDate;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Present</p>
          <p className="text-2xl font-bold text-success">
            {filteredRecords.filter(r => r.type === 'present').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Late Arrivals</p>
          <p className="text-2xl font-bold text-warning">
            {filteredRecords.filter(r => r.type === 'late').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Absent Days</p>
          <p className="text-2xl font-bold text-destructive">
            {filteredRecords.filter(r => r.type === 'absent').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold">
            {filteredRecords.reduce((sum, r) => sum + r.workedHours, 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="data-table w-full table-fixed">
          <thead>
            <tr>
              <th>Date</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Worked Hours</th>
              <th>Type</th>
              <th>Auto</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No attendance records found
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="font-medium">{record.date}</td>
                  <td>{record.entryTime || '-'}</td>
                  <td>{record.exitTime || '-'}</td>
                  <td>{record.workedHours > 0 ? `${record.workedHours}h` : '-'}</td>
                  <td>
                    <StatusBadge status={record.type} />
                  </td>
                  <td>
                    {record.isAuto && (
                      <Badge variant="outline" className="text-xs">Auto</Badge>
                    )}
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
