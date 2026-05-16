import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { AlertTriangle, CalendarCheck2, CheckCircle2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatLabel, formatMinutes, formatTime, toIsoDate } from "@/lib/format";
import { hasPermission } from "@/lib/roles";
import {
  attendanceReviewStatuses,
  attendanceStatuses,
  getAttendanceReviewStatus,
  isAttendanceLocked,
  smartAttendanceStatuses,
} from "@/lib/workflow";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import type { AttendanceDay, AttendanceReviewPayload } from "@/types/domain";

type AttendanceField = "check_in_time" | "break_start_time" | "break_end_time" | "check_out_time";
type CorrectionMode = "manual" | "smart";

const correctionFields: { value: AttendanceField; label: string }[] = [
  { value: "check_in_time", label: "Check in" },
  { value: "break_start_time", label: "Break start" },
  { value: "break_end_time", label: "Break end" },
  { value: "check_out_time", label: "Check out" },
];

const issueFilters = [
  { value: "missing_check_in", label: "Missing check-in" },
  { value: "missing_check_out", label: "Missing check-out" },
  { value: "late", label: "Late beyond grace" },
  { value: "absent", label: "Absence" },
  { value: "corrected", label: "Manual correction" },
  { value: "needs_review", label: "Needs review" },
  { value: "approved", label: "Approved" },
] as const;

function rowKey(row: Pick<AttendanceDay, "employee_id" | "work_date">) {
  return `${row.employee_id}:${row.work_date}`;
}

function valueForField(row: AttendanceDay | null, field: AttendanceField) {
  return row?.[field]?.slice(0, 5) || "";
}

function buildManualCorrectionValues(
  form: Partial<Record<AttendanceField, string>>,
  row: AttendanceDay | null,
): Partial<Record<AttendanceField, string | null>> {
  const updates: Partial<Record<AttendanceField, string | null>> = {};

  for (const field of correctionFields) {
    const originalValue = valueForField(row, field.value);
    const nextValue = (form[field.value] || "").trim();

    if (nextValue === originalValue) {
      continue;
    }
    updates[field.value] = nextValue || null;
  }

  return updates;
}

function isMissingCheckIn(row: AttendanceDay) {
  return !row.check_in_time && !["absent", "paid_vacation", "unpaid_vacation", "sick_leave", "weekly_off", "holiday"].includes(row.status);
}

function isMissingCheckOut(row: AttendanceDay) {
  return Boolean(row.check_in_time && !row.check_out_time);
}

function matchesIssueFilter(row: AttendanceDay, issueFilter: string) {
  if (!issueFilter) return true;
  if (issueFilter === "missing_check_in") return isMissingCheckIn(row);
  if (issueFilter === "missing_check_out") return isMissingCheckOut(row);
  if (issueFilter === "late") return row.late_minutes > 0 || row.status === "late";
  if (issueFilter === "absent") return row.status === "absent";
  if (issueFilter === "corrected") return row.is_manually_corrected;
  if (issueFilter === "needs_review") return getAttendanceReviewStatus(row) === "needs_review";
  if (issueFilter === "approved") return getAttendanceReviewStatus(row) === "approved";
  return true;
}

export default function Attendance({ scope }: { scope: "manage" | "self" }) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const canCorrect = hasPermission(currentUser, "attendance.correct");
  const canReview = hasPermission(currentUser, "attendance.approve");
  const canRecalculate = hasPermission(currentUser, "attendance.recalculate");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(toIsoDate(new Date()));
  const [historyEmployeeId, setHistoryEmployeeId] = useState("");
  const [historyMonth, setHistoryMonth] = useState(format(new Date(), "yyyy-MM"));
  const [range, setRange] = useState({
    start_date: toIsoDate(startOfMonth(new Date())),
    end_date: toIsoDate(endOfMonth(new Date())),
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ reason: "", confirmation: "" });
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceDay | null>(null);
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>("manual");
  const [correctionForm, setCorrectionForm] = useState({
    employee_id: "",
    work_date: "",
    target_status: "present",
    late_minutes: "",
    check_in_time: "",
    break_start_time: "",
    break_end_time: "",
    check_out_time: "",
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
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesReview = !reviewFilter || getAttendanceReviewStatus(row) === reviewFilter;
      return matchesSearch && matchesStatus && matchesReview && matchesIssueFilter(row, issueFilter);
    });
  }, [dailyAttendanceQuery.data, employeeMap, issueFilter, reviewFilter, search, statusFilter]);

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedRowKeys);
    return filteredDailyRows.filter((row) => selected.has(rowKey(row)));
  }, [filteredDailyRows, selectedRowKeys]);

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
    const rows = dailyAttendanceQuery.data || [];
    return {
      present: rows.filter((row) => row.status === "present").length,
      late: rows.filter((row) => row.status === "late" || row.late_minutes > 0).length,
      incomplete: rows.filter((row) => row.status === "incomplete" || isMissingCheckOut(row)).length,
      absent: rows.filter((row) => row.status === "absent").length,
      needsReview: rows.filter((row) => getAttendanceReviewStatus(row) === "needs_review").length,
      locked: rows.filter((row) => isAttendanceLocked(row)).length,
    };
  }, [dailyAttendanceQuery.data]);

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
  const correctionLocked = isAttendanceLocked(editingAttendance);
  const affectedEmployees = employeesQuery.data || [];
  const canSubmitBulk = bulkForm.reason.trim().length >= 5 && bulkForm.confirmation.trim().toUpperCase() === "GENERATE";
  const pendingManualCorrectionValues = useMemo(
    () =>
      buildManualCorrectionValues(
        {
          check_in_time: correctionForm.check_in_time,
          break_start_time: correctionForm.break_start_time,
          break_end_time: correctionForm.break_end_time,
          check_out_time: correctionForm.check_out_time,
        },
        editingAttendance,
      ),
    [correctionForm, editingAttendance],
  );

  const openAttendanceEditor = (row: AttendanceDay | null, employeeId: number, workDate: string) => {
    setEditingAttendance(row);
    setCorrectionMode("manual");
    setCorrectionForm({
      employee_id: String(employeeId),
      work_date: workDate,
      target_status: row?.status || "present",
      late_minutes: row?.late_minutes ? String(row.late_minutes) : "",
      check_in_time: row?.check_in_time?.slice(0, 5) || "",
      break_start_time: row?.break_start_time?.slice(0, 5) || "",
      break_end_time: row?.break_end_time?.slice(0, 5) || "",
      check_out_time: row?.check_out_time?.slice(0, 5) || "",
      reason: "",
    });
    setCorrectionOpen(true);
  };

  const markAllPresent = useMutation({
    mutationFn: () => attendanceApi.markAllPresent(dateFilter),
    onSuccess: async (result) => {
      toast({
        title: "Scheduled attendance generated",
        description: `Created ${result.created || 0}, updated ${result.updated || 0} records. Keep the reason in your operational notes; this backend endpoint does not store it.`,
      });
      setBulkDialogOpen(false);
      setBulkForm({ reason: "", confirmation: "" });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to generate attendance",
        description: getErrorMessage(error, "The backend rejected the mark-all-present request."),
        variant: "destructive",
      });
    },
  });

  const submitCorrection = useMutation({
    mutationFn: () => {
      if (correctionLocked) {
        throw new Error("Locked attendance days cannot be corrected.");
      }

      if (correctionMode === "smart") {
        return attendanceApi.smartCorrection(Number(correctionForm.employee_id), correctionForm.work_date, {
          target_status: correctionForm.target_status,
          reason: correctionForm.reason,
          options: {
            ...(correctionForm.late_minutes ? { late_minutes: Number(correctionForm.late_minutes) } : {}),
            ...(correctionForm.check_in_time ? { check_in_time: correctionForm.check_in_time } : {}),
            ...(correctionForm.check_out_time ? { check_out_time: correctionForm.check_out_time } : {}),
          },
        });
      }

      return attendanceApi.manualCorrection({
        employee_id: Number(correctionForm.employee_id),
        work_date: correctionForm.work_date,
        correction_type: "field",
        new_values_json: pendingManualCorrectionValues,
        reason: correctionForm.reason,
      });
    },
    onSuccess: async () => {
      toast({ title: "Attendance corrected", description: "The correction was audited and the attendance day was recalculated." });
      setCorrectionOpen(false);
      setEditingAttendance(null);
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
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
    mutationFn: () => {
      if (correctionLocked) {
        throw new Error("Locked attendance days cannot be deleted.");
      }
      return attendanceApi.deleteDay(Number(correctionForm.employee_id), correctionForm.work_date);
    },
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
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to recalculate attendance",
        description: getErrorMessage(error, "The backend rejected the recalculation request."),
        variant: "destructive",
      });
    },
  });

  const reviewAttendance = useMutation({
    mutationFn: ({ row, review_status, note }: { row: AttendanceDay; review_status: AttendanceReviewPayload["review_status"]; note?: string }) =>
      attendanceApi.reviewDay(row.employee_id, row.work_date, { review_status, note }),
    onSuccess: async (_, variables) => {
      toast({ title: "Attendance review updated", description: `Review status set to ${formatLabel(variables.review_status)}.` });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to update review status",
        description: getErrorMessage(error, "The backend rejected the attendance review request."),
        variant: "destructive",
      });
    },
  });

  const approveSelectedAttendance = useMutation({
    mutationFn: async () => {
      const rows = selectedRows.filter((row) => !isAttendanceLocked(row));
      await Promise.all(
        rows.map((row) =>
          attendanceApi.reviewDay(row.employee_id, row.work_date, {
            review_status: "approved",
            note: "Approved from attendance review queue.",
          }),
        ),
      );
      return rows.length;
    },
    onSuccess: async (count) => {
      toast({ title: "Selected attendance approved", description: `${count} day(s) were approved.` });
      setSelectedRowKeys([]);
      await refreshManageAttendance();
    },
    onError: (error) => {
      toast({
        title: "Unable to approve selected days",
        description: getErrorMessage(error, "The backend rejected one or more review requests."),
        variant: "destructive",
      });
    },
  });

  const toggleRowSelection = (row: AttendanceDay, checked: boolean) => {
    const key = rowKey(row);
    setSelectedRowKeys((current) => (checked ? [...new Set([...current, key])] : current.filter((item) => item !== key)));
  };

  const toggleAllSelection = (checked: boolean) => {
    setSelectedRowKeys(checked ? filteredDailyRows.map(rowKey) : []);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? "Attendance Review" : "My Attendance"}
        description={
          scope === "manage"
            ? "Review attendance days, correct audited records, approve timesheets, and keep payroll-impacting changes visible."
            : "Review your attendance history and worked time."
        }
        actions={
          scope === "manage" ? (
            <>
              <Input className="w-40" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)} disabled={!canCorrect}>
                <CalendarCheck2 className="mr-2 h-4 w-4" />
                Generate scheduled attendance
              </Button>
            </>
          ) : null
        }
      />

      {scope === "manage" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Present" value={manageStats.present} icon={CheckCircle2} tone="success" />
            <MetricCard label="Late" value={manageStats.late} icon={RotateCcw} tone="warning" />
            <MetricCard label="Incomplete" value={manageStats.incomplete} icon={AlertTriangle} tone="info" />
            <MetricCard label="Absent" value={manageStats.absent} icon={AlertTriangle} tone="danger" />
            <MetricCard label="Needs review" value={manageStats.needsReview} icon={ShieldCheck} tone="warning" />
            <MetricCard label="Locked" value={manageStats.locked} icon={ShieldCheck} tone="info" />
          </div>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>Attendance review queue</CardTitle>
              <CardDescription>Filter payroll-impacting issues before approving attendance days.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input placeholder="Search employee" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All attendance statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All attendance statuses</SelectItem>
                  {attendanceStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reviewFilter || "all"} onValueChange={(value) => setReviewFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All review statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All review statuses</SelectItem>
                  {attendanceReviewStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={issueFilter || "all"} onValueChange={(value) => setIssueFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All review issues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All review issues</SelectItem>
                  {issueFilters.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Daily attendance</CardTitle>
                  <CardDescription>Daily AttendanceDay records for the selected date.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  disabled={!canReview || selectedRows.length === 0 || approveSelectedAttendance.isPending}
                  onClick={() => approveSelectedAttendance.mutate()}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Approve selected ({selectedRows.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDailyRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedRows.length > 0 && selectedRows.length === filteredDailyRows.length}
                          onCheckedChange={(checked) => toggleAllSelection(Boolean(checked))}
                          aria-label="Select all attendance rows"
                        />
                      </TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check in</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Check out</TableHead>
                      <TableHead>Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyRows.map((row) => {
                      const employee = employeeMap[row.employee_id];
                      const locked = isAttendanceLocked(row);
                      const selected = selectedRowKeys.includes(rowKey(row));
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Checkbox
                              checked={selected}
                              disabled={locked}
                              onCheckedChange={(checked) => toggleRowSelection(row, Boolean(checked))}
                              aria-label={`Select attendance row ${row.id}`}
                            />
                          </TableCell>
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
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <StatusBadge status={row.status} />
                              {row.is_manually_corrected ? <Badge variant="outline">Corrected</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={getAttendanceReviewStatus(row)} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canCorrect || locked}
                                onClick={() => openAttendanceEditor(row, row.employee_id, row.work_date)}
                              >
                                Correct
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canRecalculate || locked}
                                onClick={() => recalculateAttendance.mutate({ employeeId: row.employee_id, workDate: row.work_date })}
                              >
                                Recalculate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canReview || locked || getAttendanceReviewStatus(row) === "approved"}
                                onClick={() => reviewAttendance.mutate({ row, review_status: "approved", note: "Approved from daily attendance review." })}
                              >
                                Approve
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
                  description="Try another date or adjust the review filters."
                />
              )}
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>Monthly timesheet view</CardTitle>
              <CardDescription>Select an employee and month to review daily status, paid time, overtime, and review state.</CardDescription>
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
                  <div key={`blank-${index}`} className="min-h-28 rounded border border-dashed border-transparent" />
                ))}
                {calendarDays.map((day) => {
                  const isoDate = toIsoDate(day);
                  const row = historyRowsByDate[isoDate];
                  const locked = isAttendanceLocked(row);
                  return (
                    <button
                      key={isoDate}
                      type="button"
                      disabled={!selectedHistoryEmployeeId || locked}
                      className="min-h-28 rounded border bg-background p-2 text-left transition-colors hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => openAttendanceEditor(row || null, Number(selectedHistoryEmployeeId), isoDate)}
                    >
                      <span className="text-sm font-semibold">{format(day, "d")}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row ? <StatusBadge status={row.status} className="text-[10px]" /> : <span className="text-xs text-muted-foreground">No record</span>}
                        {row ? <StatusBadge status={getAttendanceReviewStatus(row)} className="text-[10px]" /> : null}
                      </div>
                      {row ? (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>{formatTime(row.check_in_time)} - {formatTime(row.check_out_time)}</p>
                          <p>Paid {formatMinutes(row.normal_paid_minutes)} / unpaid {formatMinutes(row.unpaid_minutes)}</p>
                          <p>OT {formatMinutes(row.overtime_minutes)}{row.is_manually_corrected ? " / corrected" : ""}</p>
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

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate scheduled attendance</DialogTitle>
            <DialogDescription>
              Preview the employees affected before calling the existing mark-all-present endpoint for {formatDate(dateFilter)}.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Bulk payroll-impacting action</AlertTitle>
            <AlertDescription>
              This endpoint creates or updates attendance for the selected date. The confirmation reason is required in the UI, but the current backend endpoint does not persist it.
            </AlertDescription>
          </Alert>
          <div className="max-h-48 overflow-y-auto rounded border border-border p-3 text-sm">
            {affectedEmployees.length ? (
              affectedEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                  <span>{employee.full_name}</span>
                  <StatusBadge status={employee.status} />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No employees loaded for preview.</p>
            )}
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulkReason">Reason</Label>
              <Textarea id="bulkReason" value={bulkForm.reason} onChange={(event) => setBulkForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkConfirmation">Type GENERATE to confirm</Label>
              <Input id="bulkConfirmation" value={bulkForm.confirmation} onChange={(event) => setBulkForm((value) => ({ ...value, confirmation: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => markAllPresent.mutate()} disabled={!canSubmitBulk || markAllPresent.isPending}>
              {markAllPresent.isPending ? "Generating..." : "Generate attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={correctionOpen}
        onOpenChange={(open) => {
          setCorrectionOpen(open);
          if (!open) setEditingAttendance(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance correction</DialogTitle>
            <DialogDescription>
              {selectedCorrectionEmployee?.full_name || `Employee #${correctionForm.employee_id}`} on {formatDate(correctionForm.work_date)}
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>This is an HR/Admin correction, not an employee punch.</AlertTitle>
            <AlertDescription>Corrections are audited and can affect attendance review, discrepancies, and payroll recalculation.</AlertDescription>
          </Alert>
          {correctionLocked ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Locked attendance day</AlertTitle>
              <AlertDescription>Locked attendance cannot be corrected, recalculated, or deleted from the frontend.</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1"><StatusBadge status={editingAttendance?.status || "no_record"} /></div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Review</p>
              <div className="mt-1"><StatusBadge status={getAttendanceReviewStatus(editingAttendance)} /></div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Payroll impact preview</p>
              <p className="font-medium">{formatMinutes(editingAttendance?.normal_paid_minutes || 0)} paid / {formatMinutes(editingAttendance?.unpaid_minutes || 0)} unpaid</p>
            </div>
          </div>
          <Tabs value={correctionMode} onValueChange={(value) => setCorrectionMode(value as CorrectionMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual time correction</TabsTrigger>
              <TabsTrigger value="smart">Smart status correction</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {correctionFields.map((field) => (
                  <div key={field.value} className="space-y-2">
                    <Label htmlFor={`manual-${field.value}`}>{field.label}</Label>
                    <Input
                      id={`manual-${field.value}`}
                      type="time"
                      value={correctionForm[field.value]}
                      onChange={(event) => setCorrectionForm((value) => ({ ...value, [field.value]: event.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Update any combination of times here. Leave a field blank to clear it, and the backend will block impossible timelines like check-in after check-out.
              </p>
            </TabsContent>
            <TabsContent value="smart" className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="targetStatus">Target status</Label>
                <Select value={correctionForm.target_status} onValueChange={(value) => setCorrectionForm((current) => ({ ...current, target_status: value }))}>
                  <SelectTrigger id="targetStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {smartAttendanceStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lateMinutes">Late minutes</Label>
                  <Input id="lateMinutes" type="number" min="0" value={correctionForm.late_minutes} onChange={(event) => setCorrectionForm((value) => ({ ...value, late_minutes: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smartCheckIn">Custom check-in</Label>
                  <Input id="smartCheckIn" type="time" value={correctionForm.check_in_time} onChange={(event) => setCorrectionForm((value) => ({ ...value, check_in_time: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smartCheckOut">Custom check-out</Label>
                  <Input id="smartCheckOut" type="time" value={correctionForm.check_out_time} onChange={(event) => setCorrectionForm((value) => ({ ...value, check_out_time: event.target.value }))} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-2">
            <Label htmlFor="correctionReason">Reason</Label>
            <Textarea id="correctionReason" value={correctionForm.reason} onChange={(event) => setCorrectionForm((value) => ({ ...value, reason: event.target.value }))} />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingAttendance ? (
              <Button variant="destructive" onClick={() => deleteAttendance.mutate()} disabled={!canCorrect || correctionLocked || deleteAttendance.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
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
                  !canCorrect ||
                  correctionLocked ||
                  submitCorrection.isPending ||
                  !correctionForm.reason.trim() ||
                  (correctionMode === "manual" && Object.keys(pendingManualCorrectionValues).length === 0) ||
                  (correctionMode === "smart" && !correctionForm.target_status)
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
