import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, RefreshCw, Save, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime, formatLabel } from "@/lib/format";
import { employeeApi } from "@/services/employeeApi";
import { payrollApi } from "@/services/payrollApi";
import type { EmployeeLedgerRow, LedgerTransactionPayload, PayrollPeriod } from "@/types/domain";

type PaymentsProps = {
  scope?: "manage" | "self";
};

const emptyForm = {
  id: "",
  type: "payment" as LedgerTransactionPayload["type"],
  transaction_date: new Date().toISOString().slice(0, 10),
  amount: "",
  description: "",
};

export default function Payments({ scope = "manage" }: PaymentsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [periodPage, setPeriodPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [form, setForm] = useState(emptyForm);

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
    enabled: scope === "manage",
  });

  const periodsQuery = useQuery({
    queryKey: ["payroll", "periods", scope],
    queryFn: () => (scope === "self" ? payrollApi.listSelfPeriods() : payrollApi.listPeriods()),
  });

  const selectedPeriod = useMemo(
    () => (periodsQuery.data || []).find((period) => period.id === selectedPeriodId) || (periodsQuery.data || [])[0],
    [periodsQuery.data, selectedPeriodId],
  );
  const periodPageSize = 8;
  const periodRows = periodsQuery.data || [];
  const periodTotalPages = Math.max(1, Math.ceil(periodRows.length / periodPageSize));
  const visiblePeriods = periodRows.slice((periodPage - 1) * periodPageSize, periodPage * periodPageSize);

  const selectedEmployeeId = scope === "self" ? undefined : Number(employeeId || 0);
  const ledgerQuery = useQuery({
    queryKey: ["payroll", "ledger", selectedEmployeeId, selectedPeriod?.start_date, selectedPeriod?.end_date, ledgerPage],
    queryFn: () =>
      payrollApi.getLedger(Number(selectedEmployeeId), {
        page: ledgerPage,
        pageSize: 20,
        startDate: selectedPeriod?.start_date,
        endDate: selectedPeriod?.end_date,
      }),
    enabled: scope === "manage" && Number.isFinite(selectedEmployeeId) && Number(selectedEmployeeId) > 0 && Boolean(selectedPeriod),
  });

  const periodQuery = useQuery({
    queryKey: ["payroll", "period", selectedPeriod?.id],
    queryFn: () => payrollApi.getPeriod(Number(selectedPeriod?.id)),
    enabled: Boolean(selectedPeriod?.id),
  });

  const invalidatePayroll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["payroll"] });
  };

  const lockPeriod = useMutation({
    mutationFn: (period: PayrollPeriod) =>
      period.status === "locked" ? payrollApi.unlockPeriod(period.id) : payrollApi.lockPeriod(period.id),
    onSuccess: async (_, period) => {
      toast({
        title: period.status === "locked" ? "Period unlocked" : "Period locked",
        description: period.status === "locked" ? "Attendance can be edited again." : "Attendance days in this period are now locked.",
      });
      await invalidatePayroll();
    },
    onError: (error) => toast({ title: "Unable to update period", description: getErrorMessage(error), variant: "destructive" }),
  });

  const recalculatePeriod = useMutation({
    mutationFn: (periodId: number) => payrollApi.recalculatePeriod(periodId),
    onSuccess: async () => {
      toast({ title: "Payroll recalculated", description: "Attendance payroll was refreshed for this period." });
      await invalidatePayroll();
    },
    onError: (error) => toast({ title: "Unable to recalculate", description: getErrorMessage(error), variant: "destructive" }),
  });

  const saveTransaction = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        transaction_date: new Date(`${form.transaction_date}T12:00:00`).toISOString(),
        amount: Number(form.amount),
        description: form.description.trim() || null,
      };
      if (form.id) {
        return payrollApi.updateTransaction(Number(form.id), payload);
      }
      return payrollApi.addTransaction({ ...payload, employee_id: Number(selectedEmployeeId) });
    },
    onSuccess: async () => {
      setForm(emptyForm);
      toast({ title: "Ledger updated", description: "The employee total was recalculated." });
      await invalidatePayroll();
    },
    onError: (error) => toast({ title: "Unable to save ledger row", description: getErrorMessage(error), variant: "destructive" }),
  });

  const deleteTransaction = useMutation({
    mutationFn: (transactionId: number) => payrollApi.deleteTransaction(transactionId),
    onSuccess: async () => {
      toast({ title: "Ledger row deleted", description: "The employee total was recalculated." });
      await invalidatePayroll();
    },
    onError: (error) => toast({ title: "Unable to delete ledger row", description: getErrorMessage(error), variant: "destructive" }),
  });

  const ledgerRows = ledgerQuery.data?.items || [];
  const transactionRows = ledgerRows.filter((row) => row.type !== "period");

  const editRow = (row: EmployeeLedgerRow) => {
    if (row.type === "period") return;
    setForm({
      id: String(row.source_id),
      type: row.type,
      transaction_date: row.date.slice(0, 10),
      amount: String(row.balance),
      description: row.description || "",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("nav.payroll")} description="Attendance periods and employee ledger totals." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Payroll periods</CardTitle>
            <CardDescription>Periods calculate attendance only. Locking a period locks its attendance days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(periodsQuery.data || []).length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePeriods.map((period) => (
                    <TableRow key={period.id} className={selectedPeriod?.id === period.id ? "bg-muted/30" : ""}>
                      <TableCell>
                        <button className="text-left font-medium" onClick={() => { setSelectedPeriodId(period.id); setLedgerPage(1); }}>
                          {formatDate(period.start_date)} - {formatDate(period.end_date)}
                        </button>
                      </TableCell>
                      <TableCell><StatusBadge status={period.status} /></TableCell>
                      <TableCell>{formatDateTime(period.generated_at)}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        {scope === "manage" ? (
                          <>
                            <Button size="sm" variant="outline" disabled={period.status === "locked" || recalculatePeriod.isPending} onClick={() => recalculatePeriod.mutate(period.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" /> Recalculate
                            </Button>
                            <Button size="sm" variant={period.status === "locked" ? "secondary" : "default"} disabled={lockPeriod.isPending} onClick={() => lockPeriod.mutate(period)}>
                              {period.status === "locked" ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                              {period.status === "locked" ? "Unlock" : "Lock"}
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No payroll periods" description="Attendance changes will create monthly periods automatically." />
            )}
            {periodRows.length > periodPageSize ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {periodPage} of {periodTotalPages} ({periodRows.length} periods)
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={periodPage <= 1} onClick={() => setPeriodPage((page) => Math.max(1, page - 1))}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={periodPage >= periodTotalPages} onClick={() => setPeriodPage((page) => page + 1)}>Next</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected period</CardTitle>
            <CardDescription>{selectedPeriod ? `${formatDate(selectedPeriod.start_date)} - ${formatDate(selectedPeriod.end_date)}` : "No period selected"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricCard label="Status" value={selectedPeriod?.status || "-"} icon={selectedPeriod?.status === "locked" ? Lock : Unlock} />
            <MetricCard label="Rows" value={periodQuery.data?.payrolls?.length || 0} icon={RefreshCw} />
          </CardContent>
        </Card>
      </div>

      {scope === "manage" ? (
        <Card>
          <CardHeader>
            <CardTitle>Employee ledger</CardTitle>
            <CardDescription>Only rows dated inside the selected period are shown here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={(value) => { setEmployeeId(value); setLedgerPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {(employeesQuery.data || []).map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>{employee.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MetricCard label="Stored total" value={formatCurrency(ledgerQuery.data?.total?.total_balance || 0)} icon={Save} />
            </div>

            {selectedEmployeeId ? (
              <>
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as LedgerTransactionPayload["type"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={form.transaction_date} onChange={(event) => setForm((current) => ({ ...current, transaction_date: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={!form.amount || saveTransaction.isPending} onClick={() => saveTransaction.mutate()}>
                    <Save className="mr-2 h-4 w-4" /> {form.id ? "Save changed row" : "Add row"}
                  </Button>
                  {form.id ? <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel edit</Button> : null}
                </div>

                {ledgerRows.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Running total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatLabel(row.type)}</TableCell>
                          <TableCell>{formatDateTime(row.date)}</TableCell>
                          <TableCell>{row.status ? <StatusBadge status={row.status} /> : "-"}</TableCell>
                          <TableCell>{row.description || "-"}</TableCell>
                          <TableCell>{formatCurrency(row.balance)}</TableCell>
                          <TableCell>{formatCurrency(row.running_total)}</TableCell>
                          <TableCell className="space-x-2 text-right">
                            {row.type !== "period" ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => editRow(row)}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteTransaction.mutate(row.source_id)}>Delete</Button>
                              </>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState title="No ledger rows" description="No period, payment, bonus, or deduction rows are dated inside this selected period." />
                )}
                {ledgerQuery.data?.total_pages ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Page {ledgerQuery.data.page} of {ledgerQuery.data.total_pages} ({ledgerQuery.data.total_records} rows)
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={ledgerPage <= 1} onClick={() => setLedgerPage((page) => Math.max(1, page - 1))}>Previous</Button>
                      <Button size="sm" variant="outline" disabled={ledgerPage >= ledgerQuery.data.total_pages} onClick={() => setLedgerPage((page) => page + 1)}>Next</Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState title="Select an employee" description="Choose an employee to view period, payment, bonus, and deduction rows." />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
