import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { AnnualVacationEntitlements } from "@/components/employees/AnnualVacationEntitlements";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, formatLabel } from "@/lib/format";
import { composePhoneNumber, defaultPhoneCountryIso, getPhoneCountryByIso, phoneCountries, splitPhoneNumber } from "@/lib/phone-countries";
import { hasPermission } from "@/lib/roles";
import { employeeApi } from "@/services/employeeApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const defaultForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_country_iso: defaultPhoneCountryIso,
  phone_number: "",
  department_id: "",
  position_id: "",
  position: "",
  status: "active",
  hire_date: "",
  salary_type: "0",
  monthly_price: "0",
  day_price: "0",
  hour_price: "0",
  extra_hours_price: "0",
  vacation_days: "21",
  dues: "0",
  auto_attendance_enabled: false,
};

const employeeStatuses = ["active", "inactive", "suspended"];

const basicFormFields: Array<{
  key: "first_name" | "last_name" | "email" | "hire_date";
  label: string;
  type: "text" | "email" | "number" | "date";
}> = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name", label: "Last name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "hire_date", label: "Hire date", type: "date" },
];

const compensationFormFields: Array<{
  key: "monthly_price" | "day_price" | "hour_price" | "extra_hours_price" | "dues";
  label: string;
  type: "number";
}> = [
  { key: "monthly_price", label: "Monthly salary", type: "number" },
  { key: "day_price", label: "Day price", type: "number" },
  { key: "hour_price", label: "Hour price", type: "number" },
  { key: "extra_hours_price", label: "Extra hours price", type: "number" },
  { key: "dues", label: "Dues", type: "number" },
];

export function normalizeNumericInputValue(value?: number | string | null) {
  if (value == null || value === "") {
    return "0";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return "0";
  }

  if (Number.isInteger(numeric)) {
    return String(numeric);
  }

  return numeric.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}

export function isEmployeeCreateFormComplete(form: typeof defaultForm) {
  return [
    form.first_name,
    form.last_name,
    form.hire_date,
    form.phone_number,
    form.department_id,
    form.position_id,
  ].every((value) => value.trim().length > 0);
}

export function toEmployeePayload(form: typeof defaultForm) {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email || null,
    phone: composePhoneNumber(form.phone_country_iso, form.phone_number),
    department_id: form.department_id ? Number(form.department_id) : null,
    position_id: form.position_id ? Number(form.position_id) : null,
    position: form.position || null,
    status: form.status,
    hire_date: form.hire_date || null,
    joined: form.hire_date || null,
    salary_type: Number(form.salary_type || 0),
    month_price: Number(form.monthly_price || 0),
    day_price: Number(form.day_price || 0),
    hour_price: Number(form.hour_price || 0),
    extra_hours_price: Number(form.extra_hours_price || 0),
    vacation_days: Number(form.vacation_days || 0),
    dues: Number(form.dues || 0),
    auto_attendance_enabled: form.auto_attendance_enabled,
  };
}

export default function Employees({ scope }: { scope: "admin" | "hr" }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const canCreateEmployee = hasPermission(currentUser, "employees.create");
  const canUpdateEmployee = hasPermission(currentUser, "employees.update");
  const canDeleteEmployee = hasPermission(currentUser, "employees.delete");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newPositionName, setNewPositionName] = useState("");

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
  });

  const salaryTypesQuery = useQuery({
    queryKey: ["salary-types"],
    queryFn: () => employeeApi.getSalaryTypes(),
  });

  const departmentsQuery = useQuery({
    queryKey: ["employee-references", "departments"],
    queryFn: () => employeeApi.getDepartments(),
  });

  const positionsQuery = useQuery({
    queryKey: ["employee-references", "positions"],
    queryFn: () => employeeApi.getPositions(),
  });

  const compensationHistoryQuery = useQuery({
    queryKey: ["employees", "compensation-history", editingId],
    queryFn: () => employeeApi.getCompensationHistory(editingId as number),
    enabled: Boolean(editingId && isDialogOpen),
  });

  const salaryTypeMap = useMemo(
    () =>
      Object.fromEntries((salaryTypesQuery.data || []).map((item) => [item.id, item.salary_type])),
    [salaryTypesQuery.data],
  );

  const departmentMap = useMemo(
    () => Object.fromEntries((departmentsQuery.data || []).map((item) => [item.id, item.name])),
    [departmentsQuery.data],
  );

  const filteredEmployees = useMemo(() => {
    return (employeesQuery.data || []).filter((employee) => {
      const matchesSearch =
        employee.full_name.toLowerCase().includes(search.toLowerCase()) ||
        String(employee.phone).includes(search) ||
        String(employee.position || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employeesQuery.data, search, statusFilter]);

  const refreshEmployees = async () => {
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  const refreshEmployeeLeaveData = async (employeeId?: number | null) => {
    if (!employeeId) {
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["annual-vacations", employeeId] });
    await queryClient.invalidateQueries({ queryKey: ["vacation-balance"] });
  };

  const createDepartment = useMutation({
    mutationFn: () => employeeApi.createDepartment(newDepartmentName),
    onSuccess: async (department) => {
      toast({
        title: t("employeesPage.createDepartmentSuccess"),
        description: t("employeesPage.createDepartmentSuccessDescription", {
          name: department.name,
        }),
      });
      setForm((value) => ({ ...value, department_id: String(department.id) }));
      setNewDepartmentName("");
      await queryClient.invalidateQueries({ queryKey: ["employee-references", "departments"] });
    },
    onError: (error) => {
      toast({
        title: t("employeesPage.createDepartmentError"),
        description: getErrorMessage(error, t("employeesPage.createDepartmentErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const createPosition = useMutation({
    mutationFn: () => employeeApi.createPosition(newPositionName),
    onSuccess: async (position) => {
      toast({
        title: t("employeesPage.createPositionSuccess"),
        description: t("employeesPage.createPositionSuccessDescription", {
          name: position.name,
        }),
      });
      setForm((value) => ({ ...value, position_id: String(position.id), position: position.name }));
      setNewPositionName("");
      await queryClient.invalidateQueries({ queryKey: ["employee-references", "positions"] });
    },
    onError: (error) => {
      toast({
        title: t("employeesPage.createPositionError"),
        description: getErrorMessage(error, t("employeesPage.createPositionErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const createEmployee = useMutation({
    mutationFn: () => employeeApi.create(toEmployeePayload(form)),
    onSuccess: async (employee) => {
      toast({
        title: t("employeesPage.createEmployeeSuccess"),
        description: t("employeesPage.createEmployeeSuccessDescription"),
      });
      setForm(defaultForm);
      setIsDialogOpen(false);
      await refreshEmployees();
      await refreshEmployeeLeaveData(employee?.id ?? null);
    },
    onError: (error) => {
      toast({
        title: t("employeesPage.createEmployeeError"),
        description: getErrorMessage(error, t("employeesPage.createEmployeeErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: () => employeeApi.update(editingId as number, toEmployeePayload(form)),
    onSuccess: async () => {
      toast({
        title: t("employeesPage.updateEmployeeSuccess"),
        description: t("employeesPage.updateEmployeeSuccessDescription"),
      });
      const employeeId = editingId;
      setForm(defaultForm);
      setEditingId(null);
      setIsDialogOpen(false);
      await refreshEmployees();
      await refreshEmployeeLeaveData(employeeId);
    },
    onError: (error) => {
      toast({
        title: t("employeesPage.updateEmployeeError"),
        description: getErrorMessage(error, t("employeesPage.updateEmployeeErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: (employeeId: number) => employeeApi.remove(employeeId),
    onSuccess: async () => {
      toast({
        title: t("employeesPage.deleteEmployeeSuccess"),
        description: t("employeesPage.deleteEmployeeSuccessDescription"),
      });
      setDeletingEmployee(null);
      await refreshEmployees();
    },
    onError: (error) => {
      toast({
        title: t("employeesPage.deleteEmployeeError"),
        description: getErrorMessage(error, t("employeesPage.deleteEmployeeErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsDialogOpen(true);
  };

  const openEdit = (employeeId: number) => {
    const employee = (employeesQuery.data || []).find((item) => item.id === employeeId);
    if (!employee) {
      return;
    }

    const parsedPhone = splitPhoneNumber(employee.phone);

    setEditingId(employee.id);
    setForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || "",
      phone_country_iso: parsedPhone.countryIso,
      phone_number: parsedPhone.nationalNumber,
      department_id: employee.department_id ? String(employee.department_id) : "",
      position_id: employee.position_id ? String(employee.position_id) : "",
      position: employee.position || "",
      status: employee.status,
      hire_date: employee.hire_date ? String(employee.hire_date).split("T")[0] : "",
      salary_type: String(employee.salary_type),
      monthly_price: normalizeNumericInputValue(employee.monthly_price),
      day_price: normalizeNumericInputValue(employee.day_price),
      hour_price: normalizeNumericInputValue(employee.hour_price),
      extra_hours_price: normalizeNumericInputValue(employee.extra_hours_price),
      vacation_days: String(employee.vacation_days || 0),
      dues: normalizeNumericInputValue(employee.dues),
      auto_attendance_enabled: Boolean(employee.auto_attendance_enabled),
    });
    setIsDialogOpen(true);
  };

  const isSaving = createEmployee.isPending || updateEmployee.isPending;
  const isCreateFormComplete = isEmployeeCreateFormComplete(form);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "admin" ? t("employeesPage.adminTitle") : t("employeesPage.hrTitle")}
        description={t("employeesPage.description")}
        actions={
          <Button onClick={openCreate} disabled={!canCreateEmployee}>
            <Plus className="mr-2 h-4 w-4" />
            {t("employeesPage.addEmployee")}
          </Button>
        }
      />

      <Card className="filter-card">
        <CardHeader>
          <CardTitle>{t("employeesPage.filtersTitle")}</CardTitle>
          <CardDescription>{t("employeesPage.filtersDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input placeholder={t("employeesPage.searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input placeholder={t("employeesPage.statusFilterPlaceholder")} value={statusFilter === "all" ? "" : statusFilter} onChange={(event) => setStatusFilter(event.target.value || "all")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("employeesPage.employeesTitle")}</CardTitle>
          <CardDescription>
            {t("employeesPage.showingCount", {
              filtered: filteredEmployees.length,
              total: (employeesQuery.data || []).length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employeesPage.name")}</TableHead>
                  <TableHead>{t("employeesPage.department")}</TableHead>
                  <TableHead>{t("employeesPage.position")}</TableHead>
                  <TableHead>{t("employeesPage.contact")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("employeesPage.hireDate")}</TableHead>
                  <TableHead>{t("employeesPage.salaryType")}</TableHead>
                  <TableHead>{t("employeesPage.monthly")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.full_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {t("employeesPage.userLink")}: {employee.user_id ?? t("common.noRecord")}
                          </span>
                          <Badge variant={employee.auto_attendance_enabled ? "secondary" : "outline"}>
                            {employee.auto_attendance_enabled
                              ? t("employeesPage.autoAttendance")
                              : t("employeesPage.manualAttendance")}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department_id ? departmentMap[employee.department_id] || t("employeesPage.departmentId", { id: employee.department_id }) : "-"}</TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p>{employee.email || "-"}</p>
                        <p className="text-xs text-muted-foreground">{employee.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={employee.status} /></TableCell>
                    <TableCell>{formatDate(employee.hire_date)}</TableCell>
                    <TableCell>{salaryTypeMap[employee.salary_type] || employee.salary_type}</TableCell>
                    <TableCell>{formatCurrency(employee.monthly_price)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="outline" disabled={!canUpdateEmployee} onClick={() => openEdit(employee.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" disabled={!canDeleteEmployee} onClick={() => setDeletingEmployee(employee.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={employeesQuery.isLoading ? t("employeesPage.loadingEmployees") : t("employeesPage.noEmployees")}
              description={t("employeesPage.noEmployeesDescription")}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t("employeesPage.editEmployee") : t("employeesPage.addEmployeeDialog")}</DialogTitle>
            <DialogDescription>
              {t("employeesPage.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="py-2">
            <TabsList className="grid h-auto w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="basic">{t("employeesPage.tabs.basic")}</TabsTrigger>
              <TabsTrigger value="job">{t("employeesPage.tabs.job")}</TabsTrigger>
              <TabsTrigger value="compensation">{t("employeesPage.tabs.compensation")}</TabsTrigger>
              <TabsTrigger value="attendance">{t("employeesPage.tabs.attendance")}</TabsTrigger>
              <TabsTrigger value="leave">{t("employeesPage.tabs.leave")}</TabsTrigger>
              <TabsTrigger value="account">{t("employeesPage.tabs.account")}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="grid gap-4 md:grid-cols-2">
              {basicFormFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.key === "first_name"
                      ? t("employeesPage.firstName")
                      : field.key === "last_name"
                        ? t("employeesPage.lastName")
                        : field.key === "email"
                          ? t("common.email")
                          : t("employeesPage.hireDate")}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    step="0.01"
                    value={form[field.key]}
                    onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="phoneCountry">{t("employeesPage.countryCode")}</Label>
                <Select
                  value={form.phone_country_iso}
                  onValueChange={(phone_country_iso) => setForm((value) => ({ ...value, phone_country_iso }))}
                >
                  <SelectTrigger id="phoneCountry">
                    <SelectValue placeholder={t("employeesPage.selectCountry")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {phoneCountries.map((country) => (
                      <SelectItem key={country.iso2} value={country.iso2}>
                        {country.name} ({country.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t("employeesPage.phoneNumber")}</Label>
                <Input
                  id="phoneNumber"
                  inputMode="tel"
                  placeholder={t("employeesPage.localNumber")}
                  value={form.phone_number}
                  onChange={(event) => setForm((value) => ({ ...value, phone_number: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("employeesPage.savedAs", {
                    value:
                      composePhoneNumber(form.phone_country_iso, form.phone_number) ||
                      `${getPhoneCountryByIso(form.phone_country_iso)?.dialCode || ""}...`,
                  })}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="job" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">{t("employeesPage.department")}</Label>
                <Select value={form.department_id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, department_id: value === "none" ? "" : value }))}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder={t("employeesPage.selectDepartment")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("employeesPage.noDepartment")}</SelectItem>
                    {(departmentsQuery.data || []).map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input placeholder={t("employeesPage.newDepartment")} value={newDepartmentName} onChange={(event) => setNewDepartmentName(event.target.value)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => createDepartment.mutate()}
                    disabled={!newDepartmentName.trim() || createDepartment.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">{t("employeesPage.position")}</Label>
                <Select
                  value={form.position_id || "none"}
                  onValueChange={(value) => {
                    const selectedPosition = (positionsQuery.data || []).find((position) => String(position.id) === value);
                    setForm((current) => ({
                      ...current,
                      position_id: value === "none" ? "" : value,
                      position: selectedPosition?.name || "",
                    }));
                  }}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder={t("employeesPage.selectPosition")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("employeesPage.noPosition")}</SelectItem>
                    {(positionsQuery.data || []).map((position) => (
                      <SelectItem key={position.id} value={String(position.id)}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input placeholder={t("employeesPage.newPosition")} value={newPositionName} onChange={(event) => setNewPositionName(event.target.value)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => createPosition.mutate()}
                    disabled={!newPositionName.trim() || createPosition.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t("employeesPage.employmentStatus")}</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t("employeesPage.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="compensation" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salaryType">{t("employeesPage.salaryType")}</Label>
                <Select value={form.salary_type} onValueChange={(value) => setForm((current) => ({ ...current, salary_type: value }))}>
                  <SelectTrigger id="salaryType">
                    <SelectValue placeholder={t("employeesPage.selectSalaryType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(salaryTypesQuery.data || []).map((salaryType) => (
                      <SelectItem key={salaryType.id} value={String(salaryType.id)}>
                        {salaryType.salary_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {compensationFormFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.key === "monthly_price"
                      ? t("employeesPage.monthlySalary")
                      : field.key === "day_price"
                        ? t("employeesPage.dayPrice")
                        : field.key === "hour_price"
                          ? t("employeesPage.hourPrice")
                          : field.key === "extra_hours_price"
                            ? t("employeesPage.extraHoursPrice")
                            : t("employeesPage.dues")}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    value={form[field.key]}
                    onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("employeesPage.compensationHistoryTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("employeesPage.compensationHistoryDescription")}</p>
                  </div>
                </div>
                {editingId ? (
                  compensationHistoryQuery.data?.length ? (
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      {compensationHistoryQuery.data.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border/70 bg-background p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium capitalize">{formatLabel(item.salary_type)}</p>
                                <Badge variant={item.is_active ? "secondary" : "outline"}>
                                  {item.is_active ? t("employeesPage.currentCompensation") : t("employeesPage.pastCompensation")}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t("labels.range", {
                                  start: formatDate(item.effective_from),
                                  end: item.effective_to ? formatDate(item.effective_to) : t("employeesPage.presentRangeLabel"),
                                })}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">{t("employeesPage.monthlySalary")}</p>
                              <p className="font-medium">{formatCurrency(item.base_monthly_salary ?? 0, item.currency)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("employeesPage.dayPrice")}</p>
                              <p className="font-medium">{formatCurrency(item.daily_rate ?? 0, item.currency)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("employeesPage.hourPrice")}</p>
                              <p className="font-medium">{formatCurrency(item.hourly_rate ?? 0, item.currency)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("employeesPage.extraHoursPrice")}</p>
                              <p className="font-medium">{formatCurrency(item.overtime_rate ?? 0, item.currency)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {compensationHistoryQuery.isLoading
                        ? t("employeesPage.loadingCompensationHistory")
                        : t("employeesPage.noCompensationHistory")}
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    {t("employeesPage.createEmployeeBeforeCompensationHistory")}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border p-4 md:col-span-2">
                <div className="space-y-1">
                  <p className="font-medium">{t("employeesPage.autoAttendance")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("employeesPage.autoAttendanceDescription")}
                  </p>
                  {editingId && form.auto_attendance_enabled ? (
                    <p className="text-xs text-muted-foreground">
                      {t("employeesPage.autoAttendanceFutureNotice")}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={form.auto_attendance_enabled}
                  onCheckedChange={(checked) => setForm((value) => ({ ...value, auto_attendance_enabled: checked }))}
                />
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                {t("employeesPage.attendancePolicyNotice")}
              </div>
            </TabsContent>

            <TabsContent value="leave" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vacationDays">{t("employeesPage.bootstrapVacationDays")}</Label>
                <Input
                  id="vacationDays"
                  type="number"
                  min={0}
                  value={form.vacation_days}
                  onChange={(event) => setForm((value) => ({ ...value, vacation_days: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("employeesPage.bootstrapVacationDaysDescription")}
                </p>
              </div>
              {editingId ? (
                <AnnualVacationEntitlements employeeId={editingId} />
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                  {t("employeesPage.createFirstForLeave")}
                </div>
              )}
            </TabsContent>

            <TabsContent value="account" className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">{t("employeesPage.linkedUser")}</p>
                <p className="font-medium">{editingId ? employeesQuery.data?.find((employee) => employee.id === editingId)?.user_id ?? t("common.noRecord") : t("employeesPage.createdAfterLinking")}</p>
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t("employeesPage.accountNotice")}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => (editingId ? updateEmployee.mutate() : createEmployee.mutate())}
              disabled={isSaving || (editingId ? !canUpdateEmployee : !canCreateEmployee || !isCreateFormComplete)}
            >
              {isSaving ? t("common.saving") : editingId ? t("employeesPage.saveChanges") : t("employeesPage.createEmployeeAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingEmployee)} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("employeesPage.deleteEmployee")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("employeesPage.deleteEmployeeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={!canDeleteEmployee || deleteEmployee.isPending} onClick={() => deletingEmployee && deleteEmployee.mutate(deletingEmployee)}>
              {t("employeesPage.deleteEmployee")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
