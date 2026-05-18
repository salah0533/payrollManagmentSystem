import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const adjustmentLabels: Record<PayrollAdjustmentType, string> = {
  bonus: "Bonus",
  deduction: "Deduction",
  correction: "Correction",
};

const discrepancyTypeLabels: Record<string, string> = {
  missing_attendance: "Missing attendance",
  missing_checkout: "Missing check-out",
  missing_checkin: "Missing check-in",
  attendance_requires_review: "Attendance needs review",
  vacation_overlap: "Vacation overlaps attendance",
  attendance_changed_after_approval: "Attendance changed after approval",
  overtime_conflict: "Overtime conflict",
};

const calculationFields = [
  { key: "actual_work_minutes", label: "Worked time", format: "minutes" },
  { key: "normal_paid_minutes", label: "Paid time", format: "minutes" },
  { key: "earned_paid_minutes", label: "Earned paid time", format: "minutes" },
  { key: "paid_minutes", label: "Payable time", format: "minutes" },
  { key: "period_expected_minutes", label: "Expected time", format: "minutes" },
  { key: "overtime_minutes", label: "Overtime", format: "minutes" },
  { key: "payable_overtime_minutes", label: "Payable overtime", format: "minutes" },
  { key: "late_minutes", label: "Late", format: "minutes" },
  { key: "early_leave_minutes", label: "Early leave", format: "minutes" },
  { key: "late_makeup_minutes", label: "Late makeup", format: "minutes" },
  { key: "absence_minutes", label: "Absent time", format: "minutes" },
  { key: "unpaid_minutes", label: "Unpaid time", format: "minutes" },
  { key: "missing_workday_minutes", label: "Missing workdays", format: "minutes" },
  { key: "partial_unpaid_minutes", label: "Partial unpaid", format: "minutes" },
  { key: "absence_days", label: "Absent days", format: "number" },
  { key: "paid_vacation_days", label: "Paid vacation", format: "number" },
  { key: "unpaid_vacation_days", label: "Unpaid vacation", format: "number" },
  { key: "missing_attendance_days", label: "Missing attendance", format: "number" },
  { key: "auto_minute_rate", label: "Auto minute rate", format: "currency" },
  { key: "attendance_deduction", label: "Attendance deduction", format: "currency" },
  { key: "earned_attendance_deduction", label: "Earned attendance deduction", format: "currency" },
  { key: "manual_deduction_amount", label: "Manual deductions", format: "currency" },
  { key: "earned_deduction_amount", label: "Earned deductions", format: "currency" },
  { key: "late_penalty_amount", label: "Late penalty", format: "currency" },
  { key: "earned_net_salary", label: "Earned net", format: "currency" },
  { key: "held_for_review_amount", label: "Held for review", format: "currency" },
  { key: "payable_amount", label: "Payable total", format: "currency" },
] as const;

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
  const breakdownFields: Array<{ label: string; value: number | string }> = [
    { label: "Base salary", value: payroll.base_salary },
    { label: "Normal pay", value: payroll.normal_amount },
    { label: "Overtime", value: payroll.overtime_amount },
    { label: "Bonus", value: payroll.bonus_amount },
    { label: "Attendance deduction", value: payroll.attendance_deduction_amount ?? payroll.deduction_amount ?? 0 },
    { label: "Manual deductions", value: payroll.manual_deduction_amount ?? 0 },
    { label: "Late penalty", value: payroll.late_penalty_amount ?? payroll.late_deduction_amount ?? 0 },
    { label: "Adjustment total", value: payroll.adjustment_amount },
    { label: "Gross salary", value: payroll.gross_salary },
    { label: "Earned net", value: getEarnedNetSalary(payroll) },
    { label: "Held for review", value: getHeldForReviewAmount(payroll) },
    { label: "Payable total", value: getPayableAmount(payroll) },
    { label: "Paid", value: payroll.paid_amount },
    { label: "Balance", value: payroll.balance_amount },
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
  return discrepancyTypeLabels[type] || formatLabel(type);
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
      { id: "mark_present", label: "Mark present" },
      { id: "mark_absent", label: "Mark absent" },
    ];
  }

  if (item.discrepancy_type === "attendance_requires_review") {
    return [{ id: "approve_attendance", label: "Approve day" }];
  }

  return [];
}

function CalculationGrid({ history }: { history?: PayrollHistory[] }) {
  const calculation = latestCalculationHistory(history);

  if (!calculation) {
    return <p className="text-sm text-muted-foreground">No calculation snapshot is available yet. Recalculate this payroll row to create one.</p>;
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
            <p className="text-xs text-muted-foreground">{field.label}</p>
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
      toast({ title: "Payroll recalculated", description: "The full period payroll was recalculated." });
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: "Unable to recalculate payroll",
        description: getErrorMessage(error, "The backend rejected the period recalculation."),
        variant: "destructive",
      });
    },
  });

  const recalculateEmployee = useMutation({
    mutationFn: ({ employeeId }: { employeeId: number }) => payrollApi.recalculateEmployee(employeeId, parsedPeriodId),
    onSuccess: async () => {
      toast({ title: "Employee payroll recalculated", description: "The selected payroll row was recalculated." });
      await refreshPayroll();
    },
  });

  const approvePayroll = useMutation({
    mutationFn: (employeePayrollId: number) => payrollApi.approve(employeePayrollId),
    onSuccess: async () => {
      toast({ title: "Payroll approved", description: "The payroll row is now approved." });
      setConfirmAction({ type: null, payrollId: null, amount: "", note: "" });
      await refreshPayroll();
    },
  });

  const markPayrollPaid = useMutation({
    mutationFn: ({ employeePayrollId, amount, note }: { employeePayrollId: number; amount?: number; note?: string }) =>
      payrollApi.markPaid(employeePayrollId, { amount, note }),
    onSuccess: async () => {
      toast({ title: "Payment recorded", description: "The payroll balance was updated." });
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
      toast({ title: "Adjustment added", description: "The payroll adjustment was sent to the backend." });
      setAdjustmentOpen(false);
      resetAdjustmentForm();
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: "Unable to add adjustment",
        description: getErrorMessage(error, "Please review the adjustment data."),
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
      toast({ title: "Adjustment updated", description: "The payroll row was recalculated with the updated adjustment." });
      setAdjustmentOpen(false);
      resetAdjustmentForm();
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: "Unable to update adjustment",
        description: getErrorMessage(error, "Please review the adjustment data."),
        variant: "destructive",
      });
    },
  });

  const deleteAdjustment = useMutation({
    mutationFn: (adjustmentId: number) => payrollApi.deleteAdjustment(adjustmentId),
    onSuccess: async () => {
      toast({ title: "Adjustment deleted", description: "The payroll row was recalculated without that adjustment." });
      setDeletingAdjustment(null);
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: "Unable to delete adjustment",
        description: getErrorMessage(error, "The backend rejected the adjustment deletion."),
        variant: "destructive",
      });
    },
  });

  const resolveDiscrepancy = useMutation({
    mutationFn: ({ discrepancyId, note }: { discrepancyId: number; note: string }) => payrollApi.resolveDiscrepancy(discrepancyId, note),
    onSuccess: async () => {
      toast({ title: "Discrepancy resolved", description: "The discrepancy was marked as resolved." });
      await refreshPayroll();
    },
  });

  const runDiscrepancyAction = useMutation({
    mutationFn: async ({ item, actionId }: { item: PayrollDiscrepancy; actionId: string }) => {
      const workDate = getDiscrepancyWorkDate(item);
      if (!workDate) {
        throw new Error("This discrepancy does not expose a work date for quick actions.");
      }

      if (actionId === "mark_present" || actionId === "mark_absent") {
        await attendanceApi.smartCorrection(item.employee_id, workDate, {
          target_status: actionId === "mark_present" ? "present" : "absent",
          reason: `Resolved from payroll discrepancy review (${item.discrepancy_type})`,
        });
        return;
      }

      if (actionId === "approve_attendance") {
        await attendanceApi.reviewDay(item.employee_id, workDate, {
          review_status: "approved",
          note: "Approved from payroll discrepancy review.",
        });
        return;
      }

      throw new Error("Unsupported discrepancy action.");
    },
    onMutate: ({ item, actionId }) => {
      setActiveDiscrepancyAction(`${item.id}:${actionId}`);
    },
    onSuccess: async (_result, variables) => {
      const labels: Record<string, string> = {
        mark_present: "Attendance marked present",
        mark_absent: "Attendance marked absent",
        approve_attendance: "Attendance approved",
      };
      toast({
        title: labels[variables.actionId] || "Quick action completed",
        description: "Payroll discrepancies were refreshed for the selected row.",
      });
      await refreshPayroll();
    },
    onError: (error) => {
      toast({
        title: "Quick action failed",
        description: getErrorMessage(error, "The discrepancy could not be updated from this panel."),
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
  const getEmployeeLabel = (employeeId: number) => employeeNameMap.get(employeeId) || `Employee #${employeeId}`;
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
        employeeLabel: employeeNameMap.get(item.employee_id) || `Employee #${item.employee_id}`,
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
  }, [employeeNameMap, filteredDiscrepancies]);
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
        title: "Adjustment needs review",
        description: "Choose a type, enter an amount greater than zero, and add a reason.",
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
          title: "Payroll approval blocked",
          description: "Resolve open discrepancies before approving this row.",
          variant: "destructive",
        });
        return;
      }
      approvePayroll.mutate(confirmAction.payrollId);
      return;
    }

    if (!canRecordPayrollPayment(confirmPayroll)) {
      toast({
        title: "Payment recording blocked",
        description: "Payroll must be approved before payment is recorded.",
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
        title={scope === "manage" ? "Payroll Overview" : "My Payroll"}
        description={
          scope === "manage"
            ? "Run payroll safely: validate attendance, resolve discrepancies, review totals, approve rows, and record approved payments."
            : "View your payslip-style payroll details by selecting a payroll period."
        }
        actions={
          <>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={periodOptionsQuery.isLoading ? "Loading periods..." : "Select payroll period"} />
              </SelectTrigger>
              <SelectContent>
                {(periodOptionsQuery.data || []).map((period) => (
                  <SelectItem key={period.id} value={String(period.id)}>
                    {period.name} ({formatDate(period.start_date)} to {formatDate(period.end_date)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scope === "manage" ? (
              <Button variant="outline" onClick={() => recalculatePeriod.mutate()} disabled={!canLoadPayroll || !periodCanRecalculate || recalculatePeriod.isPending}>
                {recalculatePeriod.isPending ? "Recalculating..." : "Recalculate period"}
              </Button>
            ) : null}
          </>
        }
      />

      {!canLoadPayroll ? (
        <EmptyState
          title="Payroll period required"
          description={
            periodOptionsQuery.isLoading
              ? "Loading payroll periods..."
              : "No payroll periods are available yet."
          }
        />
      ) : scope === "self" ? (
        <>
          {selfPayroll ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="Status" value={<StatusBadge status={selfPayroll.status} />} icon={WalletCards} />
                <MetricCard label="Earned net" value={formatCurrency(getEarnedNetSalary(selfPayroll))} icon={DollarSign} tone="success" hint="What the attendance calculation produced" />
                <MetricCard label="Held" value={formatCurrency(getHeldForReviewAmount(selfPayroll))} icon={AlertTriangle} tone="warning" hint="Blocked until review/approval" />
                <MetricCard label="Payable total" value={formatCurrency(getPayableAmount(selfPayroll))} icon={WalletCards} tone="info" hint="Amount currently eligible for payment" />
                <MetricCard label="Paid" value={formatCurrency(selfPayroll.paid_amount)} icon={ReceiptText} tone="info" />
                <MetricCard
                  label="Balance"
                  value={formatCurrency(selfPayroll.balance_amount)}
                  icon={Scale}
                  tone={Number(selfPayroll.balance_amount) < 0 ? "danger" : "warning"}
                  hint={Number(selfPayroll.balance_amount) < 0 ? "You owe company" : "Company owes you"}
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Payroll summary</CardTitle>
                  <CardDescription>Loaded from `/me/payroll?period_id={parsedPeriodId}`.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Number(getHeldForReviewAmount(selfPayroll)) > 0 ? (
                    <Alert className="border-warning/40">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Part of this payroll is held for review</AlertTitle>
                      <AlertDescription>
                        You earned {formatCurrency(getEarnedNetSalary(selfPayroll))}, but only {formatCurrency(getPayableAmount(selfPayroll))} is currently payable.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <PayrollBreakdownGrid payroll={selfPayroll} />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Approved at</p>
                    <p className="font-medium">{formatDateTime(selfPayroll.approved_at)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Paid at</p>
                    <p className="font-medium">{formatDateTime(selfPayroll.paid_at)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="font-medium">{selfPayroll.notes || "-"}</p>
                  </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title={selfPayrollQuery.isLoading ? "Loading payroll..." : "No payroll found for this period"}
              description="Try another period id if the current one does not have payroll data."
            />
          )}
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Payroll overview</CardTitle>
              <CardDescription>Period totals and settlement status for the selected payroll period.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <OverviewStat label="Payable payroll" value={formatCurrency(payrollReport?.total_amount)} hint="Approved/payable total for this period" />
              <OverviewStat label="Paid" value={formatCurrency(payrollReport?.paid_amount)} />
              <OverviewStat
                label="Balance"
                value={formatCurrency(payrollReport?.balance_amount)}
                hint="Positive means company owes employees"
              />
              <OverviewStat label="Company owes" value={formatCurrency(payrollReport?.company_owes_employees)} />
              <OverviewStat label="Employees owe" value={formatCurrency(payrollReport?.employees_owe_company)} />
              <OverviewStat label="Open warnings" value={warningOpenDiscrepancies} hint="Resolve before final approval" />
            </CardContent>
          </Card>

          {warningOpenDiscrepancies > 0 ? (
            <Alert className="border-warning/40">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Payroll validation needs review</AlertTitle>
              <AlertDescription>
                This period has open discrepancies. Approval and payment controls stay blocked where those discrepancies affect a payroll row.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Payroll run workflow</CardTitle>
              <CardDescription>Use the existing backend controls in order; unsupported exports and locks stay unavailable until backend endpoints exist.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["1", "Select period", periodId ? "Complete" : "Required"],
                ["2", "Validate attendance", warningOpenDiscrepancies ? `${warningOpenDiscrepancies} open issue(s)` : "No open issues"],
                ["3", "Review payroll totals", payrollRows.length ? `${payrollRows.length} row(s)` : "No rows"],
                ["4", "Approve payroll rows", "Blocked per row when discrepancies exist"],
                ["5", "Record payment", "Only after row approval"],
                ["6", "Lock / export / payslips", "Backend endpoint needed"],
              ].map(([step, title, status]) => (
                <div key={step} className="rounded-lg border border-border p-4">
                  <Badge variant="outline">Step {step}</Badge>
                  <p className="mt-2 font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{status}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance report</CardTitle>
              <CardDescription>Positive balances are owed by the company. Totals here are payable totals, not just earned estimates.</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollReport?.employees.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Payable total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollReport.employees.map((employee) => (
                      <TableRow key={employee.employee_id}>
                        <TableCell>
                          <div className="font-medium">{employee.employee_name}</div>
                          <div className="text-xs text-muted-foreground">Employee #{employee.employee_id}</div>
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
                  title={reportQuery.isLoading ? "Loading balance report..." : "No payroll balances yet"}
                  description="Once payroll rows are calculated, employee balances will appear here."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll rows</CardTitle>
              <CardDescription>Open the row action menu for details, recalculation, approval, payment marking, and adjustments.</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Attendance deduction</TableHead>
                      <TableHead>Manual deductions</TableHead>
                      {showLatePenaltyColumn ? <TableHead>Late penalty</TableHead> : null}
                      <TableHead>Held</TableHead>
                      <TableHead>Earned net</TableHead>
                      <TableHead>Payable total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <div className="text-xs text-muted-foreground">Payroll #{row.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge status={row.status} />
                            {rowHasOpenDiscrepancy ? <Badge variant="destructive">Open issue</Badge> : null}
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
                              <Button size="icon" variant="outline" aria-label={`Open actions for payroll ${row.id}`}>
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
                                Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!rowCanRecalculate || recalculateEmployee.isPending}
                                onSelect={() => recalculateEmployee.mutate({ employeeId: row.employee_id })}
                              >
                                Recalculate
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!rowCanApprove} onSelect={() => setConfirmAction({ type: "approve", payrollId: row.id, amount: "", note: "" })}>
                                Approve
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
                                Record payment
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                Lock period unavailable
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                Export / PDF unavailable
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {payrollAdjustmentTypes.map((type) => (
                                <DropdownMenuItem key={type} disabled={!rowCanAdjust} onSelect={() => openAdjustmentDialog(row, type)}>
                                  Add {adjustmentLabels[type].toLowerCase()}
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
                  title={periodQuery.isLoading ? "Loading payroll..." : "No payroll rows found"}
                  description="Use a valid period id to load the payroll period and its employee rows."
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Discrepancies</CardTitle>
                <CardDescription>Grouped by employee so large payroll runs stay easier to review and act on.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {allDiscrepancies.length ? (
                  <Tabs value={discrepancyTab} onValueChange={(value) => setDiscrepancyTab(value as "open" | "all" | "resolved")} className="space-y-4">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="open">Open ({warningOpenDiscrepancies})</TabsTrigger>
                      <TabsTrigger value="all">All ({allDiscrepancies.length})</TabsTrigger>
                      <TabsTrigger value="resolved">Resolved ({allDiscrepancies.filter((item) => item.status === "resolved").length})</TabsTrigger>
                    </TabsList>

                    {(["open", "all", "resolved"] as const).map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <OverviewStat label="Employees affected" value={discrepancyGroups.length} />
                          <OverviewStat label="Issues shown" value={filteredDiscrepancies.length} />
                          <OverviewStat
                            label="Top type"
                            value={discrepancyTypeSummary[0] ? getDiscrepancyTypeLabel(discrepancyTypeSummary[0][0]) : "-"}
                            hint={discrepancyTypeSummary[0] ? `${discrepancyTypeSummary[0][1]} item(s)` : undefined}
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
                                      <p className="text-sm text-muted-foreground">Employee #{group.employeeId}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {group.openCount ? <Badge variant="destructive">{group.openCount} open</Badge> : null}
                                      {group.resolvedCount ? <Badge variant="secondary">{group.resolvedCount} resolved</Badge> : null}
                                      <Badge variant="outline">{group.items.length} total</Badge>
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
                                                  {isPending ? "Working..." : action.label}
                                                </Button>
                                              );
                                            })}
                                          </div>
                                        ) : null}

                                        {item.status !== "resolved" ? (
                                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                            <Input
                                              placeholder="Resolution note"
                                              value={resolveNotes[item.id] || ""}
                                              onChange={(event) => setResolveNotes((value) => ({ ...value, [item.id]: event.target.value }))}
                                            />
                                            <Button
                                              variant="outline"
                                              disabled={resolveDiscrepancy.isPending}
                                              onClick={() => resolveDiscrepancy.mutate({ discrepancyId: item.id, note: resolveNotes[item.id] || "Resolved in payroll review." })}
                                            >
                                              Resolve
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="mt-3 text-sm text-muted-foreground">
                                            Resolved {formatDateTime(item.resolved_at)}{item.resolution_note ? ` - ${item.resolution_note}` : ""}
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
                            title={discrepanciesQuery.isLoading ? "Loading discrepancies..." : "No discrepancies in this view"}
                            description="Try another tab to review open or resolved items."
                          />
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <EmptyState
                    title={discrepanciesQuery.isLoading ? "Loading discrepancies..." : "No discrepancies found"}
                    description="Open payroll discrepancies will appear here for the selected period."
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payroll history</CardTitle>
                <CardDescription>Select a payroll row and open adjustment/history actions to review backend history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPayroll ? (
                  <div className="rounded-lg border border-border p-4">
                    <p className="font-medium">Selected payroll #{selectedPayroll.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {getEmployeeLabel(selectedPayroll.employee_id)} / Period {selectedPayroll.payroll_period_id}
                    </p>
                    <div className="mt-3 space-y-2">
                      {(historyQuery.data || []).length ? (
                        historyQuery.data?.map((item) => (
                          <div key={item.id} className="rounded-md border border-border p-3">
                            <p className="text-sm font-medium">{item.reason}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                            <p className="text-xs text-muted-foreground">
                              Gross {formatCurrency(item.old_gross_salary)} to {formatCurrency(item.new_gross_salary)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {historyQuery.isLoading ? "Loading history..." : "No history returned for this payroll row yet."}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState title="No payroll row selected" description="Open a payroll row to inspect adjustment and calculation history." />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={Boolean(detailsPayroll)} onOpenChange={(open) => !open && setDetailsPayrollId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip preview</DialogTitle>
            <DialogDescription>
              {detailsPayroll ? `${getEmployeeLabel(detailsPayroll.employee_id)} / ${periodQuery.data?.name || `Period ${detailsPayroll.payroll_period_id}`}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detailsPayroll ? (
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Preview only</AlertTitle>
                <AlertDescription>PDF download, export, and period lock are not active because this backend does not expose those endpoints yet.</AlertDescription>
              </Alert>
              {detailsPayroll.needs_review_reason ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Needs review</AlertTitle>
                  <AlertDescription>{detailsPayroll.needs_review_reason}</AlertDescription>
                </Alert>
              ) : null}
              {Number(getHeldForReviewAmount(detailsPayroll)) > 0 ? (
                <Alert className="border-warning/40">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Amount held for review</AlertTitle>
                  <AlertDescription>
                    Earned net is {formatCurrency(getEarnedNetSalary(detailsPayroll))}, while only {formatCurrency(getPayableAmount(detailsPayroll))} is currently payable.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1"><StatusBadge status={detailsPayroll.status} /></div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Salary type</p>
                  <p className="font-medium capitalize">{detailsPayroll.salary_type}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Calculated at</p>
                  <p className="font-medium">{formatDateTime(detailsPayroll.calculated_at)}</p>
                </div>
              </div>
              <PayrollBreakdownGrid payroll={detailsPayroll} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Approved date</p>
                  <p className="font-medium">{formatDateTime(detailsPayroll.approved_at)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Paid date</p>
                  <p className="font-medium">{formatDateTime(detailsPayroll.paid_at)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <Button variant="outline" disabled>Download PDF</Button>
                  <Button variant="outline" disabled>Export</Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">How this payroll was calculated</h3>
                  <p className="text-sm text-muted-foreground">Attendance, absence, vacation, and overtime values from the latest calculation snapshot.</p>
                </div>
                <CalculationGrid history={historyQuery.data} />
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">Manual adjustments</h3>
                  <p className="text-sm text-muted-foreground">Bonuses, deductions, and corrections applied to this payroll row.</p>
                </div>
                {adjustmentsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading adjustments...</p>
                ) : selectedAdjustments.length ? (
                  <div className="space-y-2">
                    {selectedAdjustments.map((adjustment) => (
                      <div key={adjustment.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                        <div>
                          <p className="font-medium">
                            {adjustmentLabels[adjustment.adjustment_type as PayrollAdjustmentType] || adjustment.adjustment_type} / {formatCurrency(adjustment.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">{adjustment.reason}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(adjustment.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="icon" variant="outline" disabled={!canAdjustPayroll(detailsPayroll)} onClick={() => openEditAdjustmentDialog(adjustment)} aria-label={`Edit adjustment ${adjustment.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" disabled={!canAdjustPayroll(detailsPayroll)} onClick={() => setDeletingAdjustment(adjustment)} aria-label={`Delete adjustment ${adjustment.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No manual adjustments have been added to this row.</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdjustmentId ? "Edit" : "Add"} {adjustmentLabels[adjustmentForm.adjustment_type].toLowerCase()}</DialogTitle>
            <DialogDescription>
              {selectedPayroll ? `${getEmployeeLabel(selectedPayroll.employee_id)} / ${periodQuery.data?.name || `Period ${selectedPayroll.payroll_period_id}`}` : "Select a payroll row before saving an adjustment."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {selectedPayroll ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="font-medium">{getEmployeeLabel(selectedPayroll.employee_id)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Payroll row</p>
                  <p className="font-medium">#{selectedPayroll.id}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Current earned net</p>
                  <p className="font-medium">{formatCurrency(getEarnedNetSalary(selectedPayroll))}</p>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">Adjustment type</Label>
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
                      {adjustmentLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentAmount">Amount</Label>
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
              <Label htmlFor="adjustmentReason">Reason</Label>
              <Textarea id="adjustmentReason" value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment} disabled={addAdjustment.isPending || updateAdjustment.isPending || !canSubmitAdjustment}>
              {addAdjustment.isPending || updateAdjustment.isPending ? "Saving..." : editingAdjustmentId ? "Save adjustment" : "Add adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingAdjustment)} onOpenChange={(open) => !open && setDeletingAdjustment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the selected {deletingAdjustment?.adjustment_type} adjustment and recalculates the payroll row.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingAdjustment ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{formatCurrency(deletingAdjustment.amount)}</p>
              <p className="text-muted-foreground">{deletingAdjustment.reason}</p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteAdjustment.isPending} onClick={() => deletingAdjustment && deleteAdjustment.mutate(deletingAdjustment.id)}>
              {deleteAdjustment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(confirmAction.type && confirmAction.payrollId)} onOpenChange={(open) => !open && setConfirmAction({ type: null, payrollId: null, amount: "", note: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === "approve"
                ? "Approve payroll"
                : "Record payroll payment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === "approve"
                ? "This confirms the payroll row after discrepancy review."
                : "Record a positive payment amount for an approved payroll row. The backend rejects negative payments and paid-total corrections."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction.type === "paid" ? (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment amount</Label>
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
                <Label htmlFor="paymentNote">Note</Label>
                <Textarea
                  id="paymentNote"
                  value={confirmAction.note}
                  onChange={(event) => setConfirmAction((value) => ({ ...value, note: event.target.value }))}
                  placeholder="Partial salary payment, bank transfer reference, or settlement note"
                />
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
