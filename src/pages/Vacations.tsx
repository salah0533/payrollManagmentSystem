import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatLabel } from "@/lib/format";
import { employeeApi } from "@/services/employeeApi";
import { vacationApi } from "@/services/vacationApi";
import { toast } from "@/hooks/use-toast";

function daysBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function Vacations({ scope }: { scope: "manage" | "self" }) {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [actionState, setActionState] = useState<{ vacationId: number | null; statusId: number | null; label: string }>({
    vacationId: null,
    statusId: null,
    label: "",
  });
  const [form, setForm] = useState({
    employee_id: "",
    start_date: "",
    end_date: "",
    vacation_type: "",
    vacation_status: "",
    is_paid: true,
  });

  const employeesQuery = useQuery({
    queryKey: ["vacations", "employees"],
    queryFn: () => employeeApi.list(),
    enabled: scope === "manage",
  });

  const vacationTypesQuery = useQuery({
    queryKey: ["vacations", "types"],
    queryFn: () => vacationApi.getTypes(),
  });

  const vacationStatusesQuery = useQuery({
    queryKey: ["vacations", "statuses"],
    queryFn: () => vacationApi.getStatuses(),
  });

  const vacationsQuery = useQuery({
    queryKey: ["vacations", scope, year],
    queryFn: () => (scope === "manage" ? vacationApi.listAll(Number(year)) : vacationApi.listSelf()),
  });

  const employeeMap = useMemo(
    () => Object.fromEntries((employeesQuery.data || []).map((employee) => [employee.id, employee.full_name])),
    [employeesQuery.data],
  );

  const filteredVacations = useMemo(() => {
    return (vacationsQuery.data || []).filter((vacation) => {
      const matchesStatus = !statusFilter || String(vacation.vacation_status) === statusFilter;
      const matchesType = !typeFilter || String(vacation.vacation_type) === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [statusFilter, typeFilter, vacationsQuery.data]);

  const approvedStatusId = useMemo(
    () => vacationStatusesQuery.data?.find((item) => item.vacation_status.toLowerCase() === "approved")?.id ?? null,
    [vacationStatusesQuery.data],
  );
  const rejectedStatusId = useMemo(
    () => vacationStatusesQuery.data?.find((item) => item.vacation_status.toLowerCase() === "rejected")?.id ?? null,
    [vacationStatusesQuery.data],
  );
  const pendingStatusId = useMemo(
    () => vacationStatusesQuery.data?.find((item) => item.vacation_status.toLowerCase() === "pending")?.id ?? null,
    [vacationStatusesQuery.data],
  );

  const refreshVacations = async () => {
    await queryClient.invalidateQueries({ queryKey: ["vacations"] });
  };

  const createVacation = useMutation({
    mutationFn: () =>
      scope === "manage"
        ? vacationApi.create({
            employee_id: Number(form.employee_id),
            start_date: form.start_date,
            end_date: form.end_date,
            vacation_type: Number(form.vacation_type),
            vacation_status: Number(form.vacation_status || pendingStatusId || 0),
            is_paid: form.is_paid,
          })
        : vacationApi.requestSelf({
            start_date: form.start_date,
            end_date: form.end_date,
            vacation_type: Number(form.vacation_type),
            is_paid: form.is_paid,
          }),
    onSuccess: async () => {
      toast({
        title: scope === "manage" ? "Vacation created" : "Vacation requested",
        description: scope === "manage" ? "The vacation record has been saved." : "Your vacation request was sent to the backend.",
      });
      setForm({
        employee_id: "",
        start_date: "",
        end_date: "",
        vacation_type: "",
        vacation_status: "",
        is_paid: true,
      });
      setRequestOpen(false);
      await refreshVacations();
    },
    onError: (error) => {
      toast({
        title: "Unable to save vacation",
        description: getErrorMessage(error, "Please review the vacation dates and type."),
        variant: "destructive",
      });
    },
  });

  const updateVacation = useMutation({
    mutationFn: ({ vacationId, statusId }: { vacationId: number; statusId: number }) =>
      vacationApi.update({
        id: vacationId,
        vacation_status: statusId,
      }),
    onSuccess: async () => {
      toast({ title: "Vacation updated", description: "The vacation status has been updated." });
      setActionState({ vacationId: null, statusId: null, label: "" });
      await refreshVacations();
    },
    onError: (error) => {
      toast({
        title: "Unable to update vacation",
        description: getErrorMessage(error, "The backend rejected the vacation update."),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? "Vacation Management" : "My Vacations"}
        description={
          scope === "manage"
            ? "Review, approve, reject, and create vacation records for employees."
            : "Request time off and review your own vacation history from `/me/vacations`."
        }
        actions={
          <>
            {scope === "manage" ? (
              <Input className="w-28" value={year} onChange={(event) => setYear(event.target.value)} type="number" />
            ) : null}
            <Button onClick={() => setRequestOpen(true)}>{scope === "manage" ? "Add vacation" : "Request vacation"}</Button>
          </>
        }
      />

      {scope === "manage" ? (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter by vacation type or status using the backend lookup values.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Vacation type id or label" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} />
            <Input placeholder="Status id or label" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{scope === "manage" ? "Vacation requests" : "My requests"}</CardTitle>
          <CardDescription>
            {scope === "manage"
              ? "HR/Admin views use `/vacation/{year}` while employee self-service uses `/me/vacations`."
              : "Your self-service vacation data is isolated to your own account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVacations.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {scope === "manage" ? <TableHead>Employee</TableHead> : null}
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                  {scope === "manage" ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVacations.map((vacation) => (
                  <TableRow key={vacation.id}>
                    {scope === "manage" ? <TableCell>{employeeMap[vacation.employee_id] || `Employee #${vacation.employee_id}`}</TableCell> : null}
                    <TableCell>{formatDate(vacation.start_date)}</TableCell>
                    <TableCell>{formatDate(vacation.end_date)}</TableCell>
                    <TableCell>{daysBetween(vacation.start_date, vacation.end_date)}</TableCell>
                    <TableCell>{formatLabel(String(vacation.vacation_type))}</TableCell>
                    <TableCell><StatusBadge status={String(vacation.vacation_status)} /></TableCell>
                    <TableCell>{vacation.is_paid ? "Yes" : "No"}</TableCell>
                    {scope === "manage" ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!approvedStatusId}
                            onClick={() =>
                              setActionState({
                                vacationId: vacation.id,
                                statusId: approvedStatusId,
                                label: "approve",
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!rejectedStatusId}
                            onClick={() =>
                              setActionState({
                                vacationId: vacation.id,
                                statusId: rejectedStatusId,
                                label: "reject",
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={vacationsQuery.isLoading ? "Loading vacations..." : "No vacations found"}
              description={
                scope === "manage"
                  ? "Try another year or create the first vacation entry."
                  : "You have not requested vacation yet."
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scope === "manage" ? "Add vacation" : "Request vacation"}</DialogTitle>
            <DialogDescription>
              {scope === "manage"
                ? "Create or stage a vacation record for an employee."
                : "This form uses `/me/vacations/request` and never sends an arbitrary employee id."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {scope === "manage" ? (
              <div className="space-y-2">
                <Label htmlFor="vacationEmployee">Employee ID</Label>
                <Input
                  id="vacationEmployee"
                  value={form.employee_id}
                  onChange={(event) => setForm((value) => ({ ...value, employee_id: event.target.value }))}
                  placeholder="Employee id"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="vacationStart">Start date</Label>
              <Input id="vacationStart" type="date" value={form.start_date} onChange={(event) => setForm((value) => ({ ...value, start_date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacationEnd">End date</Label>
              <Input id="vacationEnd" type="date" value={form.end_date} onChange={(event) => setForm((value) => ({ ...value, end_date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacationType">Vacation type ID</Label>
              <Input id="vacationType" value={form.vacation_type} onChange={(event) => setForm((value) => ({ ...value, vacation_type: event.target.value }))} placeholder="Use a value from /vacation_types" />
            </div>
            {scope === "manage" ? (
              <div className="space-y-2">
                <Label htmlFor="vacationStatus">Vacation status ID</Label>
                <Input id="vacationStatus" value={form.vacation_status} onChange={(event) => setForm((value) => ({ ...value, vacation_status: event.target.value }))} placeholder={`Default pending id: ${pendingStatusId ?? "unknown"}`} />
              </div>
            ) : null}
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Paid vacation
              <input type="checkbox" checked={form.is_paid} onChange={(event) => setForm((value) => ({ ...value, is_paid: event.target.checked }))} />
            </label>
            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Vacation types are currently backend ids. A dedicated frontend-friendly lookup/value mapping is loaded from `/vacation_types`, but the backend update API still expects ids.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createVacation.mutate()} disabled={createVacation.isPending}>
              {createVacation.isPending ? "Saving..." : scope === "manage" ? "Create vacation" : "Request vacation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(actionState.vacationId)} onOpenChange={(open) => !open && setActionState({ vacationId: null, statusId: null, label: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{formatLabel(actionState.label)} vacation</AlertDialogTitle>
            <AlertDialogDescription>
              {actionState.label === "reject"
                ? "The backend update schema does not include a rejection reason field, so this action only changes the status."
                : "This updates the vacation status using the backend vacation update endpoint."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionState.vacationId &&
                actionState.statusId &&
                updateVacation.mutate({
                  vacationId: actionState.vacationId,
                  statusId: actionState.statusId,
                })
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
