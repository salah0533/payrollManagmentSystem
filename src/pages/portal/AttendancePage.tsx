import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable } from '@/components/common/DataTable';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { SearchInput } from '@/components/common/SearchInput';
import { attendanceService } from '@/services/attendanceService';
import { employeeService } from '@/services/employeeService';
import { formatTime, todayIso } from '@/lib/format';

const attendanceTypes: Record<number, string> = {
  0: 'present',
  1: 'late',
  2: 'absent',
  3: 'overtime',
  4: 'paid_vacation',
  5: 'unpaid_vacation',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    entry_time: '09:00',
    exit_time: '17:00',
    attendence_type: '0',
  });

  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });
  const attendanceQuery = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => attendanceService.byDate(date),
  });

  const employeeMap = useMemo(
    () => new Map((employeesQuery.data ?? []).map((employee) => [employee.id, employee])),
    [employeesQuery.data],
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (attendanceQuery.data ?? []).filter((record) => {
      const employee = employeeMap.get(record.employee_id);
      const status = attendanceTypes[record.attendence_type] || 'other';
      const matchesSearch = employee?.full_name.toLowerCase().includes(term) || String(record.employee_id).includes(term);
      const matchesType = type === 'all' || status === type;
      return matchesSearch && matchesType;
    });
  }, [attendanceQuery.data, employeeMap, search, type]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['attendance', date] });

  const saveMutation = useMutation({
    mutationFn: attendanceService.save,
    onSuccess: () => {
      toast.success('Attendance saved');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save attendance'),
  });

  const markAllMutation = useMutation({
    mutationFn: attendanceService.markAllPresent,
    onSuccess: (result) => {
      toast.success(`Attendance updated (${result.created} created, ${result.updated} updated)`);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not mark attendance'),
  });

  if (employeesQuery.isLoading || attendanceQuery.isLoading) return <LoadingSkeleton rows={8} />;
  if (employeesQuery.error || attendanceQuery.error) return <ErrorMessage />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate({
      employee_id: Number(form.employee_id),
      date,
      entry_time: form.attendence_type === '2' ? null : form.entry_time,
      exit_time: form.attendence_type === '2' ? null : form.exit_time,
      attendence_type: Number(form.attendence_type),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-description">View, filter, and correct daily attendance records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all present
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add attendance
          </Button>
        </div>
      </div>

      <div className="filter-panel grid gap-3 md:grid-cols-[180px_1fr_180px]">
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search employee..." />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.values(attendanceTypes).map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        getRowKey={(record) => record.id}
        emptyTitle="No attendance records found"
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            render: (record) => {
              const employee = employeeMap.get(record.employee_id);
              const name = employee?.full_name || `Employee #${record.employee_id}`;

              return (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-info/10 text-xs font-semibold text-info">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="truncate text-sm text-muted-foreground">{employee?.position || 'Attendance record'}</p>
                  </div>
                </div>
              );
            },
          },
          { key: 'date', header: 'Date', render: (record) => record.date },
          { key: 'entry', header: 'Entry', render: (record) => formatTime(record.entry_time) },
          { key: 'exit', header: 'Exit', render: (record) => formatTime(record.exit_time) },
          { key: 'type', header: 'Type', render: (record) => <StatusBadge status={attendanceTypes[record.attendence_type] || 'other'} /> },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add or correct attendance</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={(value) => setForm({ ...form, employee_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employeesQuery.data ?? []).map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Entry</Label>
                <Input type="time" value={form.entry_time} onChange={(event) => setForm({ ...form, entry_time: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Exit</Label>
                <Input type="time" value={form.exit_time} onChange={(event) => setForm({ ...form, exit_time: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.attendence_type} onValueChange={(value) => setForm({ ...form, attendence_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(attendanceTypes).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.employee_id}>
                Save attendance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
