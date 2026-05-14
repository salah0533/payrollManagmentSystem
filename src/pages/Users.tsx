import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, ShieldOff } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { employeeApi } from "@/services/employeeApi";
import { userApi } from "@/services/userApi";
import { toast } from "@/hooks/use-toast";

const defaultUserForm = {
  username: "",
  email: "",
  password: "",
  employee_id: "",
  is_active: true,
  must_change_password: true,
  role_ids: [] as number[],
};

export default function Users() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deactivateUserId, setDeactivateUserId] = useState<number | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [form, setForm] = useState(defaultUserForm);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => userApi.list(),
  });

  const employeesQuery = useQuery({
    queryKey: ["users", "employees"],
    queryFn: () => employeeApi.list(),
  });

  const rolesQuery = useQuery({
    queryKey: ["users", "roles"],
    queryFn: () => userApi.listRoles(),
  });

  const availableEmployeesQuery = useQuery({
    queryKey: ["users", "available-employees", editingUserId],
    queryFn: () => userApi.listAvailableEmployees(editingUserId),
    enabled: dialogOpen,
  });

  const availableRoles = useMemo(
    () => [...(rolesQuery.data || [])].sort((left, right) => left.code.localeCompare(right.code)),
    [rolesQuery.data],
  );

  const filteredUsers = useMemo(() => {
    return (usersQuery.data || []).filter((user) => {
      const haystack = `${user.username} ${user.email || ""} ${user.roles.map((role) => role.code).join(" ")}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [search, usersQuery.data]);

  const employeeMap = useMemo(
    () => Object.fromEntries((employeesQuery.data || []).map((employee) => [employee.id, employee.full_name])),
    [employeesQuery.data],
  );

  const selectedEmployee = useMemo(
    () => (employeesQuery.data || []).find((employee) => String(employee.id) === form.employee_id),
    [employeesQuery.data, form.employee_id],
  );

  const selectedEmployeeHasEmail = Boolean(selectedEmployee?.email);

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await queryClient.invalidateQueries({ queryKey: ["users", "available-employees"] });
  };

  const createUser = useMutation({
    mutationFn: () =>
      userApi.create({
        username: form.username,
        email: form.email || null,
        password: form.password,
        employee_id: form.employee_id ? Number(form.employee_id) : null,
        role_ids: form.role_ids,
        is_active: form.is_active,
        must_change_password: form.must_change_password,
      }),
    onSuccess: async () => {
      toast({ title: "User created", description: "The backend created the user account." });
      setDialogOpen(false);
      setForm(defaultUserForm);
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: "Unable to create user",
        description: getErrorMessage(error, "Role ids and identity fields are required."),
        variant: "destructive",
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      const existingUser = (usersQuery.data || []).find((user) => user.id === editingUserId);
      if (!existingUser || !editingUserId) {
        return null;
      }

      await userApi.update(editingUserId, {
        username: form.username,
        email: form.email || null,
        employee_id: form.employee_id ? Number(form.employee_id) : null,
        is_active: form.is_active,
        must_change_password: form.must_change_password,
      });

      const currentRoleIds = existingUser.roles.map((role) => role.id);
      const addedRoleIds = form.role_ids.filter((roleId) => !currentRoleIds.includes(roleId));
      const removedRoleIds = currentRoleIds.filter((roleId) => !form.role_ids.includes(roleId));

      if (addedRoleIds.length) {
        await userApi.assignRoles(editingUserId, addedRoleIds);
      }

      for (const roleId of removedRoleIds) {
        await userApi.removeRole(editingUserId, roleId);
      }
    },
    onSuccess: async () => {
      toast({ title: "User updated", description: "The user account and visible roles were updated." });
      setDialogOpen(false);
      setEditingUserId(null);
      setForm(defaultUserForm);
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: "Unable to update user",
        description: getErrorMessage(error, "The backend rejected the user update or role change."),
        variant: "destructive",
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      isActive ? userApi.deactivate(userId) : userApi.activate(userId),
    onSuccess: async () => {
      toast({ title: "User updated", description: "The user activation state changed successfully." });
      setDeactivateUserId(null);
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: "Unable to update user status",
        description: getErrorMessage(error, "The backend rejected the activation change."),
        variant: "destructive",
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: () =>
      userApi.resetPassword(resetPasswordUserId as number, {
        new_password: resetPasswordValue,
        must_change_password: true,
      }),
    onSuccess: async () => {
      toast({ title: "Password reset", description: "The user must change the new password at next login." });
      setResetPasswordUserId(null);
      setResetPasswordValue("");
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: "Unable to reset password",
        description: getErrorMessage(error, "Please review the new password and try again."),
        variant: "destructive",
      });
    },
  });

  const openCreate = () => {
    setEditingUserId(null);
    setForm(defaultUserForm);
    setDialogOpen(true);
  };

  const handleEmployeeSelection = (value: string) => {
    if (value === "none") {
      setForm((current) => ({ ...current, employee_id: "", email: "" }));
      return;
    }

    const employee = (availableEmployeesQuery.data || employeesQuery.data || []).find((item) => String(item.id) === value);
    setForm((current) => ({
      ...current,
      employee_id: value,
      email: employee?.email || "",
    }));
  };

  const openEdit = (userId: number) => {
    const user = (usersQuery.data || []).find((item) => item.id === userId);
    if (!user) {
      return;
    }

    setEditingUserId(user.id);
    setForm({
      username: user.username,
      email: user.email || "",
      password: "",
      employee_id: user.employee_id ? String(user.employee_id) : "",
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      role_ids: user.roles.map((role) => role.id),
    });
    setDialogOpen(true);
  };

  const isSaving = createUser.isPending || updateUser.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="User Management"
        description="Create, edit, deactivate, and reset users with backend role and employee catalogs."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        }
      />

      <Card className="filter-card">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search existing accounts by username, email, or assigned role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by username, email, or role" value={search} onChange={(event) => setSearch(event.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Showing {filteredUsers.length} of {(usersQuery.data || []).length} user accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee link</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        {user.must_change_password ? (
                          <p className="text-xs text-muted-foreground">Must change password</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{user.employee_id ? employeeMap[user.employee_id] || `Employee #${user.employee_id}` : "-"}</TableCell>
                    <TableCell>{user.roles.map((role) => role.code).join(", ") || "-"}</TableCell>
                    <TableCell><StatusBadge status={user.is_active ? "active" : "inactive"} /></TableCell>
                    <TableCell>{formatDateTime(user.last_login_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="outline" onClick={() => openEdit(user.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => setDeactivateUserId(user.id)}>
                          {user.is_active ? <ShieldOff className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setResetPasswordUserId(user.id)}>
                          Reset password
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={usersQuery.isLoading ? "Loading users..." : "No users found"}
              description="Create the first user or broaden the current filters."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Edit user" : "Create user"}</DialogTitle>
            <DialogDescription>
              Create or update a user account and link it to an employee that does not already have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userUsername">Username</Label>
              <Input id="userUsername" value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                value={form.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                disabled={selectedEmployeeHasEmail}
                placeholder={selectedEmployeeHasEmail ? "Using selected employee email" : "Optional account email"}
              />
            </div>
            {!editingUserId ? (
              <div className="space-y-2">
                <Label htmlFor="userPassword">Password</Label>
                <Input id="userPassword" type="password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="userEmployee">Employee link</Label>
              <Select value={form.employee_id || "none"} onValueChange={handleEmployeeSelection}>
                <SelectTrigger id="userEmployee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No employee link</SelectItem>
                  {(availableEmployeesQuery.data || []).map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Active account
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((value) => ({ ...value, is_active: event.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Must change password
              <input type="checkbox" checked={form.must_change_password} onChange={(event) => setForm((value) => ({ ...value, must_change_password: event.target.checked }))} />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Roles</p>
            <div className="grid gap-3 md:grid-cols-3">
              {availableRoles.length ? (
                availableRoles.map((role) => (
                  <label key={role.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.role_ids.includes(role.id)}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          role_ids: event.target.checked
                            ? [...value.role_ids, role.id]
                            : value.role_ids.filter((item) => item !== role.id),
                        }))
                      }
                    />
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.code}</p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {rolesQuery.isLoading ? "Loading roles..." : "No roles are available yet."}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => (editingUserId ? updateUser.mutate() : createUser.mutate())} disabled={isSaving}>
              {isSaving ? "Saving..." : editingUserId ? "Save user" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deactivateUserId)} onOpenChange={(open) => !open && setDeactivateUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update user status</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate or deactivate the selected user through the backend user management endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const user = (usersQuery.data || []).find((item) => item.id === deactivateUserId);
                if (user) {
                  toggleActive.mutate({ userId: user.id, isActive: user.is_active });
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(resetPasswordUserId)} onOpenChange={(open) => !open && setResetPasswordUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              The backend reset flow marks the user to change the password on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="resetPassword">New password</Label>
            <Input id="resetPassword" type="password" value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUserId(null)}>
              Cancel
            </Button>
            <Button onClick={() => resetPassword.mutate()} disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Saving..." : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
