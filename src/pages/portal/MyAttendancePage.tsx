import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { attendanceService } from '@/services/attendanceService';
import { formatTime, monthBounds } from '@/lib/format';

export default function MyAttendancePage() {
  const current = monthBounds();
  const [start, setStart] = useState(current.start);
  const [end, setEnd] = useState(current.end);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-attendance', start, end],
    queryFn: () => attendanceService.ownRange(start, end),
  });

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorMessage message={error instanceof Error ? error.message : undefined} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Attendance</h1>
        <p className="page-description">View your own attendance history.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        <Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
      </div>

      <DataTable
        data={data ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No attendance records found"
        columns={[
          { key: 'date', header: 'Date', render: (row) => row.work_date },
          { key: 'checkin', header: 'Check in', render: (row) => formatTime(row.check_in_time) },
          { key: 'checkout', header: 'Check out', render: (row) => formatTime(row.check_out_time) },
          { key: 'actual', header: 'Worked', render: (row) => `${Math.round(row.actual_work_minutes / 60)}h` },
          { key: 'late', header: 'Late', render: (row) => `${row.late_minutes}m` },
          { key: 'overtime', header: 'Overtime', render: (row) => `${row.overtime_minutes}m` },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />
    </div>
  );
}
