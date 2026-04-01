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

  const getType = (record: any) => String(record?.attendence_type ?? '').trim().toLowerCase();

  const workedHours = filteredRecords.map((r: any) => {
    const entryRaw = r.entry_time ? String(r.entry_time).split('.')[0] : '';
    const exitRaw = r.exit_time ? String(r.exit_time).split('.')[0] : '';
    if (!entryRaw || !exitRaw) return [0, 0];

    const entry = new Date(`${r.date}T${entryRaw}`);
    const exit = new Date(`${r.date}T${exitRaw}`);
    if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) return 0;

    const diff = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60);
    const hours = Math.floor(diff);
    const minutes = Math.round((diff - hours) * 60);

    return diff > 0 ? [hours, minutes] : [0, 0];
  });
  const totalPresent = filteredRecords.filter((r: any) => getType(r) === 'present').length;
  const totalLate = filteredRecords.filter((r: any) => getType(r) === 'late').length;
  const totalAbsent = filteredRecords.filter((r: any) => getType(r) === 'absent').length;
  const totalHours = workedHours.reduce((sum, h) => sum + h[0], 0);
  const totalMinutes = workedHours.reduce((sum, h) => sum + h[1], 0);
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Present</p>
          <p className="text-2xl font-bold text-success">{totalPresent}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Late Arrivals</p>
          <p className="text-2xl font-bold text-warning">{totalLate}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Absent Days</p>
          <p className="text-2xl font-bold text-destructive">{totalAbsent}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold">{totalHours}h {totalMinutes.toString().padStart(2, '0')}</p>
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
              filteredRecords.map((record,index) => (
                <tr key={record.id}>
                  <td className="font-medium">{record.date}</td>
                  <td>{record.entry_time ? record.entry_time.split(".")[0] || '-' : '-'}</td>
                  <td>{record.exit_time ? record.exit_time.split(".")[0] || '-' : '-'}</td>
                  <td>{workedHours[index][0] > 0 ? `${workedHours[index][0]}h ${workedHours[index][1].toString().padStart(2, '0')}` : '-'}</td>
                  <td>
                    <StatusBadge status={record.attendence_type?.toLowerCase()} />
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
