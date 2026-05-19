import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { APP_LANGUAGES, APP_LANGUAGE_LABELS } from "@/lib/i18n";
import { employeeApi } from "@/services/employeeApi";
import { userApi } from "@/services/userApi";
import { toast } from "@/hooks/use-toast";

const defaultUserForm = {
  username: "",
  email: "",
  password: "",
  employee_id: "",
  language: "en" as const,
  is_active: true,
  must_change_password: false,
  role_ids: [] as number[],
};

export default function Users() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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
      const haystack = `${user.username} ${user.email || ""} ${user.language} ${user.roles.map((role) => role.code).join(" ")}`.toLowerCase();
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
        language: form.language,
        role_ids: form.role_ids,
        is_active: form.is_active,
        must_change_password: form.must_change_password,
      }),
    onSuccess: async () => {
      toast({ title: t("users.createSuccess"), description: t("users.createSuccessDescription") });
      setDialogOpen(false);
      setForm(defaultUserForm);
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: t("users.createError"),
        description: getErrorMessage(error, t("users.createErrorDescription")),
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
        language: form.language,
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
      toast({ title: t("users.updateSuccess"), description: t("users.updateSuccessDescription") });
      setDialogOpen(false);
      setEditingUserId(null);
      setForm(defaultUserForm);
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: t("users.updateError"),
        description: getErrorMessage(error, t("users.updateErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      isActive ? userApi.deactivate(userId) : userApi.activate(userId),
    onSuccess: async () => {
      toast({ title: t("users.statusUpdateSuccess"), description: t("users.statusUpdateSuccessDescription") });
      setDeactivateUserId(null);
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: t("users.statusUpdateError"),
        description: getErrorMessage(error, t("users.statusUpdateErrorDescription")),
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
      toast({ title: t("users.passwordResetSuccess"), description: t("users.passwordResetSuccessDescription") });
      setResetPasswordUserId(null);
      setResetPasswordValue("");
      await refreshUsers();
    },
    onError: (error) => {
      toast({
        title: t("users.passwordResetError"),
        description: getErrorMessage(error, t("users.passwordResetErrorDescription")),
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
      language: user.language,
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
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("users.addUser")}
          </Button>
        }
      />

      <Card className="filter-card">
        <CardHeader>
          <CardTitle>{t("users.filters")}</CardTitle>
          <CardDescription>
            {t("users.filtersDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder={t("users.searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("users.users")}</CardTitle>
          <CardDescription>{t("users.showingCount", { filtered: filteredUsers.length, total: (usersQuery.data || []).length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.username")}</TableHead>
                  <TableHead>{t("common.email")}</TableHead>
                  <TableHead>{t("common.language")}</TableHead>
                  <TableHead>{t("users.employeeLink")}</TableHead>
                  <TableHead>{t("users.roles")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("users.lastLogin")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        {user.must_change_password ? (
                          <p className="text-xs text-muted-foreground">{t("users.mustChangePassword")}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{APP_LANGUAGE_LABELS[user.language]}</TableCell>
                    <TableCell>
                      {user.employee_id ? employeeMap[user.employee_id] || t("users.employeeNumber", { id: user.employee_id }) : "-"}
                    </TableCell>
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
                          {t("users.resetPassword")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={usersQuery.isLoading ? t("users.loadingUsers") : t("users.noUsersFound")}
              description={t("users.noUsersDescription")}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingUserId ? t("users.editUser") : t("users.createUser")}</DialogTitle>
            <DialogDescription>
              {t("users.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userUsername">{t("common.username")}</Label>
              <Input id="userUsername" value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">{t("common.email")}</Label>
              <Input
                id="userEmail"
                value={form.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                disabled={selectedEmployeeHasEmail}
                placeholder={selectedEmployeeHasEmail ? t("users.usingSelectedEmployeeEmail") : t("users.optionalAccountEmail")}
              />
            </div>
            {!editingUserId ? (
              <div className="space-y-2">
                <Label htmlFor="userPassword">{t("common.password")}</Label>
                <Input id="userPassword" type="password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="userEmployee">{t("users.employeeSelect")}</Label>
              <Select value={form.employee_id || "none"} onValueChange={handleEmployeeSelection}>
                <SelectTrigger id="userEmployee">
                  <SelectValue placeholder={t("users.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("users.noEmployeeLink")}</SelectItem>
                  {(availableEmployeesQuery.data || []).map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userLanguage">{t("common.language")}</Label>
              <Select value={form.language} onValueChange={(language) => setForm((value) => ({ ...value, language: language as "en" | "fr" | "ar" }))}>
                <SelectTrigger id="userLanguage">
                  <SelectValue placeholder={t("common.language")} />
                </SelectTrigger>
                <SelectContent>
                  {APP_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {APP_LANGUAGE_LABELS[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              {t("users.activeAccount")}
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((value) => ({ ...value, is_active: event.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              {t("users.mustChangePassword")}
              <input type="checkbox" checked={form.must_change_password} onChange={(event) => setForm((value) => ({ ...value, must_change_password: event.target.checked }))} />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t("users.roles")}</p>
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
                  {rolesQuery.isLoading ? t("users.loadingRoles") : t("users.noRolesAvailable")}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => (editingUserId ? updateUser.mutate() : createUser.mutate())} disabled={isSaving}>
              {isSaving ? t("common.saving") : editingUserId ? t("users.saveUser") : t("users.createUserAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deactivateUserId)} onOpenChange={(open) => !open && setDeactivateUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.updateUserStatus")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.updateUserStatusDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const user = (usersQuery.data || []).find((item) => item.id === deactivateUserId);
                if (user) {
                  toggleActive.mutate({ userId: user.id, isActive: user.is_active });
                }
              }}
            >
              {t("users.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(resetPasswordUserId)} onOpenChange={(open) => !open && setResetPasswordUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.resetPassword")}</DialogTitle>
            <DialogDescription>
              {t("users.resetPasswordDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="resetPassword">{t("users.newPassword")}</Label>
            <Input id="resetPassword" type="password" value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUserId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => resetPassword.mutate()} disabled={resetPassword.isPending}>
              {resetPassword.isPending ? t("common.saving") : t("users.resetPassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
