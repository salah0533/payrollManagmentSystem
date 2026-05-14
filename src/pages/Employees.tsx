import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { employeeApi } from "@/services/employeeApi";
import { toast } from "@/hooks/use-toast";

const defaultForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
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
  daily_work_hours: "8",
  vacation_days: "21",
  allowed_late: "0",
  min_extraTime: "0",
  dues: "0",
};

const employeeStatuses = ["active", "inactive", "suspended"];

const employeeFormFields: Array<{
  key: keyof typeof defaultForm;
  label: string;
  type: "text" | "email" | "number" | "date";
}> = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name", label: "Last name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "hire_date", label: "Hire date", type: "date" },
  { key: "monthly_price", label: "Monthly salary", type: "number" },
  { key: "day_price", label: "Day price", type: "number" },
  { key: "hour_price", label: "Hour price", type: "number" },
  { key: "extra_hours_price", label: "Extra hours price", type: "number" },
  { key: "daily_work_hours", label: "Daily work hours", type: "number" },
  { key: "vacation_days", label: "Vacation days", type: "number" },
  { key: "allowed_late", label: "Allowed late", type: "number" },
  { key: "min_extraTime", label: "Minimum extra time", type: "number" },
  { key: "dues", label: "Dues", type: "number" },
];

function toPayload(form: typeof defaultForm) {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email || null,
    phone: form.phone,
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
    daly_work_hours: Number(form.daily_work_hours || 8),
    vacation_days: Number(form.vacation_days || 0),
    allowed_late: Number(form.allowed_late || 0),
    min_extraTime: Number(form.min_extraTime || 0),
    dues: Number(form.dues || 0),
  };
}

export default function Employees({ scope }: { scope: "admin" | "hr" }) {
  const queryClient = useQueryClient();
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
    onSuccess: async () => {
      toast({ title: "Employee created", description: "The employee profile has been added." });
      setForm(defaultForm);
      setIsDialogOpen(false);
      await refreshEmployees();
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
      setForm(defaultForm);
      setEditingId(null);
      setIsDialogOpen(false);
      await refreshEmployees();
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

    setEditingId(employee.id);
    setForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || "",
      phone: employee.phone,
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
      daily_work_hours: String(employee.daily_work_hours || 8),
      vacation_days: String(employee.vacation_days || 0),
      allowed_late: String(employee.allowed_late || 0),
      min_extraTime: String(employee.min_extraTime || 0),
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
          <Button onClick={openCreate}>
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
                        <Button size="icon" variant="outline" onClick={() => openEdit(employee.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => setDeletingEmployee(employee.id)}>
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
          <div className="grid gap-4 py-2 md:grid-cols-2">
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

            {employeeFormFields.map((field) => (
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
              <Label htmlFor="status">Status</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => (editingId ? updateEmployee.mutate() : createEmployee.mutate())} disabled={isSaving}>
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
            <AlertDialogAction onClick={() => deletingEmployee && deleteEmployee.mutate(deletingEmployee)}>
              Delete employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
