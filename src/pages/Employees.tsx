import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { AnnualVacationEntitlements } from "@/components/employees/AnnualVacationEntitlements";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { composePhoneNumber, defaultPhoneCountryIso, getPhoneCountryByIso, phoneCountries, splitPhoneNumber } from "@/lib/phone-countries";
import { hasPermission } from "@/lib/roles";
import { employeeApi } from "@/services/employeeApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

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
};

const employeeStatuses = ["active", "inactive", "suspended"];

const basicFormFields: Array<{
  key: keyof typeof defaultForm;
  label: string;
  type: "text" | "email" | "number" | "date";
}> = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name", label: "Last name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "hire_date", label: "Hire date", type: "date" },
];

const compensationFormFields: Array<{
  key: keyof typeof defaultForm;
  label: string;
  type: "number";
}> = [
  { key: "monthly_price", label: "Monthly salary", type: "number" },
  { key: "day_price", label: "Day price", type: "number" },
  { key: "hour_price", label: "Hour price", type: "number" },
  { key: "extra_hours_price", label: "Extra hours price", type: "number" },
  { key: "dues", label: "Dues", type: "number" },
];

function toPayload(form: typeof defaultForm) {
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
  };
}

export default function Employees({ scope }: { scope: "admin" | "hr" }) {
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
      toast({ title: "Department added", description: `${department.name} is ready to use.` });
      setForm((value) => ({ ...value, department_id: String(department.id) }));
      setNewDepartmentName("");
      await queryClient.invalidateQueries({ queryKey: ["employee-references", "departments"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to add department",
        description: getErrorMessage(error, "Please use a unique department name."),
        variant: "destructive",
      });
    },
  });

  const createPosition = useMutation({
    mutationFn: () => employeeApi.createPosition(newPositionName),
    onSuccess: async (position) => {
      toast({ title: "Position added", description: `${position.name} is ready to use.` });
      setForm((value) => ({ ...value, position_id: String(position.id), position: position.name }));
      setNewPositionName("");
      await queryClient.invalidateQueries({ queryKey: ["employee-references", "positions"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to add position",
        description: getErrorMessage(error, "Please use a unique position name."),
        variant: "destructive",
      });
    },
  });

  const createEmployee = useMutation({
    mutationFn: () => employeeApi.create(toPayload(form)),
    onSuccess: async (employee) => {
      toast({ title: "Employee created", description: "The employee profile has been added." });
      setForm(defaultForm);
      setIsDialogOpen(false);
      await refreshEmployees();
      await refreshEmployeeLeaveData(employee?.id ?? null);
    },
    onError: (error) => {
      toast({
        title: "Unable to create employee",
        description: getErrorMessage(error, "Please review the required fields."),
        variant: "destructive",
      });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: () => employeeApi.update(editingId as number, toPayload(form)),
    onSuccess: async () => {
      toast({ title: "Employee updated", description: "The employee profile has been saved." });
      const employeeId = editingId;
      setForm(defaultForm);
      setEditingId(null);
      setIsDialogOpen(false);
      await refreshEmployees();
      await refreshEmployeeLeaveData(employeeId);
    },
    onError: (error) => {
      toast({
        title: "Unable to update employee",
        description: getErrorMessage(error, "Please review the required fields."),
        variant: "destructive",
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: (employeeId: number) => employeeApi.remove(employeeId),
    onSuccess: async () => {
      toast({ title: "Employee deleted", description: "The employee record has been deactivated from the frontend list." });
      setDeletingEmployee(null);
      await refreshEmployees();
    },
    onError: (error) => {
      toast({
        title: "Unable to delete employee",
        description: getErrorMessage(error, "This employee may still be linked to an active user account."),
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
      monthly_price: String(employee.monthly_price || 0),
      day_price: String(employee.day_price || 0),
      hour_price: String(employee.hour_price || 0),
      extra_hours_price: String(employee.extra_hours_price || 0),
      vacation_days: String(employee.vacation_days || 0),
      dues: String(employee.dues || 0),
    });
    setIsDialogOpen(true);
  };

  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "admin" ? "Employee Management" : "HR Employee Management"}
        description="Create, edit, and review employee profiles with backend-compatible `/employee` APIs."
        actions={
          <Button onClick={openCreate} disabled={!canCreateEmployee}>
            <Plus className="mr-2 h-4 w-4" />
            Add employee
          </Button>
        }
      />

      <Card className="filter-card">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by name, phone, or position and narrow by employee status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Search employees" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input placeholder="Status filter: active, inactive, suspended" value={statusFilter === "all" ? "" : statusFilter} onChange={(event) => setStatusFilter(event.target.value || "all")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            Showing {filteredEmployees.length} of {(employeesQuery.data || []).length} employee records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hire date</TableHead>
                  <TableHead>Salary type</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.full_name}</p>
                        <p className="text-xs text-muted-foreground">User link: {employee.user_id ?? "none"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department_id ? departmentMap[employee.department_id] || `Department #${employee.department_id}` : "-"}</TableCell>
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
              title={employeesQuery.isLoading ? "Loading employees..." : "No employees found"}
              description="Try a different filter or add the first employee record."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>
              This form writes to the backend `/employee` endpoint and keeps the frontend aligned with the new employee architecture.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="py-2">
            <TabsList className="grid h-auto w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="job">Job</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="grid gap-4 md:grid-cols-2">
              {basicFormFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    value={form[field.key]}
                    onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="phoneCountry">Country code</Label>
                <Select
                  value={form.phone_country_iso}
                  onValueChange={(phone_country_iso) => setForm((value) => ({ ...value, phone_country_iso }))}
                >
                  <SelectTrigger id="phoneCountry">
                    <SelectValue placeholder="Select country" />
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
                <Label htmlFor="phoneNumber">Phone number</Label>
                <Input
                  id="phoneNumber"
                  inputMode="tel"
                  placeholder="Local number"
                  value={form.phone_number}
                  onChange={(event) => setForm((value) => ({ ...value, phone_number: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Saved as {composePhoneNumber(form.phone_country_iso, form.phone_number) || `${getPhoneCountryByIso(form.phone_country_iso)?.dialCode || ""}...`}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="job" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={form.department_id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, department_id: value === "none" ? "" : value }))}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {(departmentsQuery.data || []).map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input placeholder="New department" value={newDepartmentName} onChange={(event) => setNewDepartmentName(event.target.value)} />
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
                <Label htmlFor="position">Position</Label>
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
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No position</SelectItem>
                    {(positionsQuery.data || []).map((position) => (
                      <SelectItem key={position.id} value={String(position.id)}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input placeholder="New position" value={newPositionName} onChange={(event) => setNewPositionName(event.target.value)} />
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
                <Label htmlFor="status">Employment status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="compensation" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salaryType">Salary type</Label>
                <Select value={form.salary_type} onValueChange={(value) => setForm((current) => ({ ...current, salary_type: value }))}>
                  <SelectTrigger id="salaryType">
                    <SelectValue placeholder="Select salary type" />
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
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    value={form[field.key]}
                    onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                Compensation history needs a backend compensation endpoint before it can be edited safely here.
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                Work hours, allowed late minutes, and overtime thresholds are managed centrally from Settings and Payroll Policy.
              </div>
            </TabsContent>

            <TabsContent value="leave" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vacationDays">Bootstrap vacation days</Label>
                <Input
                  id="vacationDays"
                  type="number"
                  min={0}
                  value={form.vacation_days}
                  onChange={(event) => setForm((value) => ({ ...value, vacation_days: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  This default is only used if the employee does not have any yearly entitlement rows yet.
                </p>
              </div>
              {editingId ? (
                <AnnualVacationEntitlements employeeId={editingId} />
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                  Create the employee first, then add year-by-year annual vacation entitlements here.
                </div>
              )}
            </TabsContent>

            <TabsContent value="account" className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Linked user</p>
                <p className="font-medium">{editingId ? employeesQuery.data?.find((employee) => employee.id === editingId)?.user_id ?? "none" : "Created after user linking"}</p>
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Role assignment, last login, and password reset remain in Users until dedicated account endpoints are added to this profile view.
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => (editingId ? updateEmployee.mutate() : createEmployee.mutate())} disabled={isSaving || (editingId ? !canUpdateEmployee : !canCreateEmployee)}>
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Create employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingEmployee)} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the employee from the active list. The backend will block deletion if a linked user account still exists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!canDeleteEmployee || deleteEmployee.isPending} onClick={() => deletingEmployee && deleteEmployee.mutate(deletingEmployee)}>
              Delete employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
