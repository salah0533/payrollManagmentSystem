import { FormEvent, useMemo, useState } from 'react';
import { MoreHorizontal, Plus, RotateCcw, ShieldCheck, UserCheck, UserX } from 'lucide-react';
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
import { RoleBadge } from '@/components/common/RoleBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { DataTable } from '@/components/common/DataTable';
import { userService } from '@/services/userService';
import { employeeService } from '@/services/employeeService';
import type { UserRead } from '@/types/api';

const emptyForm = {
  username: '',
  email: '',
  password: '',
  employee_id: '',
  role_id: '',
};

const initials = (value: string) =>
  value
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRead | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(emptyForm);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: userService.list });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: userService.roles });
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: employeeService.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      toast.success('User created');
      setCreateOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not create user'),
  });

  const activateMutation = useMutation({
    mutationFn: (user: UserRead) => (user.is_active ? userService.deactivate(user.id) : userService.activate(user.id)),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not update user'),
  });

  const resetMutation = useMutation({
    mutationFn: () => userService.resetPassword(resetUser!.id, newPassword),
    onSuccess: () => {
      toast.success('Password reset');
      setResetUser(null);
      setNewPassword('');
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not reset password'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ user, roleId }: { user: UserRead; roleId: number }) => userService.assignRoles(user.id, [roleId]),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not assign role'),
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(term) ||
        (user.email ?? '').toLowerCase().includes(term) ||
        user.roles.some((role) => role.code.toLowerCase().includes(term));
      const matchesRole = roleFilter === 'all' || user.roles.some((role) => role.code === roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, users]);

  if (usersQuery.isLoading || rolesQuery.isLoading || employeesQuery.isLoading) return <LoadingSkeleton rows={8} />;
  if (usersQuery.error || rolesQuery.error || employeesQuery.error) return <ErrorMessage />;

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      username: form.username,
      email: form.email || null,
      password: form.password,
      employee_id: form.employee_id ? Number(form.employee_id) : null,
      role_ids: [Number(form.role_id)],
      is_active: true,
      must_change_password: true,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Users & Roles</h1>
          <p className="page-description">Create users, assign roles, reset passwords, and manage access.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create user
        </Button>
      </div>

      <div className="filter-panel grid gap-3 sm:grid-cols-[1fr_180px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.code}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredUsers}
        getRowKey={(user) => user.id}
        emptyTitle="No users found"
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (user) => (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-info/10 text-xs font-semibold text-info">
                    {initials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.username}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email || 'No email'}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'roles',
            header: 'Roles',
            render: (user) => (
              <div className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <RoleBadge key={role.id} role={role.code} />
                ))}
              </div>
            ),
          },
          { key: 'employee', header: 'Employee ID', render: (user) => user.employee_id ?? '-' },
          { key: 'status', header: 'Status', render: (user) => <StatusBadge status={user.is_active ? 'active' : 'inactive'} /> },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (user) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => activateMutation.mutate(user)}>
                    {user.is_active ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setResetUser(user)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset password
                  </DropdownMenuItem>
                  {roles.map((role) => (
                    <DropdownMenuItem key={role.id} onClick={() => assignMutation.mutate({ user, roleId: role.id })}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Assign {role.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role_id} onValueChange={(value) => setForm({ ...form, role_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Linked employee</Label>
              <Select value={form.employee_id || 'none'} onValueChange={(value) => setForm({ ...form, employee_id: value === 'none' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional employee profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked employee</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !form.role_id}>
                Create user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetUser)} onOpenChange={() => setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New temporary password</Label>
            <Input id="newPassword" type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending || newPassword.length < 8}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
