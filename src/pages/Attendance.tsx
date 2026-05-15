import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatLabel, formatMinutes, formatTime, toIsoDate } from "@/lib/format";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { toast } from "@/hooks/use-toast";
import type { AttendanceDay } from "@/types/domain";

type AttendanceField = "check_in_time" | "break_start_time" | "break_end_time" | "check_out_time" | "status";

const correctionFields: { value: AttendanceField; label: string }[] = [
  { value: "check_in_time", label: "Check in" },
  { value: "break_start_time", label: "Break start" },
  { value: "break_end_time", label: "Break end" },
  { value: "check_out_time", label: "Check out" },
  { value: "status", label: "Status" },
];

const statusOptions = ["present", "late", "incomplete", "absent", "paid_vacation", "unpaid_vacation", "sick_leave", "weekly_off", "holiday"];

export default function Attendance({ scope }: { scope: "manage" | "self" }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(toIsoDate(new Date()));
  const [historyEmployeeId, setHistoryEmployeeId] = useState("");
  const [historyMonth, setHistoryMonth] = useState(format(new Date(), "yyyy-MM"));
  const [range, setRange] = useState({
    start_date: toIsoDate(startOfMonth(new Date())),
    end_date: toIsoDate(endOfMonth(new Date())),
  });
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceDay | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    employee_id: "",
    work_date: "",
    field_changed: "check_in_time" as AttendanceField,
    new_value: "",
    reason: "",
  });

  const employeesQuery = useQuery({
    queryKey: ["attendance", "employees"],
    queryFn: () => employeeApi.list(),
    enabled: scope === "manage",
  });

  const dailyAttendanceQuery = useQuery({
    queryKey: ["attendance", "manage", dateFilter],
    queryFn: () => attendanceApi.listByDate(dateFilter),
    enabled: scope === "manage",
  });

  const selfAttendanceQuery = useQuery({
    queryKey: ["attendance", "self", range.start_date, range.end_date],
    queryFn: () => attendanceApi.selfList(range.start_date, range.end_date),
    enabled: scope === "self",
  });

  const employeeMap = useMemo(
    () => Object.fromEntries((employeesQuery.data || []).map((employee) => [employee.id, employee])),
    [employeesQuery.data],
  );

  const firstEmployeeId = employeesQuery.data?.[0]?.id ? String(employeesQuery.data[0].id) : "";
  const selectedHistoryEmployeeId = historyEmployeeId || firstEmployeeId;

  const historyRange = useMemo(() => {
    const monthValue = historyMonth || format(new Date(), "yyyy-MM");
    const monthStart = startOfMonth(new Date(`${monthValue}-01T00:00:00`));
    const monthEnd = endOfMonth(monthStart);
    return {
      start_date: toIsoDate(monthStart),
      end_date: toIsoDate(monthEnd),
      monthStart,
      monthEnd,
    };
  }, [historyMonth]);

  const employeeHistoryQuery = useQuery({
    queryKey: [
      "attendance",
      "manage",
      "employee-history",
      selectedHistoryEmployeeId,
      historyRange.start_date,
      historyRange.end_date,
    ],
    queryFn: () =>
      attendanceApi.getEmployeeRange(
        Number(selectedHistoryEmployeeId),
        historyRange.start_date,
        historyRange.end_date,
      ),
    enabled: scope === "manage" && Boolean(selectedHistoryEmployeeId),
  });

  const filteredDailyRows = useMemo(() => {
    return (dailyAttendanceQuery.data || []).filter((row) => {
      const employee = employeeMap[row.employee_id];
      const employeeName = employee?.full_name || `Employee #${row.employee_id}`;
      const matchesSearch = employeeName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || row.status.toLowerCase().includes(statusFilter.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [dailyAttendanceQuery.data, employeeMap, search, statusFilter]);

  const historyRowsByDate = useMemo(
    () => Object.fromEntries((employeeHistoryQuery.data || []).map((row) => [row.work_date, row])),
    [employeeHistoryQuery.data],
  );

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: historyRange.monthStart, end: historyRange.monthEnd }),
    [historyRange.monthEnd, historyRange.monthStart],
  );

  const calendarLeadingBlanks = useMemo(
    () => Array.from({ length: (getDay(historyRange.monthStart) + 6) % 7 }),
    [historyRange.monthStart],
  );

  const selfRows = useMemo(() => selfAttendanceQuery.data ?? [], [selfAttendanceQuery.data]);

  const manageStats = useMemo(() => {
    const rows = filteredDailyRows;
    const present = rows.filter((row) => row.status.toLowerCase().includes("present")).length;
    const late = rows.filter((row) => row.status.toLowerCase().includes("late")).length;
    const incomplete = rows.filter((row) => row.status.toLowerCase().includes("incomplete")).length;
    const absent = rows.filter((row) => row.status.toLowerCase().includes("absent")).length;
    return { present, late, incomplete, absent };
  }, [filteredDailyRows]);

  const selfStats = useMemo(() => {
    const worked = selfRows.reduce((sum, row) => sum + row.actual_work_minutes, 0);
    const lateDays = selfRows.filter((row) => row.late_minutes > 0).length;
    const missedCheckout = selfRows.filter((row) => row.check_in_time && !row.check_out_time).length;
    return { worked, lateDays, missedCheckout };
  }, [selfRows]);

  const refreshManageAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance", "manage"] });
  };

  const refreshSelfAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance", "self"] });
  };

  const selectedCorrectionEmployee = employeeMap[Number(correctionForm.employee_id)];
  const selectedCorrectionField = correctionFields.find((field) => field.value === correctionForm.field_changed);
  const correctionFieldIsStatus = correctionForm.field_changed === "status";

  const valueForField = (row: AttendanceDay | null, field: AttendanceField) => {
    if (!row) {
      return field === "status" ? "present" : "";
    }
    if (field === "status") {
      return row.status || "present";
    }
    return (row[field] || "").slice(0, 5);
  };

  const canEditCorrectionField = (field: AttendanceField) => {
    if (field === "check_in_time" || field === "status") {
      return true;
    }
    if (field === "break_start_time") {
      return Boolean(editingAttendance?.check_in_time);
    }
    if (field === "break_end_time") {
      return Boolean(editingAttendance?.break_start_time);
    }
    if (field === "check_out_time") {
      return Boolean(editingAttendance?.check_in_time && (!editingAttendance.break_start_time || editingAttendance.break_end_time));
    }
    return false;
  };

  const openAttendanceEditor = (row: AttendanceDay | null, employeeId: number, workDate: string) => {
    const field: AttendanceField = "check_in_time";
    setEditingAttendance(row);
    setCorrectionForm({
      employee_id: String(employeeId),
      work_date: workDate,
      field_changed: field,
      new_value: valueForField(row, field),
      reason: "",
    });
    setCorrectionOpen(true);
  };

  const markAllPresent = useMutation({
    mutationFn: () => attendanceApi.markAllPresent(dateFilter),
    onSuccess: async (result) => {
      toast({
        title: "Attendance updated",
        description: `Created ${result.created || 0}, updated ${result.updated || 0} records.`,
      });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to mark attendance",
        description: getErrorMessage(error, "The backend rejected the mark-all-present request."),
        variant: "destructive",
      });
    },
  });

  const submitCorrection = useMutation({
    mutationFn: () => {
      if (!canEditCorrectionField(correctionForm.field_changed)) {
        throw new Error("Complete the earlier attendance fields before editing this one.");
      }
      return attendanceApi.manualCorrection({
        employee_id: Number(correctionForm.employee_id),
        work_date: correctionForm.work_date,
        field_changed: correctionForm.field_changed,
        new_value: correctionForm.new_value,
        reason: correctionForm.reason,
      });
    },
    onSuccess: async () => {
      toast({ title: "Attendance corrected", description: "The correction request was accepted by the backend." });
      setCorrectionOpen(false);
      setEditingAttendance(null);
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to save correction",
        description: getErrorMessage(error, "Please review the correction details."),
        variant: "destructive",
      });
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: () => attendanceApi.deleteDay(Number(correctionForm.employee_id), correctionForm.work_date),
    onSuccess: async () => {
      toast({ title: "Attendance deleted", description: "The attendance day was removed." });
      setCorrectionOpen(false);
      setEditingAttendance(null);
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to delete attendance",
        description: getErrorMessage(error, "The backend rejected the delete request."),
        variant: "destructive",
      });
    },
  });

  const recalculateAttendance = useMutation({
    mutationFn: ({ employeeId, workDate }: { employeeId: number; workDate: string }) =>
      attendanceApi.recalculate(employeeId, workDate, workDate),
    onSuccess: async (result) => {
      toast({
        title: "Attendance recalculated",
        description: `Recalculated ${result.recalculated_days} day(s) for employee ${result.employee_id}.`,
      });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
      await refreshSelfAttendance();
    },
    onError: (error) => {
      toast({
        title: "Unable to recalculate attendance",
        description: getErrorMessage(error, "The backend rejected the recalculation request."),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? "Attendance Management" : "My Attendance"}
        description={
          scope === "manage"
            ? "Review daily attendance, mark all present, investigate incomplete days, and submit corrections."
            : "Review your attendance history and worked time."
        }
        actions={
          scope === "manage" ? (
            <>
              <Input className="w-40" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              <Button variant="outline" onClick={() => markAllPresent.mutate()} disabled={markAllPresent.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {markAllPresent.isPending ? "Saving..." : "Mark all present"}
              </Button>
            </>
          ) : null
        }
      />

      {scope === "manage" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Present" value={manageStats.present} icon={CheckCircle2} tone="success" />
            <MetricCard label="Late" value={manageStats.late} icon={RotateCcw} tone="warning" />
            <MetricCard label="Incomplete" value={manageStats.incomplete} icon={RotateCcw} tone="info" />
            <MetricCard label="Absent" value={manageStats.absent} icon={RotateCcw} tone="danger" />
          </div>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search by employee and filter by attendance status keyword.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Search employee" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Input placeholder="Status filter: present, late, absent" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>Attendance list</CardTitle>
              <CardDescription>Daily attendance records for the selected date.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDailyRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check in</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Check out</TableHead>
                      <TableHead>Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyRows.map((row) => {
                      const employee = employeeMap[row.employee_id];
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{employee?.full_name || `Employee #${row.employee_id}`}</p>
                              <p className="text-xs text-muted-foreground">{employee?.position || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(row.work_date)}</TableCell>
                          <TableCell>{formatTime(row.check_in_time)}</TableCell>
                          <TableCell>
                            {row.break_start_time || row.break_end_time
                              ? `${formatTime(row.break_start_time)} - ${formatTime(row.break_end_time)}`
                              : "-"}
                          </TableCell>
                          <TableCell>{formatTime(row.check_out_time)}</TableCell>
                          <TableCell>{formatMinutes(row.actual_work_minutes)}</TableCell>
                          <TableCell><StatusBadge status={row.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAttendanceEditor(row, row.employee_id, row.work_date)}
                              >
                                Correct
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => recalculateAttendance.mutate({ employeeId: row.employee_id, workDate: row.work_date })}
                              >
                                Recalculate
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title={dailyAttendanceQuery.isLoading ? "Loading attendance..." : "No attendance rows found"}
                  description="Try another date, or mark all present to generate the daily base records."
                />
              )}
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>Employee history</CardTitle>
              <CardDescription>Select an employee and month to review attendance by day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="space-y-2">
                  <Label htmlFor="historyEmployee">Employee</Label>
                  <Select value={selectedHistoryEmployeeId} onValueChange={setHistoryEmployeeId}>
                    <SelectTrigger id="historyEmployee">
                      <SelectValue placeholder="Select employee" />
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
                <div className="space-y-2">
                  <Label htmlFor="historyMonth">Month</Label>
                  <Input id="historyMonth" type="month" value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarLeadingBlanks.map((_, index) => (
                  <div key={`blank-${index}`} className="min-h-24 rounded border border-dashed border-transparent" />
                ))}
                {calendarDays.map((day) => {
                  const isoDate = toIsoDate(day);
                  const row = historyRowsByDate[isoDate];
                  return (
                    <button
                      key={isoDate}
                      type="button"
                      disabled={!selectedHistoryEmployeeId}
                      className="min-h-24 rounded border bg-background p-2 text-left transition-colors hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => openAttendanceEditor(row || null, Number(selectedHistoryEmployeeId), isoDate)}
                    >
                      <span className="text-sm font-semibold">{format(day, "d")}</span>
                      <div className="mt-1">
                        {row ? <StatusBadge status={row.status} className="text-[10px]" /> : <span className="text-xs text-muted-foreground">No record</span>}
                      </div>
                      {row ? (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>{formatTime(row.check_in_time)} - {formatTime(row.check_out_time)}</p>
                          <p>{formatMinutes(row.actual_work_minutes)}</p>
                          <p>{formatLabel(row.status)}</p>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {!selectedHistoryEmployeeId || employeeHistoryQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  {employeeHistoryQuery.isLoading ? "Loading monthly attendance..." : "Select an employee to load the calendar."}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Tracked days" value={selfRows.length} icon={CheckCircle2} tone="success" />
            <MetricCard label="Worked time" value={formatMinutes(selfStats.worked)} icon={RotateCcw} tone="info" />
            <MetricCard label="Late / incomplete" value={`${selfStats.lateDays} / ${selfStats.missedCheckout}`} icon={RotateCcw} tone="warning" />
          </div>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>Date range</CardTitle>
              <CardDescription>Choose the dates you want to review.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input type="date" value={range.start_date} onChange={(event) => setRange((value) => ({ ...value, start_date: event.target.value }))} />
              <Input type="date" value={range.end_date} onChange={(event) => setRange((value) => ({ ...value, end_date: event.target.value }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance history</CardTitle>
            </CardHeader>
            <CardContent>
              {selfRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check in</TableHead>
                      <TableHead>Check out</TableHead>
                      <TableHead>Worked</TableHead>
                      <TableHead>Late</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selfRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.work_date)}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell>{formatTime(row.check_in_time)}</TableCell>
                        <TableCell>{formatTime(row.check_out_time)}</TableCell>
                        <TableCell>{formatMinutes(row.actual_work_minutes)}</TableCell>
                        <TableCell>{formatMinutes(row.late_minutes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title={selfAttendanceQuery.isLoading ? "Loading your attendance..." : "No attendance records yet"}
                  description="Change the date range or use the self-service attendance actions from the employee home page."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={correctionOpen}
        onOpenChange={(open) => {
          setCorrectionOpen(open);
          if (!open) {
            setEditingAttendance(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attendance correction</DialogTitle>
            <DialogDescription>
              {selectedCorrectionEmployee?.full_name || `Employee #${correctionForm.employee_id}`} on {formatDate(correctionForm.work_date)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <div className="rounded border bg-muted/40 px-3 py-2 text-sm">
                {selectedCorrectionEmployee?.full_name || `Employee #${correctionForm.employee_id}`}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionDate">Work date</Label>
              <Input id="correctionDate" type="date" value={correctionForm.work_date} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionField">Field changed</Label>
              <Select
                value={correctionForm.field_changed}
                onValueChange={(value) => {
                  const field = value as AttendanceField;
                  setCorrectionForm((current) => ({
                    ...current,
                    field_changed: field,
                    new_value: valueForField(editingAttendance, field),
                  }));
                }}
              >
                <SelectTrigger id="correctionField">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {correctionFields.map((field) => (
                    <SelectItem key={field.value} value={field.value} disabled={!canEditCorrectionField(field.value)}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canEditCorrectionField(correctionForm.field_changed) ? (
                <p className="text-xs text-muted-foreground">Complete the earlier attendance fields before editing {selectedCorrectionField?.label.toLowerCase()}.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionValue">New value</Label>
              {correctionFieldIsStatus ? (
                <Select value={correctionForm.new_value || "present"} onValueChange={(value) => setCorrectionForm((current) => ({ ...current, new_value: value }))}>
                  <SelectTrigger id="correctionValue">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="correctionValue"
                  type="time"
                  value={correctionForm.new_value}
                  disabled={!canEditCorrectionField(correctionForm.field_changed)}
                  onChange={(event) => setCorrectionForm((value) => ({ ...value, new_value: event.target.value }))}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionReason">Reason</Label>
              <Input id="correctionReason" value={correctionForm.reason} onChange={(event) => setCorrectionForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingAttendance ? (
              <Button variant="destructive" onClick={() => deleteAttendance.mutate()} disabled={deleteAttendance.isPending}>
                {deleteAttendance.isPending ? "Deleting..." : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitCorrection.mutate()}
              disabled={
                submitCorrection.isPending ||
                !correctionForm.reason.trim() ||
                !correctionForm.new_value ||
                !canEditCorrectionField(correctionForm.field_changed)
              }
            >
              {submitCorrection.isPending ? "Saving..." : "Submit correction"}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
