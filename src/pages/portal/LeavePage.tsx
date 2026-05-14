import { FormEvent, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
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
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { lookupService } from '@/services/lookupService';
import { daysBetweenInclusive, todayIso } from '@/lib/format';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function LeavePage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    start_date: todayIso(),
    end_date: todayIso(),
    vacation_type: '0',
    vacation_status: '0',
    is_paid: 'true',
  });

  const vacationsQuery = useQuery({
    queryKey: ['vacations', year],
    queryFn: () => leaveService.listByYear(Number(year)),
  });
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });
  const typesQuery = useQuery({ queryKey: ['vacation-types'], queryFn: lookupService.vacationTypes });
  const statusesQuery = useQuery({ queryKey: ['vacation-statuses'], queryFn: lookupService.vacationStatuses });

  const employeeMap = useMemo(() => new Map((employeesQuery.data ?? []).map((employee) => [employee.id, employee])), [employeesQuery.data]);
  const typeMap = useMemo(() => new Map((typesQuery.data ?? []).map((item) => [item.id, item.vacation_type || item.code || String(item.id)])), [typesQuery.data]);
  const statusMap = useMemo(() => new Map((statusesQuery.data ?? []).map((item) => [item.id, item.vacation_status || item.code || String(item.id)])), [statusesQuery.data]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (vacationsQuery.data ?? []).filter((vacation) => {
      const employee = employeeMap.get(vacation.employee_id);
      const label = statusMap.get(vacation.vacation_status) || String(vacation.vacation_status);
      const matchesSearch = employee?.full_name.toLowerCase().includes(term) || String(vacation.employee_id).includes(term);
      const matchesStatus = status === 'all' || label === status;
      return matchesSearch && matchesStatus;
    });
  }, [employeeMap, search, status, statusMap, vacationsQuery.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vacations', year] });

  const createMutation = useMutation({
    mutationFn: leaveService.create,
    onSuccess: () => {
      toast.success('Leave request created');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not create leave request'),
  });

  const updateMutation = useMutation({
    mutationFn: leaveService.update,
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not update request'),
  });

  if (vacationsQuery.isLoading || employeesQuery.isLoading || typesQuery.isLoading || statusesQuery.isLoading) return <LoadingSkeleton rows={8} />;
  if (vacationsQuery.error || employeesQuery.error || typesQuery.error || statusesQuery.error) return <ErrorMessage />;

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      employee_id: Number(form.employee_id),
      start_date: form.start_date,
      end_date: form.end_date,
      vacation_type: Number(form.vacation_type),
      vacation_status: Number(form.vacation_status),
      is_paid: form.is_paid === 'true',
    });
  };

  const statusOptions = [...new Set([...statusMap.values()])];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Leave Requests</h1>
          <p className="page-description">Review, approve, reject, and record employee leave.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add leave
        </Button>
      </div>

      <div className="filter-panel grid gap-3 md:grid-cols-[140px_1fr_180px]">
        <Input type="number" value={year} onChange={(event) => setYear(event.target.value)} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search employee..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {statusOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        getRowKey={(vacation) => vacation.id}
        emptyTitle="No leave requests found"
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            render: (vacation) => {
              const employee = employeeMap.get(vacation.employee_id);
              const name = employee?.full_name || `Employee #${vacation.employee_id}`;

              return (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-warning/10 text-xs font-semibold text-warning">
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="truncate text-sm text-muted-foreground">{employee?.position || 'Leave request'}</p>
                  </div>
                </div>
              );
            },
          },
          { key: 'type', header: 'Type', render: (vacation) => typeMap.get(vacation.vacation_type) || vacation.vacation_type },
          { key: 'start', header: 'Start', render: (vacation) => vacation.start_date },
          { key: 'end', header: 'End', render: (vacation) => vacation.end_date },
          { key: 'days', header: 'Days', render: (vacation) => daysBetweenInclusive(vacation.start_date, vacation.end_date) },
          { key: 'status', header: 'Status', render: (vacation) => <StatusBadge status={statusMap.get(vacation.vacation_status) || 'pending'} /> },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (vacation) => (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: vacation.id, vacation_status: 1 })}>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: vacation.id, vacation_status: 3 })}>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add leave request</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.vacation_type} onValueChange={(value) => setForm({ ...form, vacation_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(typesQuery.data ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.vacation_type || item.code || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.vacation_status} onValueChange={(value) => setForm({ ...form, vacation_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(statusesQuery.data ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.vacation_status || item.code || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paid</Label>
                <Select value={form.is_paid} onValueChange={(value) => setForm({ ...form, is_paid: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Paid</SelectItem>
                    <SelectItem value="false">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !form.employee_id}>
                Save leave
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
