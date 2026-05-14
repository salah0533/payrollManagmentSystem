import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Calculator, DollarSign, WalletCards } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { payrollApi } from "@/services/payrollApi";
import { toast } from "@/hooks/use-toast";

export default function Payments({ scope }: { scope: "manage" | "self" }) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periodId, setPeriodId] = useState(searchParams.get("period") || "");
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "paid" | null; payrollId: number | null }>({
    type: null,
    payrollId: null,
  });
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    employee_payroll_id: "",
    employee_id: "",
    adjustment_type: "bonus",
    amount: "0",
    reason: "",
  });
  const [resolveNotes, setResolveNotes] = useState<Record<number, string>>({});

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

  const historyQuery = useQuery({
    queryKey: ["payroll", "history", selectedPayrollId],
    queryFn: () => payrollApi.getHistory(selectedPayrollId as number),
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
      setConfirmAction({ type: null, payrollId: null });
      await refreshPayroll();
    },
  });

  const markPayrollPaid = useMutation({
    mutationFn: (employeePayrollId: number) => payrollApi.markPaid(employeePayrollId),
    onSuccess: async () => {
      toast({ title: "Payroll marked paid", description: "The payroll row is now marked as paid." });
      setConfirmAction({ type: null, payrollId: null });
      await refreshPayroll();
    },
  });

  const addAdjustment = useMutation({
    mutationFn: () =>
      payrollApi.addAdjustment({
        employee_payroll_id: Number(adjustmentForm.employee_payroll_id),
        payroll_period_id: parsedPeriodId,
        employee_id: Number(adjustmentForm.employee_id),
        adjustment_type: adjustmentForm.adjustment_type,
        amount: Number(adjustmentForm.amount),
        reason: adjustmentForm.reason,
      }),
    onSuccess: async () => {
      toast({ title: "Adjustment added", description: "The payroll adjustment was sent to the backend." });
      setAdjustmentOpen(false);
      setAdjustmentForm({
        employee_payroll_id: "",
        employee_id: "",
        adjustment_type: "bonus",
        amount: "0",
        reason: "",
      });
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

  const resolveDiscrepancy = useMutation({
    mutationFn: ({ discrepancyId, note }: { discrepancyId: number; note: string }) => payrollApi.resolveDiscrepancy(discrepancyId, note),
    onSuccess: async () => {
      toast({ title: "Discrepancy resolved", description: "The discrepancy was marked as resolved." });
      await refreshPayroll();
    },
  });

  const payrollRows = useMemo(() => periodQuery.data?.payrolls ?? [], [periodQuery.data?.payrolls]);
  const warningOpenDiscrepancies = (discrepanciesQuery.data || []).filter((item) => item.status !== "resolved").length;
  const selectedPayroll = useMemo(() => payrollRows.find((row) => row.id === selectedPayrollId) || null, [payrollRows, selectedPayrollId]);
  const selfPayroll = selfPayrollQuery.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? "Payroll Overview" : "My Payroll"}
        description={
          scope === "manage"
            ? "Review payroll by period id, recalculate, approve, add adjustments, and resolve discrepancies."
            : "View your payroll by selecting a payroll period."
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
              <Button variant="outline" onClick={() => recalculatePeriod.mutate()} disabled={!canLoadPayroll || recalculatePeriod.isPending}>
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Status" value={<StatusBadge status={selfPayroll.status} />} icon={WalletCards} />
                <MetricCard label="Net salary" value={formatCurrency(selfPayroll.net_salary)} icon={DollarSign} tone="success" />
                <MetricCard label="Gross salary" value={formatCurrency(selfPayroll.gross_salary)} icon={Calculator} tone="info" />
                <MetricCard label="Adjustments" value={formatCurrency(selfPayroll.adjustment_amount)} icon={AlertTriangle} tone="warning" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Payroll summary</CardTitle>
                  <CardDescription>Loaded from `/me/payroll?period_id={parsedPeriodId}`.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Base salary</p>
                    <p className="font-medium">{formatCurrency(selfPayroll.base_salary)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Overtime</p>
                    <p className="font-medium">{formatCurrency(selfPayroll.overtime_amount)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Late deductions</p>
                    <p className="font-medium">{formatCurrency(selfPayroll.late_deduction_amount)}</p>
                  </div>
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Period" value={periodQuery.data?.name || parsedPeriodId} icon={WalletCards} />
            <MetricCard label="Payroll rows" value={payrollRows.length} icon={Calculator} tone="success" />
            <MetricCard label="Discrepancies" value={(discrepanciesQuery.data || []).length} icon={AlertTriangle} tone="warning" />
            <MetricCard label="Open warnings" value={warningOpenDiscrepancies} icon={AlertTriangle} tone="danger" />
          </div>

          {warningOpenDiscrepancies > 0 ? (
            <Card className="border-warning/40">
              <CardContent className="p-4 text-sm">
                Payroll warning: this period has open discrepancies. Review them before final approval or payment.
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Payroll rows</CardTitle>
              <CardDescription>Use the buttons below for recalculate, approve, payment marking, history, and adjustments.</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Calculated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.employee_id}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell>{formatCurrency(row.net_salary)}</TableCell>
                        <TableCell>{formatCurrency(row.gross_salary)}</TableCell>
                        <TableCell>{formatDateTime(row.calculated_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => recalculateEmployee.mutate({ employeeId: row.employee_id })}>
                              Recalculate
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "approve", payrollId: row.id })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "paid", payrollId: row.id })}>
                              Mark paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayrollId(row.id);
                                setAdjustmentForm({
                                  employee_payroll_id: String(row.id),
                                  employee_id: String(row.employee_id),
                                  adjustment_type: "bonus",
                                  amount: "0",
                                  reason: "",
                                });
                                setAdjustmentOpen(true);
                              }}
                            >
                              Adjust
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                <CardDescription>Loaded from `/payroll/discrepancies/{parsedPeriodId}`.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(discrepanciesQuery.data || []).length ? (
                  discrepanciesQuery.data?.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Employee #{item.employee_id} / {item.discrepancy_type} / {item.severity}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      {item.status !== "resolved" ? (
                        <div className="mt-3 flex gap-2">
                          <Input
                            placeholder="Resolution note"
                            value={resolveNotes[item.id] || ""}
                            onChange={(event) => setResolveNotes((value) => ({ ...value, [item.id]: event.target.value }))}
                          />
                          <Button
                            variant="outline"
                            onClick={() => resolveDiscrepancy.mutate({ discrepancyId: item.id, note: resolveNotes[item.id] || "Resolved in frontend review." })}
                          >
                            Resolve
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
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
                      Employee #{selectedPayroll.employee_id} / Period {selectedPayroll.payroll_period_id}
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
                  <EmptyState title="No payroll row selected" description="Open Adjust on a payroll row to inspect and add a payroll adjustment." />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payroll adjustment</DialogTitle>
            <DialogDescription>Add a backend payroll adjustment when the selected payroll row needs a manual correction.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjustmentPayrollId">Employee payroll ID</Label>
              <Input id="adjustmentPayrollId" value={adjustmentForm.employee_payroll_id} onChange={(event) => setAdjustmentForm((value) => ({ ...value, employee_payroll_id: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentEmployeeId">Employee ID</Label>
              <Input id="adjustmentEmployeeId" value={adjustmentForm.employee_id} onChange={(event) => setAdjustmentForm((value) => ({ ...value, employee_id: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">Adjustment type</Label>
              <Input id="adjustmentType" value={adjustmentForm.adjustment_type} onChange={(event) => setAdjustmentForm((value) => ({ ...value, adjustment_type: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentAmount">Amount</Label>
              <Input id="adjustmentAmount" type="number" step="0.01" value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm((value) => ({ ...value, amount: event.target.value }))} />
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
            <Button onClick={() => addAdjustment.mutate()} disabled={addAdjustment.isPending}>
              {addAdjustment.isPending ? "Saving..." : "Add adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmAction.type && confirmAction.payrollId)} onOpenChange={(open) => !open && setConfirmAction({ type: null, payrollId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction.type === "approve" ? "Approve payroll" : "Mark payroll paid"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === "approve"
                ? "This confirms the payroll row after review."
                : "This marks the payroll as paid and may lock it depending on backend policy."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction.payrollId &&
                (confirmAction.type === "approve"
                  ? approvePayroll.mutate(confirmAction.payrollId)
                  : markPayrollPaid.mutate(confirmAction.payrollId))
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
