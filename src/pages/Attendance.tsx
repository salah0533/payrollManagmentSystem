import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { AlertTriangle, CalendarCheck2, CheckCircle2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  calendarBulkCorrectionStatuses,
  getAttendanceReviewStatus,
  getSmartCorrectionStatuses,
  isAttendanceLocked,
} from "@/lib/workflow";
import { cn } from "@/lib/utils";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import type { AttendanceDay, AttendanceReviewPayload } from "@/types/domain";

type AttendanceField = "check_in_time" | "break_start_time" | "break_end_time" | "check_out_time";
type CorrectionMode = "manual" | "smart";
type CalendarBulkStatus = (typeof calendarBulkCorrectionStatuses)[number];

const correctionFields: AttendanceField[] = ["check_in_time", "break_start_time", "break_end_time", "check_out_time"];

const issueFilters = ["missing_check_in", "missing_check_out", "late", "absent", "corrected", "needs_review", "approved"] as const;

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
    const originalValue = valueForField(row, field);
    const nextValue = (form[field] || "").trim();

    if (nextValue === originalValue) {
      continue;
    }
    updates[field] = nextValue || null;
  }

  return updates;
}

function isMissingCheckIn(row: AttendanceDay) {
  return !row.check_in_time && !["absent", "unpaid", "paid_vacation", "unpaid_vacation", "sick_leave", "weekly_off", "holiday"].includes(row.status);
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
  const { t } = useTranslation();
  const canCorrect = hasPermission(currentUser, "attendance.correct");
  const canReview = hasPermission(currentUser, "attendance.approve");
  const canRecalculate = hasPermission(currentUser, "attendance.recalculate");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(toIsoDate(new Date()));
  const [availableEmployeesPage, setAvailableEmployeesPage] = useState(1);
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
  const [calendarBulkMode, setCalendarBulkMode] = useState(false);
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<string[]>([]);
  const [calendarBulkStatus, setCalendarBulkStatus] = useState<CalendarBulkStatus>("present");
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
      const employeeName = employee?.full_name || t("labels.employeeId", { id: row.employee_id });
      const matchesSearch = employeeName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesReview = !reviewFilter || getAttendanceReviewStatus(row) === reviewFilter;
      return matchesSearch && matchesStatus && matchesReview && matchesIssueFilter(row, issueFilter);
    });
  }, [dailyAttendanceQuery.data, employeeMap, issueFilter, reviewFilter, search, statusFilter, t]);

  const dailyRowsByEmployee = useMemo(
    () => Object.fromEntries((dailyAttendanceQuery.data || []).map((row) => [row.employee_id, row])),
    [dailyAttendanceQuery.data],
  );

  const employeesWithoutAttendance = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (employeesQuery.data || [])
      .filter((employee) => employee.is_active && !["inactive", "suspended"].includes(employee.status))
      .filter((employee) => {
        if (!normalizedSearch) return true;
        const haystack = [employee.full_name, employee.position, employee.email].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .filter((employee) => !dailyRowsByEmployee[employee.id])
      .sort((left, right) => left.full_name.localeCompare(right.full_name));
  }, [dailyRowsByEmployee, employeesQuery.data, search]);

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

  const availableEmployeesPageSize = 10;
  const totalAvailableEmployeePages = Math.max(1, Math.ceil(employeesWithoutAttendance.length / availableEmployeesPageSize));
  const paginatedEmployeesWithoutAttendance = useMemo(() => {
    const startIndex = (availableEmployeesPage - 1) * availableEmployeesPageSize;
    return employeesWithoutAttendance.slice(startIndex, startIndex + availableEmployeesPageSize);
  }, [availableEmployeesPage, employeesWithoutAttendance]);

  useEffect(() => {
    setAvailableEmployeesPage(1);
  }, [dateFilter, search]);

  useEffect(() => {
    if (availableEmployeesPage > totalAvailableEmployeePages) {
      setAvailableEmployeesPage(totalAvailableEmployeePages);
    }
  }, [availableEmployeesPage, totalAvailableEmployeePages]);

  useEffect(() => {
    setCalendarBulkMode(false);
    setSelectedCalendarDates([]);
    setCalendarBulkStatus("present");
  }, [selectedHistoryEmployeeId, historyMonth]);

  const refreshManageAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance", "manage"] });
  };

  const refreshSelfAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance", "self"] });
  };

  const selectedCorrectionEmployee = employeeMap[Number(correctionForm.employee_id)];
  const correctionLocked = isAttendanceLocked(editingAttendance);
  const smartCorrectionStatuses = getSmartCorrectionStatuses(editingAttendance);
  const weeklyOffAbsentBlocked = editingAttendance?.status === "weekly_off";
  const affectedEmployees = employeesQuery.data || [];
  const canSubmitBulk = bulkForm.reason.trim().length >= 5 && bulkForm.confirmation.trim().toUpperCase() === "GENERATE";
  const dayLabels = [
    t("settings.days.monday"),
    t("settings.days.tuesday"),
    t("settings.days.wednesday"),
    t("settings.days.thursday"),
    t("settings.days.friday"),
    t("settings.days.saturday"),
    t("settings.days.sunday"),
  ];
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

  const selectedCalendarDateSet = useMemo(() => new Set(selectedCalendarDates), [selectedCalendarDates]);
  const calendarBulkActionLabel = calendarBulkStatus === "delete" ? t("attendancePage.multiSelectDeleteLabel") : formatLabel(calendarBulkStatus);

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

  const resetCalendarBulkSelection = () => {
    setCalendarBulkMode(false);
    setSelectedCalendarDates([]);
    setCalendarBulkStatus("present");
  };

  const markAllPresent = useMutation({
    mutationFn: () => attendanceApi.markAllPresent(dateFilter),
    onSuccess: async (result) => {
      toast({
        title: t("attendancePage.generatedSuccess"),
        description: t("attendancePage.generatedSuccessDescription", {
          created: result.created || 0,
          updated: result.updated || 0,
        }),
      });
      setBulkDialogOpen(false);
      setBulkForm({ reason: "", confirmation: "" });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.generateError"),
        description: getErrorMessage(error, t("attendancePage.generateErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const submitCorrection = useMutation({
    mutationFn: () => {
      if (correctionLocked) {
        throw new Error(t("attendancePage.lockedCorrectionError"));
      }

      if (correctionMode === "smart") {
        return attendanceApi.smartCorrection(Number(correctionForm.employee_id), correctionForm.work_date, {
          target_status: correctionForm.target_status,
          reason: correctionForm.reason.trim(),
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
        reason: correctionForm.reason.trim(),
      });
    },
    onSuccess: async () => {
      toast({ title: t("attendancePage.correctedSuccess"), description: t("attendancePage.correctedSuccessDescription") });
      setCorrectionOpen(false);
      setEditingAttendance(null);
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.correctionError"),
        description: getErrorMessage(error, t("attendancePage.correctionErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: () => {
      if (correctionLocked) {
        throw new Error(t("attendancePage.lockedDeleteError"));
      }
      return attendanceApi.deleteDay(Number(correctionForm.employee_id), correctionForm.work_date);
    },
    onSuccess: async () => {
      toast({ title: t("attendancePage.deletedSuccess"), description: t("attendancePage.deletedSuccessDescription") });
      setCorrectionOpen(false);
      setEditingAttendance(null);
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.deleteError"),
        description: getErrorMessage(error, t("attendancePage.deleteErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const recalculateAttendance = useMutation({
    mutationFn: ({ employeeId, workDate }: { employeeId: number; workDate: string }) =>
      attendanceApi.recalculate(employeeId, workDate, workDate),
    onSuccess: async (result) => {
      toast({
        title: t("attendancePage.recalculatedSuccess"),
        description: t("attendancePage.recalculatedSuccessDescription", {
          count: result.recalculated_days,
          employeeId: result.employee_id,
        }),
      });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
      await refreshSelfAttendance();
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.recalculateError"),
        description: getErrorMessage(error, t("attendancePage.recalculateErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const reviewAttendance = useMutation({
    mutationFn: ({ row, review_status, note }: { row: AttendanceDay; review_status: AttendanceReviewPayload["review_status"]; note?: string }) =>
      attendanceApi.reviewDay(row.employee_id, row.work_date, { review_status, note }),
    onSuccess: async (_, variables) => {
      toast({ title: t("attendancePage.reviewUpdated"), description: t("attendancePage.reviewUpdatedDescription", { status: formatLabel(variables.review_status) }) });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.reviewUpdateError"),
        description: getErrorMessage(error, t("attendancePage.reviewUpdateErrorDescription")),
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
          }),
        ),
      );
      return rows.length;
    },
    onSuccess: async (count) => {
      toast({ title: t("attendancePage.selectedApproved"), description: t("attendancePage.selectedApprovedDescription", { count }) });
      setSelectedRowKeys([]);
      await refreshManageAttendance();
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.selectedApproveError"),
        description: getErrorMessage(error, t("attendancePage.selectedApproveErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const quickActionAttendance = useMutation({
    mutationFn: ({ employeeId, targetStatus }: { employeeId: number; targetStatus: "present" | "absent" }) =>
      attendanceApi.smartCorrection(employeeId, dateFilter, {
        target_status: targetStatus,
        reason: t("attendancePage.quickActionReason", { status: formatLabel(targetStatus), date: formatDate(dateFilter) }),
      }),
    onSuccess: async (_, variables) => {
      toast({
        title: t("attendancePage.quickActionUpdated"),
        description: t("attendancePage.quickActionUpdatedDescription", {
          status: formatLabel(variables.targetStatus),
        }),
      });
      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.quickActionError"),
        description: getErrorMessage(error, t("attendancePage.quickActionErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const saveCalendarBulkCorrection = useMutation({
    mutationFn: async () => {
      const employeeId = Number(selectedHistoryEmployeeId);
      const results = await Promise.all(
        selectedCalendarDates.map(async (workDate) => {
          try {
            if (calendarBulkStatus === "delete") {
              if (historyRowsByDate[workDate]) {
                await attendanceApi.deleteDay(employeeId, workDate);
              }
            } else {
              await attendanceApi.smartCorrection(employeeId, workDate, {
                target_status: calendarBulkStatus,
                reason: "",
              });
            }
            return { workDate, success: true as const };
          } catch (error) {
            return { workDate, success: false as const, error };
          }
        }),
      );

      const succeeded = results.filter((result) => result.success);
      const failed = results.filter((result) => !result.success);

      if (succeeded.length === 0 && failed.length > 0) {
        throw failed[0].error;
      }

      return { succeeded, failed };
    },
    onSuccess: async ({ succeeded, failed }) => {
      if (failed.length > 0) {
        setSelectedCalendarDates(failed.map((item) => item.workDate));
        toast({
          title: t("attendancePage.multiSelectPartialTitle"),
          description: t("attendancePage.multiSelectPartialDescription", {
            applied: succeeded.length,
            failed: failed.length,
            status: calendarBulkActionLabel,
          }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("attendancePage.multiSelectSavedTitle"),
          description: t("attendancePage.multiSelectSavedDescription", {
            count: succeeded.length,
            status: calendarBulkActionLabel,
          }),
        });
        resetCalendarBulkSelection();
      }

      await refreshManageAttendance();
      await queryClient.invalidateQueries({ queryKey: ["attendance", "manage", "employee-history"] });
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) => {
      toast({
        title: t("attendancePage.multiSelectErrorTitle"),
        description: getErrorMessage(error, t("attendancePage.multiSelectErrorDescription")),
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

  const toggleCalendarDateSelection = (workDate: string, locked: boolean) => {
    if (!calendarBulkMode || locked) {
      return;
    }

    setSelectedCalendarDates((current) =>
      current.includes(workDate) ? current.filter((item) => item !== workDate) : [...current, workDate],
    );
  };

  const goToPreviousAvailableEmployeesPage = () => {
    setAvailableEmployeesPage((current) => Math.max(1, current - 1));
  };

  const goToNextAvailableEmployeesPage = () => {
    setAvailableEmployeesPage((current) => Math.min(totalAvailableEmployeePages, current + 1));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? t("attendancePage.manageTitle") : t("attendancePage.selfTitle")}
        description={
          scope === "manage"
            ? t("attendancePage.manageDescription")
            : t("attendancePage.selfDescription")
        }
        actions={
          scope === "manage" ? (
            <>
              <Input className="w-40" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)} disabled={!canCorrect}>
                <CalendarCheck2 className="mr-2 h-4 w-4" />
                {t("attendancePage.generateScheduled")}
              </Button>
            </>
          ) : null
        }
      />

      {scope === "manage" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label={t("attendancePage.metrics.present")} value={manageStats.present} icon={CheckCircle2} tone="success" />
            <MetricCard label={t("attendancePage.metrics.late")} value={manageStats.late} icon={RotateCcw} tone="warning" />
            <MetricCard label={t("attendancePage.metrics.incomplete")} value={manageStats.incomplete} icon={AlertTriangle} tone="info" />
            <MetricCard label={t("attendancePage.metrics.absent")} value={manageStats.absent} icon={AlertTriangle} tone="danger" />
            <MetricCard label={t("attendancePage.metrics.needsReview")} value={manageStats.needsReview} icon={ShieldCheck} tone="warning" />
            <MetricCard label={t("attendancePage.metrics.locked")} value={manageStats.locked} icon={ShieldCheck} tone="info" />
          </div>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>{t("attendancePage.reviewQueueTitle")}</CardTitle>
              <CardDescription>{t("attendancePage.reviewQueueDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input placeholder={t("attendancePage.searchEmployee")} value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("attendancePage.allAttendanceStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("attendancePage.allAttendanceStatuses")}</SelectItem>
                  {attendanceStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reviewFilter || "all"} onValueChange={(value) => setReviewFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("attendancePage.allReviewStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("attendancePage.allReviewStatuses")}</SelectItem>
                  {attendanceReviewStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={issueFilter || "all"} onValueChange={(value) => setIssueFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("attendancePage.allReviewIssues")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("attendancePage.allReviewIssues")}</SelectItem>
                  {issueFilters.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>{t("attendancePage.availableEmployeesTitle")}</CardTitle>
              <CardDescription>{t("attendancePage.availableEmployeesDescription", { date: formatDate(dateFilter) })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t("attendancePage.noRecordYet")}</p>
                  <p className="mt-1 text-2xl font-semibold">{employeesWithoutAttendance.length}</p>
                </div>
                <div className="flex items-center gap-2 self-end">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={goToPreviousAvailableEmployeesPage}
                    disabled={availableEmployeesPage === 1}
                    aria-label={t("common.previous")}
                  >
                    <span aria-hidden="true">←</span>
                  </Button>
                  <p className="min-w-24 text-center text-sm text-muted-foreground">
                    {t("attendancePage.availableEmployeesPage", {
                      page: availableEmployeesPage,
                      total: totalAvailableEmployeePages,
                    })}
                  </p>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={goToNextAvailableEmployeesPage}
                    disabled={availableEmployeesPage === totalAvailableEmployeePages}
                    aria-label={t("common.next")}
                  >
                    <span aria-hidden="true">→</span>
                  </Button>
                </div>
              </div>

              {paginatedEmployeesWithoutAttendance.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.employee")}</TableHead>
                      <TableHead>{t("employeesPage.position")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployeesWithoutAttendance.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.full_name}</p>
                            <p className="text-xs text-muted-foreground">{employee.email || t("common.notAvailable")}</p>
                          </div>
                        </TableCell>
                        <TableCell>{employee.position || "-"}</TableCell>
                        <TableCell><StatusBadge status={employee.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canCorrect || quickActionAttendance.isPending}
                              onClick={() => quickActionAttendance.mutate({ employeeId: employee.id, targetStatus: "present" })}
                            >
                              {t("attendancePage.quickMarkPresent")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!canCorrect || quickActionAttendance.isPending}
                              onClick={() => quickActionAttendance.mutate({ employeeId: employee.id, targetStatus: "absent" })}
                            >
                              {t("attendancePage.quickMarkAbsent")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title={employeesQuery.isLoading ? t("attendancePage.loadingAvailableEmployees") : t("attendancePage.noAvailableEmployees")}
                  description={t("attendancePage.noAvailableEmployeesDescription")}
                />
              )}
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{t("attendancePage.dailyTitle")}</CardTitle>
                  <CardDescription>{t("attendancePage.dailyDescription")}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  disabled={!canReview || selectedRows.length === 0 || approveSelectedAttendance.isPending}
                  onClick={() => approveSelectedAttendance.mutate()}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t("attendancePage.approveSelected", { count: selectedRows.length })}
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
                          aria-label={t("attendancePage.selectAllRows")}
                        />
                      </TableHead>
                      <TableHead>{t("common.employee")}</TableHead>
                      <TableHead>{t("common.startDate")}</TableHead>
                      <TableHead>{formatLabel("check_in")}</TableHead>
                      <TableHead>{t("attendancePage.break")}</TableHead>
                      <TableHead>{formatLabel("check_out")}</TableHead>
                      <TableHead>{t("attendancePage.worked")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("attendancePage.review")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
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
                              aria-label={t("attendancePage.selectRowAria", { id: row.id })}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{employee?.full_name || t("labels.employeeId", { id: row.employee_id })}</p>
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
                              {row.is_manually_corrected ? <Badge variant="outline">{t("attendancePage.corrected")}</Badge> : null}
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
                                {t("attendancePage.correct")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canRecalculate || locked}
                                onClick={() => recalculateAttendance.mutate({ employeeId: row.employee_id, workDate: row.work_date })}
                              >
                                {t("attendancePage.recalculate")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canReview || locked || getAttendanceReviewStatus(row) === "approved"}
                                onClick={() => reviewAttendance.mutate({ row, review_status: "approved" })}
                              >
                                {t("attendancePage.approve")}
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
                  title={dailyAttendanceQuery.isLoading ? t("attendancePage.loadingAttendance") : t("attendancePage.noAttendanceRows")}
                  description={t("attendancePage.noAttendanceRowsDescription")}
                />
              )}
            </CardContent>
          </Card>

          <Card className="filter-card">
            <CardHeader>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle>{t("attendancePage.monthlyTitle")}</CardTitle>
                  <CardDescription>{t("attendancePage.monthlyDescription")}</CardDescription>
                </div>
                {canCorrect ? (
                  calendarBulkMode ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/80 p-3 xl:min-w-[340px]">
                      <p className="text-sm font-medium">{t("attendancePage.multiSelectTitle")}</p>
                      <p className="text-xs text-muted-foreground">{t("attendancePage.multiSelectDescription")}</p>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                        <div className="space-y-2">
                          <Label htmlFor="calendarBulkStatus">{t("attendancePage.multiSelectLabel")}</Label>
                          <Select
                            value={calendarBulkStatus}
                            onValueChange={(value) => setCalendarBulkStatus(value as CalendarBulkStatus)}
                          >
                            <SelectTrigger id="calendarBulkStatus">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {calendarBulkCorrectionStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status === "delete" ? t("attendancePage.multiSelectDeleteLabel") : formatLabel(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant={calendarBulkStatus === "delete" ? "destructive" : "default"}
                          onClick={() => saveCalendarBulkCorrection.mutate()}
                          disabled={selectedCalendarDates.length === 0 || saveCalendarBulkCorrection.isPending}
                        >
                          {saveCalendarBulkCorrection.isPending ? t("common.saving") : t("common.save")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={resetCalendarBulkSelection}
                          disabled={saveCalendarBulkCorrection.isPending}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("attendancePage.multiSelectSelectedCount", { count: selectedCalendarDates.length })}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setCalendarBulkMode(true)}
                      disabled={!selectedHistoryEmployeeId || employeeHistoryQuery.isLoading}
                    >
                      {t("attendancePage.multiSelectButton")}
                    </Button>
                  )
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="space-y-2">
                  <Label htmlFor="historyEmployee">{t("common.employee")}</Label>
                  <Select value={selectedHistoryEmployeeId} onValueChange={setHistoryEmployeeId}>
                    <SelectTrigger id="historyEmployee">
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
                <div className="space-y-2">
                  <Label htmlFor="historyMonth">{t("attendancePage.month")}</Label>
                  <Input id="historyMonth" type="month" value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                {dayLabels.map((day) => (
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
                  const selected = selectedCalendarDateSet.has(isoDate);
                  return (
                    <button
                      key={isoDate}
                      type="button"
                      disabled={!selectedHistoryEmployeeId || locked || saveCalendarBulkCorrection.isPending}
                      className={cn(
                        "min-h-28 rounded border bg-background p-2 text-left transition-colors hover:border-primary/60 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
                        calendarBulkMode && "cursor-pointer",
                        selected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                      )}
                      onClick={() =>
                        calendarBulkMode
                          ? toggleCalendarDateSelection(isoDate, locked)
                          : openAttendanceEditor(row || null, Number(selectedHistoryEmployeeId), isoDate)
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{format(day, "d")}</span>
                        {selected ? <Badge variant="outline">{t("attendancePage.multiSelectPicked")}</Badge> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row ? <StatusBadge status={row.status} className="text-[10px]" /> : <span className="text-xs text-muted-foreground">{t("common.noRecord")}</span>}
                        {row ? <StatusBadge status={getAttendanceReviewStatus(row)} className="text-[10px]" /> : null}
                      </div>
                      {row ? (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>{formatTime(row.check_in_time)} - {formatTime(row.check_out_time)}</p>
                          <p>{t("attendancePage.paidUnpaid", { paid: formatMinutes(row.normal_paid_minutes), unpaid: formatMinutes(row.unpaid_minutes) })}</p>
                          <p>{t("attendancePage.overtimeLine", { overtime: formatMinutes(row.overtime_minutes) })}{row.is_manually_corrected ? ` / ${t("attendancePage.corrected").toLowerCase()}` : ""}</p>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {!selectedHistoryEmployeeId || employeeHistoryQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  {employeeHistoryQuery.isLoading ? t("attendancePage.loadingMonthly") : t("attendancePage.selectEmployeeToLoad")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label={t("attendancePage.metrics.trackedDays")} value={selfRows.length} icon={CheckCircle2} tone="success" />
            <MetricCard label={t("attendancePage.metrics.workedTime")} value={formatMinutes(selfStats.worked)} icon={RotateCcw} tone="info" />
            <MetricCard label={t("attendancePage.metrics.lateIncomplete")} value={`${selfStats.lateDays} / ${selfStats.missedCheckout}`} icon={RotateCcw} tone="warning" />
          </div>

          <Card className="filter-card">
            <CardHeader>
              <CardTitle>{t("attendancePage.dateRangeTitle")}</CardTitle>
              <CardDescription>{t("attendancePage.dateRangeDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input type="date" value={range.start_date} onChange={(event) => setRange((value) => ({ ...value, start_date: event.target.value }))} />
              <Input type="date" value={range.end_date} onChange={(event) => setRange((value) => ({ ...value, end_date: event.target.value }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("attendancePage.historyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {selfRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.startDate")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{formatLabel("check_in")}</TableHead>
                      <TableHead>{formatLabel("check_out")}</TableHead>
                      <TableHead>{t("attendancePage.worked")}</TableHead>
                      <TableHead>{formatLabel("late")}</TableHead>
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
                  title={selfAttendanceQuery.isLoading ? t("attendancePage.loadingSelfAttendance") : t("attendancePage.noSelfAttendance")}
                  description={t("attendancePage.noSelfAttendanceDescription")}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("attendancePage.generateScheduled")}</DialogTitle>
            <DialogDescription>
              {t("attendancePage.bulkDescription", { date: formatDate(dateFilter) })}
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("attendancePage.bulkAlertTitle")}</AlertTitle>
            <AlertDescription>
              {t("attendancePage.bulkAlertDescription")}
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
              <p className="text-muted-foreground">{t("attendancePage.noEmployeesPreview")}</p>
            )}
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulkReason">{t("attendancePage.reason")}</Label>
              <Textarea id="bulkReason" value={bulkForm.reason} onChange={(event) => setBulkForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkConfirmation">{t("attendancePage.typeGenerateToConfirm")}</Label>
              <Input id="bulkConfirmation" value={bulkForm.confirmation} onChange={(event) => setBulkForm((value) => ({ ...value, confirmation: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => markAllPresent.mutate()} disabled={!canSubmitBulk || markAllPresent.isPending}>
              {markAllPresent.isPending ? t("attendancePage.generating") : t("attendancePage.generateAttendance")}
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
            <DialogTitle>{t("attendancePage.correctionTitle")}</DialogTitle>
            <DialogDescription>
              {selectedCorrectionEmployee?.full_name || t("labels.employeeId", { id: correctionForm.employee_id })} {t("attendancePage.onDate", { date: formatDate(correctionForm.work_date) })}
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>{t("attendancePage.correctionAlertTitle")}</AlertTitle>
            <AlertDescription>{t("attendancePage.correctionAlertDescription")}</AlertDescription>
          </Alert>
          {correctionLocked ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("attendancePage.lockedTitle")}</AlertTitle>
              <AlertDescription>{t("attendancePage.lockedDescription")}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("common.status")}</p>
              <div className="mt-1"><StatusBadge status={editingAttendance?.status || "no_record"} /></div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("attendancePage.review")}</p>
              <div className="mt-1"><StatusBadge status={getAttendanceReviewStatus(editingAttendance)} /></div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("attendancePage.payrollImpactPreview")}</p>
              <p className="font-medium">{t("attendancePage.paidUnpaid", { paid: formatMinutes(editingAttendance?.normal_paid_minutes || 0), unpaid: formatMinutes(editingAttendance?.unpaid_minutes || 0) })}</p>
            </div>
          </div>
          <Tabs value={correctionMode} onValueChange={(value) => setCorrectionMode(value as CorrectionMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">{t("attendancePage.manualTab")}</TabsTrigger>
              <TabsTrigger value="smart">{t("attendancePage.smartTab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {correctionFields.map((field) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={`manual-${field}`}>{formatLabel(field.replace("_time", ""))}</Label>
                    <Input
                      id={`manual-${field}`}
                      type="time"
                      value={correctionForm[field]}
                      onChange={(event) => setCorrectionForm((value) => ({ ...value, [field]: event.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("attendancePage.manualHelp")}
              </p>
            </TabsContent>
            <TabsContent value="smart" className="grid gap-4 py-2">
              {weeklyOffAbsentBlocked ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("attendancePage.weeklyOffRuleTitle")}</AlertTitle>
                  <AlertDescription>{t("attendancePage.weeklyOffRuleDescription")}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="targetStatus">{t("attendancePage.targetStatus")}</Label>
                <Select value={correctionForm.target_status} onValueChange={(value) => setCorrectionForm((current) => ({ ...current, target_status: value }))}>
                  <SelectTrigger id="targetStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {smartCorrectionStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lateMinutes">{t("attendancePage.lateMinutes")}</Label>
                  <Input id="lateMinutes" type="number" min="0" value={correctionForm.late_minutes} onChange={(event) => setCorrectionForm((value) => ({ ...value, late_minutes: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smartCheckIn">{t("attendancePage.customCheckIn")}</Label>
                  <Input id="smartCheckIn" type="time" value={correctionForm.check_in_time} onChange={(event) => setCorrectionForm((value) => ({ ...value, check_in_time: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smartCheckOut">{t("attendancePage.customCheckOut")}</Label>
                  <Input id="smartCheckOut" type="time" value={correctionForm.check_out_time} onChange={(event) => setCorrectionForm((value) => ({ ...value, check_out_time: event.target.value }))} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-2">
            <Label htmlFor="correctionReason">{t("attendancePage.reason")}</Label>
            <Textarea
              id="correctionReason"
              value={correctionForm.reason}
              onChange={(event) => setCorrectionForm((value) => ({ ...value, reason: event.target.value }))}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingAttendance ? (
              <Button variant="destructive" onClick={() => deleteAttendance.mutate()} disabled={!canCorrect || correctionLocked || deleteAttendance.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteAttendance.isPending ? t("attendancePage.deleting") : t("common.delete")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => submitCorrection.mutate()}
                disabled={
                  !canCorrect ||
                  correctionLocked ||
                  submitCorrection.isPending ||
                  (correctionMode === "manual" && Object.keys(pendingManualCorrectionValues).length === 0) ||
                  (correctionMode === "smart" && !correctionForm.target_status)
                }
              >
                {submitCorrection.isPending ? t("common.saving") : t("attendancePage.submitCorrection")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
