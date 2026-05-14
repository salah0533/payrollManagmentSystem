import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, MoreHorizontal, Plus, UserX } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable } from '@/components/common/DataTable';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { SearchInput } from '@/components/common/SearchInput';
import { employeeService, type EmployeePayload } from '@/services/employeeService';
import type { EmployeeRead } from '@/types/api';
import { formatCurrency, formatDate } from '@/lib/format';

const salaryTypeLabels: Record<number, string> = {
  0: 'Monthly',
  1: 'Daily',
  2: 'Hourly',
};

const baseForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: '',
  status: 'active',
  hire_date: '',
  salary_type: '0',
  month_price: '0',
  day_price: '0',
  hour_price: '0',
  extra_hours_price: '0',
  vacation_days: '0',
  daly_work_hours: '8',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/hr') ? '/hr' : '/admin';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRead | null>(null);
  const [form, setForm] = useState(baseForm);

  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employees'] });

  const saveMutation = useMutation({
    mutationFn: (payload: EmployeePayload) => (editing ? employeeService.update(editing.id, payload) : employeeService.create(payload)),
    onSuccess: () => {
      toast.success(editing ? 'Employee updated' : 'Employee created');
      setDialogOpen(false);
      setEditing(null);
      setForm(baseForm);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save employee'),
  });

  const deactivateMutation = useMutation({
    mutationFn: employeeService.deactivate,
    onSuccess: () => {
      toast.success('Employee deactivated');
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not deactivate employee'),
  });

  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const filteredEmployees = useMemo(() => {
    const term = search.toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        employee.full_name.toLowerCase().includes(term) ||
        (employee.email ?? '').toLowerCase().includes(term) ||
        employee.phone.toLowerCase().includes(term) ||
        (employee.position ?? '').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || employee.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [employees, search, status]);

  if (employeesQuery.isLoading) return <LoadingSkeleton rows={8} />;
  if (employeesQuery.error) return <ErrorMessage message={employeesQuery.error instanceof Error ? employeesQuery.error.message : undefined} />;

  const openCreate = () => {
    setEditing(null);
    setForm(baseForm);
    setDialogOpen(true);
  };

  const openEdit = (employee: EmployeeRead) => {
    setEditing(employee);
    setForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email ?? '',
      phone: employee.phone,
      position: employee.position ?? '',
      status: employee.status,
      hire_date: employee.hire_date ?? '',
      salary_type: String(employee.salary_type),
      month_price: String(employee.monthly_price ?? 0),
      day_price: String(employee.day_price ?? 0),
      hour_price: String(employee.hour_price ?? 0),
      extra_hours_price: String(employee.extra_hours_price ?? 0),
      vacation_days: String(employee.vacation_days ?? 0),
      daly_work_hours: String(employee.daily_work_hours ?? 8),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone,
      position: form.position || null,
      status: form.status,
      hire_date: form.hire_date || null,
      salary_type: Number(form.salary_type),
      month_price: Number(form.month_price),
      day_price: Number(form.day_price),
      hour_price: Number(form.hour_price),
      extra_hours_price: Number(form.extra_hours_price),
      vacation_days: Number(form.vacation_days),
      daly_work_hours: Number(form.daly_work_hours),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-description">Manage employee profiles, compensation details, and employment status.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add employee
        </Button>
      </div>

      <div className="filter-panel grid gap-3 sm:grid-cols-[1fr_180px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredEmployees}
        getRowKey={(employee) => employee.id}
        emptyTitle="No employees found"
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            render: (employee) => (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{employee.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{employee.email || employee.phone}</p>
                </div>
              </div>
            ),
          },
          { key: 'position', header: 'Position', render: (employee) => employee.position || '-' },
          { key: 'hire', header: 'Hire Date', render: (employee) => formatDate(employee.hire_date) },
          { key: 'salary', header: 'Salary', render: (employee) => formatCurrency(employee.monthly_price) },
          { key: 'type', header: 'Type', render: (employee) => salaryTypeLabels[employee.salary_type] || employee.salary_type },
          { key: 'status', header: 'Status', render: (employee) => <StatusBadge status={employee.status} /> },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (employee) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`${basePath}/employees/${employee.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(employee)}>Edit employee</DropdownMenuItem>
                  {employee.status === 'active' && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deactivateMutation.mutate(employee.id)}>
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit employee' : 'Add employee'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hire date</Label>
                <Input type="date" value={form.hire_date} onChange={(event) => setForm({ ...form, hire_date: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Salary type</Label>
                <Select value={form.salary_type} onValueChange={(value) => setForm({ ...form, salary_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Monthly</SelectItem>
                    <SelectItem value="1">Daily</SelectItem>
                    <SelectItem value="2">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly</Label>
                <Input type="number" min="0" value={form.month_price} onChange={(event) => setForm({ ...form, month_price: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Daily</Label>
                <Input type="number" min="0" value={form.day_price} onChange={(event) => setForm({ ...form, day_price: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hourly</Label>
                <Input type="number" min="0" value={form.hour_price} onChange={(event) => setForm({ ...form, hour_price: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Overtime rate</Label>
                <Input type="number" min="0" value={form.extra_hours_price} onChange={(event) => setForm({ ...form, extra_hours_price: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vacation days</Label>
                <Input type="number" min="0" value={form.vacation_days} onChange={(event) => setForm({ ...form, vacation_days: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Daily work hours</Label>
                <Input type="number" min="1" value={form.daly_work_hours} onChange={(event) => setForm({ ...form, daly_work_hours: event.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? 'Save changes' : 'Add employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
