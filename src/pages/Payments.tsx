import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, DollarSign, Lock, MoreHorizontal, Pencil, ReceiptText, Scale, Trash2, WalletCards } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { payrollAdjustmentTypes } from "@/components/layout/navigation";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime, formatLabel } from "@/lib/format";
import i18n from "@/lib/i18n";
import { hasPermission } from "@/lib/roles";
import {
  canAdjustPayroll,
  canApprovePayroll,
  canRecalculatePayroll,
  canRecordPayrollPayment,
  hasOpenDiscrepancyForPayroll,
} from "@/lib/workflow";
import { attendanceApi } from "@/services/attendanceApi";
import { payrollApi } from "@/services/payrollApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import type { EmployeePayroll, PayrollAdjustment, PayrollDiscrepancy, PayrollHistory } from "@/types/domain";

type PayrollAdjustmentType = (typeof payrollAdjustmentTypes)[number];

const calculationFields = [
  { key: "actual_work_minutes", labelKey: "payrollPage.calculationFields.actual_work_minutes", format: "minutes" },
  { key: "normal_paid_minutes", labelKey: "payrollPage.calculationFields.normal_paid_minutes", format: "minutes" },
  { key: "earned_paid_minutes", labelKey: "payrollPage.calculationFields.earned_paid_minutes", format: "minutes" },
  { key: "paid_minutes", labelKey: "payrollPage.calculationFields.paid_minutes", format: "minutes" },
  { key: "period_expected_minutes", labelKey: "payrollPage.calculationFields.period_expected_minutes", format: "minutes" },
  { key: "overtime_minutes", labelKey: "payrollPage.calculationFields.overtime_minutes", format: "minutes" },
  { key: "payable_overtime_minutes", labelKey: "payrollPage.calculationFields.payable_overtime_minutes", format: "minutes" },
  { key: "late_minutes", labelKey: "payrollPage.calculationFields.late_minutes", format: "minutes" },
  { key: "early_leave_minutes", labelKey: "payrollPage.calculationFields.early_leave_minutes", format: "minutes" },
  { key: "late_makeup_minutes", labelKey: "payrollPage.calculationFields.late_makeup_minutes", format: "minutes" },
  { key: "absence_minutes", labelKey: "payrollPage.calculationFields.absence_minutes", format: "minutes" },
  { key: "unpaid_minutes", labelKey: "payrollPage.calculationFields.unpaid_minutes", format: "minutes" },
  { key: "missing_workday_minutes", labelKey: "payrollPage.calculationFields.missing_workday_minutes", format: "minutes" },
  { key: "partial_unpaid_minutes", labelKey: "payrollPage.calculationFields.partial_unpaid_minutes", format: "minutes" },
  { key: "absence_days", labelKey: "payrollPage.calculationFields.absence_days", format: "number" },
  { key: "paid_vacation_days", labelKey: "payrollPage.calculationFields.paid_vacation_days", format: "number" },
  { key: "unpaid_vacation_days", labelKey: "payrollPage.calculationFields.unpaid_vacation_days", format: "number" },
  { key: "missing_attendance_days", labelKey: "payrollPage.calculationFields.missing_attendance_days", format: "number" },
  { key: "auto_minute_rate", labelKey: "payrollPage.calculationFields.auto_minute_rate", format: "currency" },
  { key: "attendance_deduction", labelKey: "payrollPage.calculationFields.attendance_deduction", format: "currency" },
  { key: "earned_attendance_deduction", labelKey: "payrollPage.calculationFields.earned_attendance_deduction", format: "currency" },
  { key: "manual_deduction_amount", labelKey: "payrollPage.calculationFields.manual_deduction_amount", format: "currency" },
  { key: "earned_deduction_amount", labelKey: "payrollPage.calculationFields.earned_deduction_amount", format: "currency" },
  { key: "late_penalty_amount", labelKey: "payrollPage.calculationFields.late_penalty_amount", format: "currency" },
  { key: "earned_net_salary", labelKey: "payrollPage.calculationFields.earned_net_salary", format: "currency" },
  { key: "held_for_review_amount", labelKey: "payrollPage.calculationFields.held_for_review_amount", format: "currency" },
  { key: "payable_amount", labelKey: "payrollPage.calculationFields.payable_amount", format: "currency" },
] as const;

function getAdjustmentLabel(type: PayrollAdjustmentType | string) {
  return formatLabel(type);
}

function getSnapshotValue(payroll: EmployeePayroll, key: string, fallback: number | string = 0) {
  const snapshot = payroll.calculation_data_json || {};
  const value = snapshot[key];
  return value == null ? fallback : (value as number | string);
}

function getEarnedNetSalary(payroll: EmployeePayroll) {
  return getSnapshotValue(payroll, "earned_net_salary", payroll.net_salary);
}

function getPayableAmount(payroll: EmployeePayroll) {
  return getSnapshotValue(payroll, "payable_amount", payroll.total_amount);
}

function getHeldForReviewAmount(payroll: EmployeePayroll) {
  const fallback = Math.max(0, Number(payroll.net_salary || 0) - Number(payroll.total_amount || 0));
  return getSnapshotValue(payroll, "held_for_review_amount", fallback);
}

function PayrollBreakdownGrid({ payroll }: { payroll: EmployeePayroll }) {
  const { t } = useTranslation();
  const breakdownFields: Array<{ label: string; value: number | string }> = [
    { label: t("payrollPage.breakdown.base_salary"), value: payroll.base_salary },
    { label: t("payrollPage.breakdown.normal_pay"), value: payroll.normal_amount },
    { label: t("payrollPage.breakdown.overtime"), value: payroll.overtime_amount },
    { label: t("payrollPage.breakdown.bonus"), value: payroll.bonus_amount },
    { label: t("payrollPage.breakdown.attendance_deduction"), value: payroll.attendance_deduction_amount ?? payroll.deduction_amount ?? 0 },
    { label: t("payrollPage.breakdown.manual_deductions"), value: payroll.manual_deduction_amount ?? 0 },
    { label: t("payrollPage.breakdown.late_penalty"), value: payroll.late_penalty_amount ?? payroll.late_deduction_amount ?? 0 },
    { label: t("payrollPage.breakdown.adjustment_total"), value: payroll.adjustment_amount },
    { label: t("payrollPage.breakdown.gross_salary"), value: payroll.gross_salary },
    { label: t("payrollPage.breakdown.earned_net"), value: getEarnedNetSalary(payroll) },
    { label: t("payrollPage.breakdown.held_for_review"), value: getHeldForReviewAmount(payroll) },
    { label: t("payrollPage.breakdown.payable_total"), value: getPayableAmount(payroll) },
    { label: t("payrollPage.breakdown.paid"), value: payroll.paid_amount },
    { label: t("payrollPage.breakdown.balance"), value: payroll.balance_amount },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {breakdownFields.map((field) => (
        <div key={field.label} className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{field.label}</p>
          <p className="font-medium">{formatCurrency(field.value)}</p>
        </div>
      ))}
    </div>
  );
}

function formatCalculationValue(value: unknown, format: "minutes" | "number" | "currency") {
  const numericValue = Number(value || 0);
  if (format === "minutes") {
    const hours = Math.floor(numericValue / 60);
    const minutes = Math.round(numericValue % 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  if (format === "currency") {
    return formatCurrency(numericValue);
  }
  return Number.isFinite(numericValue) ? numericValue.toLocaleString() : "0";
}

function latestCalculationHistory(history: PayrollHistory[] | undefined) {
  return (history || []).find((item) => Object.keys(item.calculation_data_json || {}).length > 0);
}

function getDiscrepancyTypeLabel(type: string) {
  return formatLabel(type);
}

function getDiscrepancyWorkDate(discrepancy: Pick<PayrollDiscrepancy, "description">) {
  return discrepancy.description.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? null;
}

function getDiscrepancyQuickActions(item: PayrollDiscrepancy) {
  const workDate = getDiscrepancyWorkDate(item);
  if (item.status === "resolved" || !workDate) {
    return [];
  }

  if (item.discrepancy_type === "missing_attendance") {
    return [
      { id: "mark_present", label: i18n.t("payrollPage.quickActions.markPresent") },
      { id: "mark_absent", label: i18n.t("payrollPage.quickActions.markAbsent") },
    ];
  }

  if (item.discrepancy_type === "attendance_requires_review") {
    return [{ id: "approve_attendance", label: i18n.t("payrollPage.quickActions.approveDay") }];
  }

  return [];
}

function CalculationGrid({ history }: { history?: PayrollHistory[] }) {
  const { t } = useTranslation();
  const calculation = latestCalculationHistory(history);

  if (!calculation) {
    return <p className="text-sm text-muted-foreground">{t("payrollPage.noCalculationSnapshot")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="font-medium">{calculation.reason}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(calculation.created_at)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {calculationFields.map((field) => (
          <div key={field.key} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{t(field.labelKey)}</p>
            <p className="font-medium">{formatCalculationValue(calculation.calculation_data_json[field.key], field.format)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function Payments({ scope }: { scope: "manage" | "self" }) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const canCalculate = hasPermission(currentUser, "payroll.calculate");
  const canAdjust = hasPermission(currentUser, "payroll.adjust");
  const canApprove = hasPermission(currentUser, "payroll.approve");
  const canMarkPaid = hasPermission(currentUser, "payroll.mark_paid");
  const canCorrectAttendance = hasPermission(currentUser, "attendance.correct");
  const canApproveAttendance = hasPermission(currentUser, "attendance.approve");
  const [searchParams, setSearchParams] = useSearchParams();
  const [periodId, setPeriodId] = useState(searchParams.get("period") || "");
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const [detailsPayrollId, setDetailsPayrollId] = useState<number | null>(null);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<number | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<PayrollAdjustment | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "paid" | null; payrollId: number | null; amount: string; note: string }>({
    type: null,
    payrollId: null,
    amount: "",
    note: "",
  });
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    employee_payroll_id: "",
    employee_id: "",
    adjustment_type: "bonus" as PayrollAdjustmentType,
    amount: "0",
    reason: "",
  });
  const [resolveNotes, setResolveNotes] = useState<Record<number, string>>({});
  const [discrepancyTab, setDiscrepancyTab] = useState<"open" | "all" | "resolved">("open");
  const [activeDiscrepancyAction, setActiveDiscrepancyAction] = useState<string | null>(null);

  const parsedPeriodId = Number(periodId);
  const canLoadPayroll = Number.isFinite(parsedPeriodId) && parsedPeriodId > 0;

  const periodOptionsQuery = useQuery({
    queryKey: ["payroll", "periods", scope],
    queryFn: () => (scope === "manage" ? payrollApi.listPeriods() : payrollApi.listSelfPeriods()),
  });

  useEffect(() => {
    if (periodId || !periodOptionsQuery.data?.length) {
      return;
    }
    setPeriodId(String(periodOptionsQuery.data[0].id));
  }, [periodId, periodOptionsQuery.data]);

  useEffect(() => {
    if (!periodId) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("period");
        return next;
      }, { replace: true });
      return;
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("period", periodId);
      return next;
    }, { replace: true });
  }, [periodId, setSearchParams]);

  const periodQuery = useQuery({
    queryKey: ["payroll", "period", parsedPeriodId],
    queryFn: () => payrollApi.getPeriod(parsedPeriodId),
    enabled: scope === "manage" && canLoadPayroll,
  });

  const selfPayrollQuery = useQuery({
    queryKey: ["payroll", "self", parsedPeriodId],
    queryFn: () => payrollApi.getSelfPayroll(parsedPeriodId),
    enabled: scope === "self" && canLoadPayroll,
  });

  const discrepanciesQuery = useQuery({
    queryKey: ["payroll", "discrepancies", parsedPeriodId],
    queryFn: () => payrollApi.getDiscrepancies(parsedPeriodId),
    enabled: scope === "manage" && canLoadPayroll,
  });

  const reportQuery = useQuery({
    queryKey: ["payroll", "report", scope, parsedPeriodId],
    queryFn: () => (scope === "manage" ? payrollApi.getReport(parsedPeriodId) : payrollApi.getSelfReport(parsedPeriodId)),
    enabled: canLoadPayroll,
  });

  const historyQuery = useQuery({
    queryKey: ["payroll", "history", selectedPayrollId],
    queryFn: () => payrollApi.getHistory(selectedPayrollId as number),
    enabled: scope === "manage" && Boolean(selectedPayrollId),
  });

  const adjustmentsQuery = useQuery({
    queryKey: ["payroll", "adjustments", selectedPayrollId],
    queryFn: () => payrollApi.listAdjustments(selectedPayrollId as number),
    enabled: scope === "manage" && Boolean(selectedPayrollId),
  });

  const refreshPayroll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["payroll"] });
  };

  const recalculatePeriod = useMutation({
    mutationFn: () => payrollApi.recalculatePeriod(parsedPeriodId),
    onSuccess: async () => {
      toast({ title: t("payrollPage.recalculatedSuccess"), description: t("payrollPage.recalculatedSuccessDescription") });
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: t("payrollPage.recalculateError"),
        description: getErrorMessage(error, t("payrollPage.recalculateErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const recalculateEmployee = useMutation({
    mutationFn: ({ employeeId }: { employeeId: number }) => payrollApi.recalculateEmployee(employeeId, parsedPeriodId),
    onSuccess: async () => {
      toast({ title: t("payrollPage.rowRecalculatedSuccess"), description: t("payrollPage.rowRecalculatedSuccessDescription") });
      await refreshPayroll();
    },
  });

  const approvePayroll = useMutation({
    mutationFn: (employeePayrollId: number) => payrollApi.approve(employeePayrollId),
    onSuccess: async () => {
      toast({ title: t("payrollPage.approvedSuccess"), description: t("payrollPage.approvedSuccessDescription") });
      setConfirmAction({ type: null, payrollId: null, amount: "", note: "" });
      await refreshPayroll();
    },
  });

  const markPayrollPaid = useMutation({
    mutationFn: ({ employeePayrollId, amount, note }: { employeePayrollId: number; amount?: number; note?: string }) =>
      payrollApi.markPaid(employeePayrollId, { amount, note }),
    onSuccess: async () => {
      toast({ title: t("payrollPage.paymentRecorded"), description: t("payrollPage.paymentRecordedDescription") });
      setConfirmAction({ type: null, payrollId: null, amount: "", note: "" });
      await refreshPayroll();
    },
  });

  const resetAdjustmentForm = () => {
    setEditingAdjustmentId(null);
    setAdjustmentForm({
      employee_payroll_id: "",
      employee_id: "",
      adjustment_type: "bonus",
      amount: "",
      reason: "",
    });
  };

  const addAdjustment = useMutation({
    mutationFn: () =>
      payrollApi.addAdjustment({
        employee_payroll_id: Number(adjustmentForm.employee_payroll_id),
        payroll_period_id: parsedPeriodId,
        employee_id: Number(adjustmentForm.employee_id),
        adjustment_type: adjustmentForm.adjustment_type,
        amount: Number(adjustmentForm.amount),
        reason: adjustmentForm.reason.trim(),
      }),
    onSuccess: async () => {
      toast({ title: t("payrollPage.adjustmentAdded"), description: t("payrollPage.adjustmentAddedDescription") });
      setAdjustmentOpen(false);
      resetAdjustmentForm();
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: t("payrollPage.adjustmentAddError"),
        description: getErrorMessage(error, t("payrollPage.adjustmentAddErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const updateAdjustment = useMutation({
    mutationFn: () =>
      payrollApi.updateAdjustment(editingAdjustmentId as number, {
        adjustment_type: adjustmentForm.adjustment_type,
        amount: Number(adjustmentForm.amount),
        reason: adjustmentForm.reason.trim(),
      }),
    onSuccess: async () => {
      toast({ title: t("payrollPage.adjustmentUpdated"), description: t("payrollPage.adjustmentUpdatedDescription") });
      setAdjustmentOpen(false);
      resetAdjustmentForm();
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: t("payrollPage.adjustmentUpdateError"),
        description: getErrorMessage(error, t("payrollPage.adjustmentUpdateErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const deleteAdjustment = useMutation({
    mutationFn: (adjustmentId: number) => payrollApi.deleteAdjustment(adjustmentId),
    onSuccess: async () => {
      toast({ title: t("payrollPage.adjustmentDeleted"), description: t("payrollPage.adjustmentDeletedDescription") });
      setDeletingAdjustment(null);
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: t("payrollPage.deleteAdjustmentError"),
        description: getErrorMessage(error, t("payrollPage.deleteAdjustmentErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const resolveDiscrepancy = useMutation({
    mutationFn: ({ discrepancyId, note }: { discrepancyId: number; note: string }) => payrollApi.resolveDiscrepancy(discrepancyId, note),
    onSuccess: async () => {
      toast({ title: t("payrollPage.discrepancyResolved"), description: t("payrollPage.discrepancyResolvedDescription") });
      await refreshPayroll();
    },
  });

  const runDiscrepancyAction = useMutation({
    mutationFn: async ({ item, actionId }: { item: PayrollDiscrepancy; actionId: string }) => {
      const workDate = getDiscrepancyWorkDate(item);
      if (!workDate) {
        throw new Error(t("payrollPage.quickActionMissingWorkDate"));
      }

      if (actionId === "mark_present" || actionId === "mark_absent") {
        await attendanceApi.smartCorrection(item.employee_id, workDate, {
          target_status: actionId === "mark_present" ? "present" : "absent",
          reason: t("payrollPage.quickActionResolutionReason", { type: getDiscrepancyTypeLabel(item.discrepancy_type) }),
        });
        return;
      }

      if (actionId === "approve_attendance") {
        await attendanceApi.reviewDay(item.employee_id, workDate, {
          review_status: "approved",
          note: t("payrollPage.quickActionApproveAttendanceNote"),
        });
        return;
      }

      throw new Error(t("payrollPage.quickActionUnsupported"));
    },
    onMutate: ({ item, actionId }) => {
      setActiveDiscrepancyAction(`${item.id}:${actionId}`);
    },
    onSuccess: async (_result, variables) => {
      const labels: Record<string, string> = {
        mark_present: t("payrollPage.quickActionSuccess.mark_present"),
        mark_absent: t("payrollPage.quickActionSuccess.mark_absent"),
        approve_attendance: t("payrollPage.quickActionSuccess.approve_attendance"),
      };
      toast({
        title: labels[variables.actionId] || t("payrollPage.quickActionCompleted"),
        description: t("payrollPage.quickActionCompletedDescription"),
      });
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: t("payrollPage.quickActionFailed"),
        description: getErrorMessage(error, t("payrollPage.quickActionFailedDescription")),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setActiveDiscrepancyAction(null);
    },
  });

  const payrollRows = useMemo(() => periodQuery.data?.payrolls ?? [], [periodQuery.data?.payrolls]);
  const showLatePenaltyColumn = useMemo(
    () =>
      payrollRows.some(
        (row) =>
          Boolean(row.calculation_data_json?.late_penalty_enabled) ||
          Number(row.late_penalty_amount ?? row.late_deduction_amount ?? 0) > 0,
      ),
    [payrollRows],
  );
  const allDiscrepancies = useMemo(() => discrepanciesQuery.data ?? [], [discrepanciesQuery.data]);
  const warningOpenDiscrepancies = allDiscrepancies.filter((item) => item.status !== "resolved").length;
  const selectedPayroll = useMemo(() => payrollRows.find((row) => row.id === selectedPayrollId) || null, [payrollRows, selectedPayrollId]);
  const detailsPayroll = useMemo(() => payrollRows.find((row) => row.id === detailsPayrollId) || null, [detailsPayrollId, payrollRows]);
  const confirmPayroll = useMemo(() => payrollRows.find((row) => row.id === confirmAction.payrollId) || null, [confirmAction.payrollId, payrollRows]);
  const selfPayroll = selfPayrollQuery.data;
  const payrollReport = reportQuery.data;
  const selectedAdjustments = adjustmentsQuery.data || [];
  const employeeNameMap = useMemo(
    () => new Map((payrollReport?.employees || []).map((employee) => [employee.employee_id, employee.employee_name])),
    [payrollReport?.employees],
  );
  const getEmployeeLabel = (employeeId: number) => employeeNameMap.get(employeeId) || t("labels.employeeId", { id: employeeId });
  const getPeriodLabel = (currentPeriodId: number, periodName?: string | null) => periodName || t("payrollPage.periodNumber", { id: currentPeriodId });
  const filteredDiscrepancies = useMemo(() => {
    if (discrepancyTab === "open") {
      return allDiscrepancies.filter((item) => item.status !== "resolved");
    }
    if (discrepancyTab === "resolved") {
      return allDiscrepancies.filter((item) => item.status === "resolved");
    }
    return allDiscrepancies;
  }, [allDiscrepancies, discrepancyTab]);
  const discrepancyTypeSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of filteredDiscrepancies) {
      counts.set(item.discrepancy_type, (counts.get(item.discrepancy_type) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [filteredDiscrepancies]);
  const discrepancyGroups = useMemo(() => {
    const groups = new Map<number, {
      employeeId: number;
      employeeLabel: string;
      items: PayrollDiscrepancy[];
      openCount: number;
      resolvedCount: number;
    }>();

    for (const item of filteredDiscrepancies) {
      const current = groups.get(item.employee_id) || {
        employeeId: item.employee_id,
        employeeLabel: employeeNameMap.get(item.employee_id) || t("labels.employeeId", { id: item.employee_id }),
        items: [],
        openCount: 0,
        resolvedCount: 0,
      };
      current.items.push(item);
      if (item.status === "resolved") {
        current.resolvedCount += 1;
      } else {
        current.openCount += 1;
      }
      groups.set(item.employee_id, current);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "resolved" ? 1 : -1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }),
      }))
      .sort((a, b) => {
        if (a.openCount !== b.openCount) {
          return b.openCount - a.openCount;
        }
        return a.employeeLabel.localeCompare(b.employeeLabel);
      });
  }, [employeeNameMap, filteredDiscrepancies, t]);
  const adjustmentAmount = Number(adjustmentForm.amount);
  const canSubmitAdjustment = Boolean(
    canAdjust &&
      selectedPayroll &&
      canAdjustPayroll(selectedPayroll) &&
      adjustmentForm.employee_payroll_id &&
      adjustmentForm.employee_id &&
      payrollAdjustmentTypes.includes(adjustmentForm.adjustment_type) &&
      Number.isFinite(adjustmentAmount) &&
      adjustmentAmount > 0 &&
      adjustmentForm.reason.trim(),
  );
  const periodCanRecalculate = Boolean(
    canCalculate && periodQuery.data && !["approved", "paid", "locked", "cancelled"].includes(periodQuery.data.status),
  );

  const openAdjustmentDialog = (row: EmployeePayroll, adjustmentType: PayrollAdjustmentType) => {
    setSelectedPayrollId(row.id);
    setEditingAdjustmentId(null);
    setAdjustmentForm({
      employee_payroll_id: String(row.id),
      employee_id: String(row.employee_id),
      adjustment_type: adjustmentType,
      amount: "",
      reason: "",
    });
    setAdjustmentOpen(true);
  };

  const openEditAdjustmentDialog = (adjustment: PayrollAdjustment) => {
    const payroll = payrollRows.find((row) => row.id === adjustment.employee_payroll_id) || selectedPayroll;
    setSelectedPayrollId(adjustment.employee_payroll_id);
    setEditingAdjustmentId(adjustment.id);
    setAdjustmentForm({
      employee_payroll_id: String(adjustment.employee_payroll_id),
      employee_id: String(adjustment.employee_id),
      adjustment_type: adjustment.adjustment_type as PayrollAdjustmentType,
      amount: String(adjustment.amount),
      reason: adjustment.reason,
    });
    if (payroll) {
      setDetailsPayrollId(payroll.id);
    }
    setAdjustmentOpen(true);
  };

  const submitAdjustment = () => {
    if (!canSubmitAdjustment) {
      toast({
        title: t("payrollPage.adjustmentNeedsReview"),
        description: t("payrollPage.adjustmentNeedsReviewDescription"),
        variant: "destructive",
      });
      return;
    }

    if (editingAdjustmentId) {
      updateAdjustment.mutate();
      return;
    }

    addAdjustment.mutate();
  };

  const submitConfirmAction = () => {
    if (!confirmAction.payrollId) {
      return;
    }

    if (confirmAction.type === "approve") {
      if (!canApprovePayroll(confirmPayroll, allDiscrepancies)) {
        toast({
          title: t("payrollPage.approvalBlocked"),
          description: t("payrollPage.approvalBlockedDescription"),
          variant: "destructive",
        });
        return;
      }
      approvePayroll.mutate(confirmAction.payrollId);
      return;
    }

    if (!canRecordPayrollPayment(confirmPayroll)) {
      toast({
        title: t("payrollPage.paymentBlocked"),
        description: t("payrollPage.paymentBlockedDescription"),
        variant: "destructive",
      });
      return;
    }

    markPayrollPaid.mutate({
      employeePayrollId: confirmAction.payrollId,
      amount: Number(confirmAction.amount),
      note: confirmAction.note,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? t("payrollPage.manageTitle") : t("payrollPage.selfTitle")}
        description={
          scope === "manage"
            ? t("payrollPage.manageDescription")
            : t("payrollPage.selfDescription")
        }
        actions={
          <>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={periodOptionsQuery.isLoading ? t("paymentsPage.loadingPeriods") : t("paymentsPage.selectPeriod")} />
              </SelectTrigger>
              <SelectContent>
                {(periodOptionsQuery.data || []).map((period) => (
                  <SelectItem key={period.id} value={String(period.id)}>
                    {period.name} ({t("labels.range", { start: formatDate(period.start_date), end: formatDate(period.end_date) })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scope === "manage" ? (
              <Button variant="outline" onClick={() => recalculatePeriod.mutate()} disabled={!canLoadPayroll || !periodCanRecalculate || recalculatePeriod.isPending}>
                {recalculatePeriod.isPending ? t("payrollPage.recalculating") : t("payrollPage.recalculatePeriod")}
              </Button>
            ) : null}
          </>
        }
      />

      {!canLoadPayroll ? (
        <EmptyState
          title={t("payrollPage.periodRequired")}
          description={
            periodOptionsQuery.isLoading
              ? t("paymentsPage.loadingPeriods")
              : t("payrollPage.noPeriods")
          }
        />
      ) : scope === "self" ? (
        <>
          {selfPayroll ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard label={t("common.status")} value={<StatusBadge status={selfPayroll.status} />} icon={WalletCards} />
                <MetricCard label={t("payrollPage.earnedNet")} value={formatCurrency(getEarnedNetSalary(selfPayroll))} icon={DollarSign} tone="success" hint={t("payrollPage.earnedNetHint")} />
                <MetricCard label={t("payrollPage.held")} value={formatCurrency(getHeldForReviewAmount(selfPayroll))} icon={AlertTriangle} tone="warning" hint={t("payrollPage.heldHint")} />
                <MetricCard label={t("payrollPage.payableTotal")} value={formatCurrency(getPayableAmount(selfPayroll))} icon={WalletCards} tone="info" hint={t("payrollPage.payableTotalHint")} />
                <MetricCard label={t("labels.code.paid")} value={formatCurrency(selfPayroll.paid_amount)} icon={ReceiptText} tone="info" />
                <MetricCard
                  label={t("payrollPage.balance")}
                  value={formatCurrency(selfPayroll.balance_amount)}
                  icon={Scale}
                  tone={Number(selfPayroll.balance_amount) < 0 ? "danger" : "warning"}
                  hint={Number(selfPayroll.balance_amount) < 0 ? t("payrollPage.employeeOwesCompany") : t("payrollPage.companyOwesEmployee")}
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("payrollPage.summaryTitle")}</CardTitle>
                  <CardDescription>{t("payrollPage.summaryDescription", { periodId: parsedPeriodId })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Number(getHeldForReviewAmount(selfPayroll)) > 0 ? (
                    <Alert className="border-warning/40">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{t("payrollPage.heldAlertTitle")}</AlertTitle>
                      <AlertDescription>
                        {t("payrollPage.heldAlertDescription", {
                          earned: formatCurrency(getEarnedNetSalary(selfPayroll)),
                          payable: formatCurrency(getPayableAmount(selfPayroll)),
                        })}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <PayrollBreakdownGrid payroll={selfPayroll} />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">{t("payrollPage.approvedAt")}</p>
                    <p className="font-medium">{formatDateTime(selfPayroll.approved_at)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">{t("payrollPage.paidAt")}</p>
                    <p className="font-medium">{formatDateTime(selfPayroll.paid_at)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">{t("payrollPage.notes")}</p>
                    <p className="font-medium">{selfPayroll.notes || "-"}</p>
                  </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title={selfPayrollQuery.isLoading ? t("payrollPage.loadingPayroll") : t("payrollPage.noPayrollForPeriod")}
              description={t("payrollPage.noPayrollForPeriodDescription")}
            />
          )}
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("payrollPage.overviewTitle")}</CardTitle>
              <CardDescription>{t("payrollPage.overviewDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <OverviewStat label={t("payrollPage.payablePayroll")} value={formatCurrency(payrollReport?.total_amount)} hint={t("payrollPage.payablePayrollHint")} />
              <OverviewStat label={t("labels.code.paid")} value={formatCurrency(payrollReport?.paid_amount)} />
              <OverviewStat
                label={t("payrollPage.balance")}
                value={formatCurrency(payrollReport?.balance_amount)}
                hint={t("payrollPage.balanceHint")}
              />
              <OverviewStat label={t("payrollPage.companyOwes")} value={formatCurrency(payrollReport?.company_owes_employees)} />
              <OverviewStat label={t("payrollPage.employeesOwe")} value={formatCurrency(payrollReport?.employees_owe_company)} />
              <OverviewStat label={t("payrollPage.openWarnings")} value={warningOpenDiscrepancies} hint={t("payrollPage.openWarningsHint")} />
            </CardContent>
          </Card>

          {warningOpenDiscrepancies > 0 ? (
            <Alert className="border-warning/40">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("payrollPage.validationTitle")}</AlertTitle>
              <AlertDescription>
                {t("payrollPage.validationDescription")}
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("payrollPage.workflowTitle")}</CardTitle>
              <CardDescription>{t("payrollPage.workflowDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["1", t("payrollPage.workflow.selectPeriod"), periodId ? t("payrollPage.workflow.complete") : t("payrollPage.workflow.required")],
                ["2", t("payrollPage.workflow.validateAttendance"), warningOpenDiscrepancies ? t("payrollPage.workflow.openIssues", { count: warningOpenDiscrepancies }) : t("payrollPage.workflow.noOpenIssues")],
                ["3", t("payrollPage.workflow.reviewTotals"), payrollRows.length ? t("payrollPage.workflow.rowCount", { count: payrollRows.length }) : t("payrollPage.workflow.noRows")],
                ["4", t("payrollPage.workflow.approveRows"), t("payrollPage.workflow.approveRowsHint")],
                ["5", t("payrollPage.workflow.recordPayment"), t("payrollPage.workflow.recordPaymentHint")],
                ["6", t("payrollPage.workflow.lockExportPayslips"), t("payrollPage.workflow.backendEndpointNeeded")],
              ].map(([step, title, status]) => (
                <div key={step} className="rounded-lg border border-border p-4">
                  <Badge variant="outline">{t("payrollPage.workflow.step", { step })}</Badge>
                  <p className="mt-2 font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{status}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("payrollPage.balanceReportTitle")}</CardTitle>
              <CardDescription>{t("payrollPage.balanceReportDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollReport?.employees.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.employee")}</TableHead>
                      <TableHead>{t("payrollPage.payableTotal")}</TableHead>
                      <TableHead>{t("labels.code.paid")}</TableHead>
                      <TableHead>{t("payrollPage.balance")}</TableHead>
                      <TableHead className="text-right">{t("payrollPage.rows")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollReport.employees.map((employee) => (
                      <TableRow key={employee.employee_id}>
                        <TableCell>
                          <div className="font-medium">{employee.employee_name}</div>
                          <div className="text-xs text-muted-foreground">{t("labels.employeeId", { id: employee.employee_id })}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(employee.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(employee.paid_amount)}</TableCell>
                        <TableCell className={Number(employee.balance_amount) < 0 ? "text-destructive" : "text-warning"}>
                          {formatCurrency(employee.balance_amount)}
                        </TableCell>
                        <TableCell className="text-right">{employee.payroll_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title={reportQuery.isLoading ? t("payrollPage.loadingBalanceReport") : t("payrollPage.noPayrollBalances")}
                  description={t("payrollPage.noPayrollBalancesDescription")}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("payrollPage.rowsTitle")}</CardTitle>
              <CardDescription>{t("payrollPage.rowsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.employee")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("payrollPage.gross")}</TableHead>
                      <TableHead>{t("payrollPage.attendanceDeduction")}</TableHead>
                      <TableHead>{t("payrollPage.manualDeductions")}</TableHead>
                      {showLatePenaltyColumn ? <TableHead>{t("payrollPage.latePenalty")}</TableHead> : null}
                      <TableHead>{t("payrollPage.held")}</TableHead>
                      <TableHead>{t("payrollPage.earnedNet")}</TableHead>
                      <TableHead>{t("payrollPage.payableTotal")}</TableHead>
                      <TableHead>{t("labels.code.paid")}</TableHead>
                      <TableHead>{t("payrollPage.balance")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((row) => {
                      const rowHasOpenDiscrepancy = hasOpenDiscrepancyForPayroll(row, allDiscrepancies);
                      const rowCanRecalculate = canCalculate && canRecalculatePayroll(row);
                      const rowCanApprove = canApprove && canApprovePayroll(row, allDiscrepancies);
                      const rowCanRecordPayment = canMarkPaid && canRecordPayrollPayment(row);
                      const rowCanAdjust = canAdjust && canAdjustPayroll(row);
                      return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{getEmployeeLabel(row.employee_id)}</div>
                          <div className="text-xs text-muted-foreground">{t("payrollPage.payrollRowId", { id: row.id })}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge status={row.status} />
                            {rowHasOpenDiscrepancy ? <Badge variant="destructive">{t("payrollPage.openIssue")}</Badge> : null}
                          </div>
                          {row.needs_review_reason ? <div className="mt-1 text-xs text-muted-foreground">{row.needs_review_reason}</div> : null}
                        </TableCell>
                        <TableCell>{formatCurrency(row.gross_salary)}</TableCell>
                        <TableCell>{formatCurrency(row.attendance_deduction_amount ?? row.deduction_amount ?? 0)}</TableCell>
                        <TableCell>{formatCurrency(row.manual_deduction_amount ?? 0)}</TableCell>
                        {showLatePenaltyColumn ? <TableCell>{formatCurrency(row.late_penalty_amount ?? row.late_deduction_amount ?? 0)}</TableCell> : null}
                        <TableCell>{formatCurrency(getHeldForReviewAmount(row))}</TableCell>
                        <TableCell>{formatCurrency(getEarnedNetSalary(row))}</TableCell>
                        <TableCell>{formatCurrency(getPayableAmount(row))}</TableCell>
                        <TableCell>{formatCurrency(row.paid_amount)}</TableCell>
                        <TableCell className={Number(row.balance_amount) < 0 ? "text-destructive" : "text-warning"}>
                          {formatCurrency(row.balance_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline" aria-label={t("payrollPage.openActionsAria", { id: row.id })}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>{getEmployeeLabel(row.employee_id)}</DropdownMenuLabel>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedPayrollId(row.id);
                                  setDetailsPayrollId(row.id);
                                }}
                              >
                                {t("payrollPage.details")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!rowCanRecalculate || recalculateEmployee.isPending}
                                onSelect={() => recalculateEmployee.mutate({ employeeId: row.employee_id })}
                              >
                                {t("payrollPage.recalculate")}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!rowCanApprove} onSelect={() => setConfirmAction({ type: "approve", payrollId: row.id, amount: "", note: "" })}>
                                {t("payrollPage.approve")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!rowCanRecordPayment}
                                onSelect={() =>
                                  setConfirmAction({
                                    type: "paid",
                                    payrollId: row.id,
                                    amount: String(row.balance_amount ?? row.total_amount ?? row.net_salary ?? 0),
                                    note: "",
                                  })
                                }
                              >
                                {t("payrollPage.recordPayment")}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                {t("payrollPage.lockPeriodUnavailable")}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                {t("payrollPage.exportPdfUnavailable")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {payrollAdjustmentTypes.map((type) => (
                                <DropdownMenuItem key={type} disabled={!rowCanAdjust} onSelect={() => openAdjustmentDialog(row, type)}>
                                  {t("payrollPage.addTypeAdjustment", { type: getAdjustmentLabel(type).toLowerCase() })}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title={periodQuery.isLoading ? t("payrollPage.loadingPayroll") : t("payrollPage.noPayrollRows")}
                  description={t("payrollPage.noPayrollRowsDescription")}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("payrollPage.discrepanciesTitle")}</CardTitle>
                <CardDescription>{t("payrollPage.discrepanciesDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {allDiscrepancies.length ? (
                  <Tabs value={discrepancyTab} onValueChange={(value) => setDiscrepancyTab(value as "open" | "all" | "resolved")} className="space-y-4">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="open">{t("payrollPage.discrepancyTabs.open", { count: warningOpenDiscrepancies })}</TabsTrigger>
                      <TabsTrigger value="all">{t("payrollPage.discrepancyTabs.all", { count: allDiscrepancies.length })}</TabsTrigger>
                      <TabsTrigger value="resolved">{t("payrollPage.discrepancyTabs.resolved", { count: allDiscrepancies.filter((item) => item.status === "resolved").length })}</TabsTrigger>
                    </TabsList>

                    {(["open", "all", "resolved"] as const).map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <OverviewStat label={t("payrollPage.employeesAffected")} value={discrepancyGroups.length} />
                          <OverviewStat label={t("payrollPage.issuesShown")} value={filteredDiscrepancies.length} />
                          <OverviewStat
                            label={t("payrollPage.topType")}
                            value={discrepancyTypeSummary[0] ? getDiscrepancyTypeLabel(discrepancyTypeSummary[0][0]) : "-"}
                            hint={discrepancyTypeSummary[0] ? t("payrollPage.itemCount", { count: discrepancyTypeSummary[0][1] }) : undefined}
                          />
                        </div>

                        {discrepancyTypeSummary.length ? (
                          <div className="flex flex-wrap gap-2">
                            {discrepancyTypeSummary.map(([type, count]) => (
                              <Badge key={type} variant="outline">
                                {getDiscrepancyTypeLabel(type)} ({count})
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        {discrepancyGroups.length ? (
                          <Accordion type="multiple" className="w-full rounded-lg border border-border px-4">
                            {discrepancyGroups.map((group) => (
                              <AccordionItem key={group.employeeId} value={`employee-${group.employeeId}`}>
                                <AccordionTrigger className="py-4 text-left hover:no-underline">
                                  <div className="flex w-full items-center justify-between gap-3 pr-3">
                                    <div>
                                      <p className="font-medium">{group.employeeLabel}</p>
                                      <p className="text-sm text-muted-foreground">{t("labels.employeeId", { id: group.employeeId })}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {group.openCount ? <Badge variant="destructive">{t("payrollPage.openCount", { count: group.openCount })}</Badge> : null}
                                      {group.resolvedCount ? <Badge variant="secondary">{t("payrollPage.resolvedCount", { count: group.resolvedCount })}</Badge> : null}
                                      <Badge variant="outline">{t("payrollPage.totalCount", { count: group.items.length })}</Badge>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3 pb-4">
                                  {group.items.map((item) => {
                                    const workDate = getDiscrepancyWorkDate(item);
                                    const quickActions = getDiscrepancyQuickActions(item).filter((action) => {
                                      if (action.id === "approve_attendance") {
                                        return canApproveAttendance;
                                      }
                                      return canCorrectAttendance;
                                    });

                                    return (
                                      <div key={item.id} className="rounded-lg border border-border p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="space-y-1">
                                            <p className="font-medium">{item.description}</p>
                                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                              <span>{getDiscrepancyTypeLabel(item.discrepancy_type)}</span>
                                              <span>{formatLabel(item.severity)}</span>
                                              {workDate ? <span>{formatDate(workDate)}</span> : null}
                                              <span>{formatDateTime(item.created_at)}</span>
                                            </div>
                                          </div>
                                          <StatusBadge status={item.status} />
                                        </div>

                                        {quickActions.length ? (
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {quickActions.map((action) => {
                                              const actionKey = `${item.id}:${action.id}`;
                                              const isPending = activeDiscrepancyAction === actionKey && runDiscrepancyAction.isPending;
                                              return (
                                                <Button
                                                  key={action.id}
                                                  size="sm"
                                                  variant="secondary"
                                                  disabled={runDiscrepancyAction.isPending}
                                                  onClick={() => runDiscrepancyAction.mutate({ item, actionId: action.id })}
                                                >
                                                  {isPending ? t("payrollPage.working") : action.label}
                                                </Button>
                                              );
                                            })}
                                          </div>
                                        ) : null}

                                        {item.status !== "resolved" ? (
                                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                            <Input
                                              placeholder={t("payrollPage.resolutionNote")}
                                              value={resolveNotes[item.id] || ""}
                                              onChange={(event) => setResolveNotes((value) => ({ ...value, [item.id]: event.target.value }))}
                                            />
                                            <Button
                                              variant="outline"
                                              disabled={resolveDiscrepancy.isPending}
                                              onClick={() => resolveDiscrepancy.mutate({ discrepancyId: item.id, note: resolveNotes[item.id] || t("payrollPage.resolvedInPayrollReview") })}
                                            >
                                              {t("labels.code.resolved")}
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="mt-3 text-sm text-muted-foreground">
                                            {item.resolution_note
                                              ? t("payrollPage.resolvedAtWithNote", {
                                                  date: formatDateTime(item.resolved_at),
                                                  note: item.resolution_note,
                                                })
                                              : t("payrollPage.resolvedAt", { date: formatDateTime(item.resolved_at) })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <EmptyState
                            title={discrepanciesQuery.isLoading ? t("payrollPage.loadingDiscrepancies") : t("payrollPage.noDiscrepanciesInView")}
                            description={t("payrollPage.noDiscrepanciesInViewDescription")}
                          />
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <EmptyState
                    title={discrepanciesQuery.isLoading ? t("payrollPage.loadingDiscrepancies") : t("payrollPage.noDiscrepanciesFound")}
                    description={t("payrollPage.noDiscrepanciesFoundDescription")}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("payrollPage.historyTitle")}</CardTitle>
                <CardDescription>{t("payrollPage.historyDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPayroll ? (
                  <div className="rounded-lg border border-border p-4">
                    <p className="font-medium">{t("payrollPage.selectedPayroll", { id: selectedPayroll.id })}</p>
                    <p className="text-sm text-muted-foreground">
                      {getEmployeeLabel(selectedPayroll.employee_id)} / {getPeriodLabel(selectedPayroll.payroll_period_id)}
                    </p>
                    <div className="mt-3 space-y-2">
                      {(historyQuery.data || []).length ? (
                        historyQuery.data?.map((item) => (
                          <div key={item.id} className="rounded-md border border-border p-3">
                            <p className="text-sm font-medium">{item.reason}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("payrollPage.historyGrossChange", {
                                from: formatCurrency(item.old_gross_salary),
                                to: formatCurrency(item.new_gross_salary),
                              })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {historyQuery.isLoading ? t("payrollPage.loadingHistory") : t("payrollPage.noPayrollHistory")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState title={t("payrollPage.noRowSelected")} description={t("payrollPage.noRowSelectedDescription")} />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={Boolean(detailsPayroll)} onOpenChange={(open) => !open && setDetailsPayrollId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("payrollPage.payslipPreview")}</DialogTitle>
            <DialogDescription>
              {detailsPayroll ? `${getEmployeeLabel(detailsPayroll.employee_id)} / ${getPeriodLabel(detailsPayroll.payroll_period_id, periodQuery.data?.name)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detailsPayroll ? (
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>{t("payrollPage.previewOnlyTitle")}</AlertTitle>
                <AlertDescription>{t("payrollPage.previewOnlyDescription")}</AlertDescription>
              </Alert>
              {detailsPayroll.needs_review_reason ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("labels.code.needs_review")}</AlertTitle>
                  <AlertDescription>{detailsPayroll.needs_review_reason}</AlertDescription>
                </Alert>
              ) : null}
              {Number(getHeldForReviewAmount(detailsPayroll)) > 0 ? (
                <Alert className="border-warning/40">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("payrollPage.amountHeldForReview")}</AlertTitle>
                  <AlertDescription>
                    {t("payrollPage.amountHeldForReviewDescription", {
                      earned: formatCurrency(getEarnedNetSalary(detailsPayroll)),
                      payable: formatCurrency(getPayableAmount(detailsPayroll)),
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("common.status")}</p>
                  <div className="mt-1"><StatusBadge status={detailsPayroll.status} /></div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("employeesPage.salaryType")}</p>
                  <p className="font-medium capitalize">{formatLabel(detailsPayroll.salary_type)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("payrollPage.calculatedAt")}</p>
                  <p className="font-medium">{formatDateTime(detailsPayroll.calculated_at)}</p>
                </div>
              </div>
              <PayrollBreakdownGrid payroll={detailsPayroll} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("payrollPage.approvedDate")}</p>
                  <p className="font-medium">{formatDateTime(detailsPayroll.approved_at)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("payrollPage.paidDate")}</p>
                  <p className="font-medium">{formatDateTime(detailsPayroll.paid_at)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <Button variant="outline" disabled>{t("payrollPage.downloadPdf")}</Button>
                  <Button variant="outline" disabled>{t("payrollPage.export")}</Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">{t("payrollPage.calculationTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("payrollPage.calculationDescription")}</p>
                </div>
                <CalculationGrid history={historyQuery.data} />
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">{t("payrollPage.manualAdjustmentsTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("payrollPage.manualAdjustmentsDescription")}</p>
                </div>
                {adjustmentsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">{t("payrollPage.loadingAdjustments")}</p>
                ) : selectedAdjustments.length ? (
                  <div className="space-y-2">
                    {selectedAdjustments.map((adjustment) => (
                      <div key={adjustment.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                        <div>
                          <p className="font-medium">
                            {getAdjustmentLabel(adjustment.adjustment_type)} / {formatCurrency(adjustment.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">{adjustment.reason}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(adjustment.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="icon" variant="outline" disabled={!canAdjustPayroll(detailsPayroll)} onClick={() => openEditAdjustmentDialog(adjustment)} aria-label={t("payrollPage.editAdjustmentAria", { id: adjustment.id })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" disabled={!canAdjustPayroll(detailsPayroll)} onClick={() => setDeletingAdjustment(adjustment)} aria-label={t("payrollPage.deleteAdjustmentAria", { id: adjustment.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("payrollPage.noManualAdjustments")}</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdjustmentId ? t("common.edit") : t("common.add")} {getAdjustmentLabel(adjustmentForm.adjustment_type).toLowerCase()}</DialogTitle>
            <DialogDescription>
              {selectedPayroll
                ? `${getEmployeeLabel(selectedPayroll.employee_id)} / ${getPeriodLabel(selectedPayroll.payroll_period_id, periodQuery.data?.name)}`
                : t("payrollPage.selectPayrollBeforeAdjustment")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {selectedPayroll ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("common.employee")}</p>
                  <p className="font-medium">{getEmployeeLabel(selectedPayroll.employee_id)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("payrollPage.payrollRow")}</p>
                  <p className="font-medium">#{selectedPayroll.id}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("payrollPage.currentEarnedNet")}</p>
                  <p className="font-medium">{formatCurrency(getEarnedNetSalary(selectedPayroll))}</p>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">{t("payrollPage.adjustmentType")}</Label>
              <Select
                value={adjustmentForm.adjustment_type}
                onValueChange={(value) => setAdjustmentForm((current) => ({ ...current, adjustment_type: value as PayrollAdjustmentType }))}
              >
                <SelectTrigger id="adjustmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {payrollAdjustmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getAdjustmentLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentAmount">{t("payrollPage.amount")}</Label>
              <Input
                id="adjustmentAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={adjustmentForm.amount}
                onChange={(event) => setAdjustmentForm((value) => ({ ...value, amount: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentReason">{t("attendancePage.reason")}</Label>
              <Textarea id="adjustmentReason" value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitAdjustment} disabled={addAdjustment.isPending || updateAdjustment.isPending || !canSubmitAdjustment}>
              {addAdjustment.isPending || updateAdjustment.isPending ? t("common.saving") : editingAdjustmentId ? t("payrollPage.saveAdjustment") : t("payrollPage.addAdjustment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingAdjustment)} onOpenChange={(open) => !open && setDeletingAdjustment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payrollPage.deleteAdjustment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("payrollPage.deleteAdjustmentDescription", {
                type: deletingAdjustment ? getAdjustmentLabel(deletingAdjustment.adjustment_type) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingAdjustment ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{formatCurrency(deletingAdjustment.amount)}</p>
              <p className="text-muted-foreground">{deletingAdjustment.reason}</p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteAdjustment.isPending} onClick={() => deletingAdjustment && deleteAdjustment.mutate(deletingAdjustment.id)}>
              {deleteAdjustment.isPending ? t("attendancePage.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(confirmAction.type && confirmAction.payrollId)} onOpenChange={(open) => !open && setConfirmAction({ type: null, payrollId: null, amount: "", note: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === "approve"
                ? t("payrollPage.approvePayroll")
                : t("payrollPage.recordPayrollPayment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === "approve"
                ? t("payrollPage.approvePayrollDescription")
                : t("payrollPage.recordPayrollPaymentDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction.type === "paid" ? (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">{t("payrollPage.paymentAmount")}</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={confirmAction.amount}
                  onChange={(event) => setConfirmAction((value) => ({ ...value, amount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentNote">{t("payrollPage.paymentNote")}</Label>
                <Textarea
                  id="paymentNote"
                  value={confirmAction.note}
                  onChange={(event) => setConfirmAction((value) => ({ ...value, note: event.target.value }))}
                  placeholder={t("payrollPage.paymentNotePlaceholder")}
                />
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                approvePayroll.isPending ||
                markPayrollPaid.isPending ||
                (confirmAction.type === "approve" && !canApprovePayroll(confirmPayroll, allDiscrepancies)) ||
                (confirmAction.type === "paid" && !canRecordPayrollPayment(confirmPayroll)) ||
                (confirmAction.type === "paid" &&
                  (!confirmAction.amount ||
                    !Number.isFinite(Number(confirmAction.amount)) ||
                    Number(confirmAction.amount) <= 0 ||
                    Number(confirmAction.amount) > Number(confirmPayroll?.balance_amount || 0)))
              }
              onClick={submitConfirmAction}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
