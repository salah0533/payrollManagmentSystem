import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { VacationBalancePanel } from "@/components/vacations/VacationBalancePanel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatDate, formatLabel } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { employeeApi } from "@/services/employeeApi";
import { vacationApi } from "@/services/vacationApi";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function daysBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function Vacations({ scope }: { scope: "manage" | "self" }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedBalanceEmployeeId, setSelectedBalanceEmployeeId] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [editingVacationId, setEditingVacationId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<{ vacationId: number | null; statusId: number | null; label: "approve" | "reject" | "cancel" | "" }>({
    vacationId: null,
    statusId: null,
    label: "",
  });
  const [form, setForm] = useState({
    employee_id: "",
    employee_ids: [] as string[],
    start_date: "",
    end_date: "",
    vacation_type: "",
    vacation_status: "",
    is_paid: true,
  });
  const resetForm = () => {
    setEditingVacationId(null);
    setForm({
      employee_id: "",
      employee_ids: [],
      start_date: "",
      end_date: "",
      vacation_type: "",
      vacation_status: "",
      is_paid: true,
    });
  };

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

  useEffect(() => {
    if (scope === "manage" && !selectedBalanceEmployeeId && employeesQuery.data?.length) {
      setSelectedBalanceEmployeeId(String(employeesQuery.data[0].id));
    }
  }, [employeesQuery.data, scope, selectedBalanceEmployeeId]);

  const balanceQuery = useQuery({
    queryKey: ["vacation-balance", scope, scope === "manage" ? selectedBalanceEmployeeId : currentUser?.employee_id],
    queryFn: () =>
      scope === "manage"
        ? vacationApi.getBalance(Number(selectedBalanceEmployeeId))
        : vacationApi.getMyBalance(),
    enabled: scope === "manage" ? Boolean(selectedBalanceEmployeeId) : Boolean(currentUser?.employee_id),
  });

  const employeeMap = useMemo(
    () => Object.fromEntries((employeesQuery.data || []).map((employee) => [employee.id, employee.full_name])),
    [employeesQuery.data],
  );

  const vacationTypeMap = useMemo(
    () => Object.fromEntries((vacationTypesQuery.data || []).map((item) => [item.id, item.vacation_type])),
    [vacationTypesQuery.data],
  );

  const vacationStatusMap = useMemo(
    () => Object.fromEntries((vacationStatusesQuery.data || []).map((item) => [item.id, item.vacation_status])),
    [vacationStatusesQuery.data],
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
  const cancelledStatusId = useMemo(
    () => vacationStatusesQuery.data?.find((item) => {
      const value = item.vacation_status.toLowerCase();
      return value === "cancelled" || value === "canceled";
    })?.id ?? null,
    [vacationStatusesQuery.data],
  );
  const pendingStatusId = useMemo(
    () => vacationStatusesQuery.data?.find((item) => item.vacation_status.toLowerCase() === "pending")?.id ?? null,
    [vacationStatusesQuery.data],
  );
  const holidayTypeId = useMemo(
    () =>
      vacationTypesQuery.data?.find((item) => {
        const value = (item.code || item.vacation_type || "").toLowerCase();
        return value === "holiday";
      })?.id ?? null,
    [vacationTypesQuery.data],
  );
  const selectableVacationTypes = useMemo(
    () =>
      (vacationTypesQuery.data || []).filter((item) => {
        if (scope === "manage") {
          return true;
        }
        return holidayTypeId == null || item.id !== holidayTypeId;
      }),
    [holidayTypeId, scope, vacationTypesQuery.data],
  );
  const isHolidayTypeSelected = scope === "manage" && !editingVacationId && holidayTypeId != null && Number(form.vacation_type) === holidayTypeId;

  const refreshVacations = async () => {
    await queryClient.invalidateQueries({ queryKey: ["vacations"] });
    await queryClient.invalidateQueries({ queryKey: ["vacation-balance"] });
  };

  const createVacation = useMutation({
    mutationFn: () =>
      scope === "manage"
        ? isHolidayTypeSelected
          ? vacationApi.createBulk({
              employee_ids: form.employee_ids.map(Number),
              start_date: form.start_date,
              end_date: form.end_date,
              vacation_type: Number(form.vacation_type),
              vacation_status: Number(approvedStatusId || 0),
              is_paid: true,
            })
          : vacationApi.create({
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
        title:
          scope === "manage"
            ? t("vacationsPage.createSuccessManage")
            : t("vacationsPage.createSuccessSelf"),
        description:
          scope === "manage"
            ? t("vacationsPage.createSuccessManageDescription")
            : t("vacationsPage.createSuccessSelfDescription"),
      });
      resetForm();
      setRequestOpen(false);
      await refreshVacations();
    },
    onError: (error) => {
      toast({
        title: t("vacationsPage.createError"),
        description: getErrorMessage(error, t("vacationsPage.createErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const updateVacation = useMutation({
    mutationFn: (payload: Parameters<typeof vacationApi.update>[0]) => vacationApi.update(payload),
    onSuccess: async () => {
      toast({
        title: t("vacationsPage.updateSuccess"),
        description: t("vacationsPage.updateSuccessDescription"),
      });
      setActionState({ vacationId: null, statusId: null, label: "" });
      setRequestOpen(false);
      resetForm();
      await refreshVacations();
    },
    onError: (error) => {
      toast({
        title: t("vacationsPage.updateError"),
        description: getErrorMessage(error, t("vacationsPage.updateErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const openEditVacation = (vacation: NonNullable<(typeof vacationsQuery.data)>[number]) => {
    setEditingVacationId(vacation.id);
    setForm({
      employee_id: String(vacation.employee_id),
      employee_ids: [String(vacation.employee_id)],
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      vacation_type: String(vacation.vacation_type),
      vacation_status: String(vacation.vacation_status),
      is_paid: vacation.is_paid,
    });
    setRequestOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? t("vacationsPage.manageTitle") : t("vacationsPage.selfTitle")}
        description={
          scope === "manage"
            ? t("vacationsPage.manageDescription")
            : t("vacationsPage.selfDescription")
        }
        actions={
          <>
            {scope === "manage" ? (
              <Input className="w-28" value={year} onChange={(event) => setYear(event.target.value)} type="number" />
            ) : null}
            <Button onClick={() => setRequestOpen(true)}>
              {scope === "manage" ? t("vacationsPage.addVacation") : t("vacationsPage.requestVacation")}
            </Button>
          </>
        }
      />

      {scope === "manage" ? (
        <Card className="filter-card">
          <CardHeader>
            <CardTitle>{t("common.filters")}</CardTitle>
            <CardDescription>{t("vacationsPage.filtersDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("vacationsPage.allVacationTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("vacationsPage.allVacationTypes")}</SelectItem>
                {(vacationTypesQuery.data || []).map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {formatLabel(type.vacation_type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("vacationsPage.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("vacationsPage.allStatuses")}</SelectItem>
                {(vacationStatusesQuery.data || []).map((status) => (
                  <SelectItem key={status.id} value={String(status.id)}>
                    {formatLabel(status.vacation_status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ) : null}

      {scope === "manage" ? (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="filter-card">
              <CardHeader>
              <CardTitle>{t("vacationsPage.employeeBalance")}</CardTitle>
              <CardDescription>{t("vacationsPage.employeeBalanceDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                <Label htmlFor="balanceEmployee">{t("common.employee")}</Label>
                <Select value={selectedBalanceEmployeeId || undefined} onValueChange={setSelectedBalanceEmployeeId}>
                  <SelectTrigger id="balanceEmployee">
                    <SelectValue placeholder={t("vacationsPage.selectEmployee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeesQuery.data || []).map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <VacationBalancePanel
            balance={balanceQuery.data}
            isLoading={balanceQuery.isLoading}
            title={selectedBalanceEmployeeId ? employeeMap[Number(selectedBalanceEmployeeId)] || t("vacationsPage.annualBalanceTitle") : t("vacationsPage.annualBalanceTitle")}
            description={t("vacationsPage.balanceDescription")}
            emptyTitle={t("vacationsPage.selectEmployeeEmpty")}
            emptyDescription={t("vacationsPage.selectEmployeeEmptyDescription")}
          />
        </div>
      ) : (
        <VacationBalancePanel
          balance={balanceQuery.data}
          isLoading={balanceQuery.isLoading}
          title={t("vacationsPage.annualBalanceTitle")}
          description={t("vacationsPage.annualBalanceDescription")}
          emptyTitle={t("vacationsPage.noBalance")}
          emptyDescription={t("vacationsPage.noBalanceDescription")}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{scope === "manage" ? t("vacationsPage.requestsTitleManage") : t("vacationsPage.requestsTitleSelf")}</CardTitle>
          <CardDescription>
            {scope === "manage"
              ? t("vacationsPage.requestsDescriptionManage")
              : t("vacationsPage.requestsDescriptionSelf")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVacations.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {scope === "manage" ? <TableHead>{t("common.employee")}</TableHead> : null}
                  <TableHead>{t("vacationsPage.start")}</TableHead>
                  <TableHead>{t("vacationsPage.end")}</TableHead>
                  <TableHead>{t("vacationsPage.days")}</TableHead>
                  <TableHead>{t("common.type")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("vacationsPage.paid")}</TableHead>
                  {scope === "manage" ? <TableHead className="text-right">{t("common.actions")}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVacations.map((vacation) => (
                  <TableRow key={vacation.id}>
                    {scope === "manage" ? <TableCell>{employeeMap[vacation.employee_id] || t("labels.employeeId", { id: vacation.employee_id })}</TableCell> : null}
                    <TableCell>{formatDate(vacation.start_date)}</TableCell>
                    <TableCell>{formatDate(vacation.end_date)}</TableCell>
                    <TableCell>{daysBetween(vacation.start_date, vacation.end_date)}</TableCell>
                    <TableCell>{formatLabel(vacationTypeMap[Number(vacation.vacation_type)] || String(vacation.vacation_type))}</TableCell>
                    <TableCell><StatusBadge status={vacationStatusMap[Number(vacation.vacation_status)] || String(vacation.vacation_status)} /></TableCell>
                    <TableCell>{vacation.is_paid ? t("common.yes") : t("common.no")}</TableCell>
                    {scope === "manage" ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!approvedStatusId || Number(vacation.vacation_status) === approvedStatusId}
                            onClick={() =>
                              setActionState({
                                vacationId: vacation.id,
                                statusId: approvedStatusId,
                                label: "approve",
                              })
                            }
                          >
                            {t("vacationsPage.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!rejectedStatusId || Number(vacation.vacation_status) === rejectedStatusId}
                            onClick={() =>
                              setActionState({
                                vacationId: vacation.id,
                                statusId: rejectedStatusId,
                                label: "reject",
                              })
                            }
                          >
                            {t("vacationsPage.reject")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!cancelledStatusId || Number(vacation.vacation_status) === cancelledStatusId}
                            onClick={() =>
                              setActionState({
                                vacationId: vacation.id,
                                statusId: cancelledStatusId,
                                label: "cancel",
                              })
                            }
                          >
                            {t("vacationsPage.cancelVacation")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditVacation(vacation)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
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
              title={vacationsQuery.isLoading ? t("vacationsPage.loadingVacations") : t("vacationsPage.noVacations")}
              description={
                scope === "manage"
                  ? t("vacationsPage.noVacationsManageDescription")
                  : t("vacationsPage.noVacationsSelfDescription")
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {scope === "manage"
                ? editingVacationId
                  ? t("vacationsPage.editVacation")
                  : t("vacationsPage.addVacation")
                : t("vacationsPage.requestVacation")}
            </DialogTitle>
            <DialogDescription>
              {scope === "manage"
                ? editingVacationId
                  ? t("vacationsPage.dialogDescriptionEditManage")
                  : t("vacationsPage.dialogDescriptionManage")
                : t("vacationsPage.dialogDescriptionSelf")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {scope === "manage" && !isHolidayTypeSelected ? (
              <div className="space-y-2">
                <Label htmlFor="vacationEmployee">{t("common.employee")}</Label>
                <Select value={form.employee_id} onValueChange={(value) => setForm((current) => ({ ...current, employee_id: value }))}>
                  <SelectTrigger id="vacationEmployee">
                    <SelectValue placeholder={t("vacationsPage.selectEmployee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeesQuery.data || []).map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {isHolidayTypeSelected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("vacationsPage.selectEmployeesForHoliday")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        employee_ids:
                          current.employee_ids.length === (employeesQuery.data || []).length
                            ? []
                            : (employeesQuery.data || []).map((employee) => String(employee.id)),
                      }))
                    }
                  >
                    {form.employee_ids.length === (employeesQuery.data || []).length
                      ? t("vacationsPage.clearEmployeeSelection")
                      : t("vacationsPage.selectAllEmployees")}
                  </Button>
                </div>
                <div className="grid max-h-56 gap-3 overflow-y-auto rounded-lg border border-border p-3">
                  {(employeesQuery.data || []).map((employee) => {
                    const value = String(employee.id);
                    const checked = form.employee_ids.includes(value);
                    return (
                      <label key={employee.id} className="flex items-center gap-3 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setForm((current) => ({
                              ...current,
                              employee_ids:
                                nextChecked === true
                                  ? [...current.employee_ids, value]
                                  : current.employee_ids.filter((item) => item !== value),
                            }))
                          }
                        />
                        <span>{employee.full_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="vacationStart">{t("common.startDate")}</Label>
              <Input id="vacationStart" type="date" value={form.start_date} onChange={(event) => setForm((value) => ({ ...value, start_date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacationEnd">{t("common.endDate")}</Label>
              <Input id="vacationEnd" type="date" value={form.end_date} onChange={(event) => setForm((value) => ({ ...value, end_date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacationType">{t("common.type")}</Label>
              <Select value={form.vacation_type} onValueChange={(value) => setForm((current) => ({ ...current, vacation_type: value }))}>
                <SelectTrigger id="vacationType">
                <SelectValue placeholder={t("vacationsPage.allVacationTypes")} />
                </SelectTrigger>
                <SelectContent>
                  {selectableVacationTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {formatLabel(type.vacation_type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scope === "manage" && !isHolidayTypeSelected ? (
              <div className="space-y-2">
                <Label htmlFor="vacationStatus">{t("vacationsPage.vacationStatus")}</Label>
                <Select value={form.vacation_status || String(pendingStatusId ?? "")} onValueChange={(value) => setForm((current) => ({ ...current, vacation_status: value }))}>
                  <SelectTrigger id="vacationStatus">
                    <SelectValue placeholder={t("vacationsPage.vacationStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(vacationStatusesQuery.data || []).map((status) => (
                      <SelectItem key={status.id} value={String(status.id)}>
                        {formatLabel(status.vacation_status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {!isHolidayTypeSelected ? (
              <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                {t("vacationsPage.paidVacation")}
                <input type="checkbox" checked={form.is_paid} onChange={(event) => setForm((value) => ({ ...value, is_paid: event.target.checked }))} />
              </label>
            ) : (
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                {t("vacationsPage.holidayVacationHint")}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                editingVacationId
                  ? updateVacation.mutate({
                      id: editingVacationId,
                      employee_id: Number(form.employee_id),
                      start_date: form.start_date,
                      end_date: form.end_date,
                      vacation_type: Number(form.vacation_type),
                      vacation_status: Number(form.vacation_status || pendingStatusId || 0),
                      is_paid: form.is_paid,
                    })
                  : createVacation.mutate()
              }
              disabled={
                createVacation.isPending ||
                updateVacation.isPending ||
                (scope === "manage" && !editingVacationId && !isHolidayTypeSelected && !form.employee_id) ||
                (isHolidayTypeSelected && form.employee_ids.length === 0)
              }
            >
              {createVacation.isPending || updateVacation.isPending
                ? t("common.saving")
                : editingVacationId
                  ? t("vacationsPage.saveChanges")
                  : scope === "manage"
                    ? t("vacationsPage.addVacation")
                    : t("vacationsPage.requestVacation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(actionState.vacationId)} onOpenChange={(open) => !open && setActionState({ vacationId: null, statusId: null, label: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`vacationsPage.actionLabels.${actionState.label || "approve"}`)} {t("vacationsPage.vacationNoun")}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionState.label === "reject"
                ? t("vacationsPage.actionDescriptionReject")
                : actionState.label === "cancel"
                  ? t("vacationsPage.actionDescriptionCancel")
                  : t("vacationsPage.actionDescriptionDefault")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionState.vacationId &&
                actionState.statusId &&
                updateVacation.mutate({
                  id: actionState.vacationId,
                  vacation_status: actionState.statusId,
                })
              }
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
