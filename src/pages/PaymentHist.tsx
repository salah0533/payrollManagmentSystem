import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Lock, RefreshCw, Unlock, WalletCards } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime, formatLabel } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { employeeApi } from "@/services/employeeApi";
import { payrollApi } from "@/services/payrollApi";

export default function PaymentHist() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
  });

  useEffect(() => {
    if (!employeeId && employeesQuery.data?.length) {
      setEmployeeId(String(employeesQuery.data[0].id));
      setPage(1);
    }
  }, [employeeId, employeesQuery.data]);

  const parsedEmployeeId = Number(employeeId);
  const ledgerQuery = useQuery({
    queryKey: ["payroll", "ledger", parsedEmployeeId, page],
    queryFn: () => payrollApi.getLedger(parsedEmployeeId, { page, pageSize: 20, sort: "desc" }),
    enabled: Number.isFinite(parsedEmployeeId) && parsedEmployeeId > 0,
  });

  const lockPeriod = useMutation({
    mutationFn: ({ periodId, locked }: { periodId: number; locked: boolean }) =>
      locked ? payrollApi.unlockPeriod(periodId) : payrollApi.lockPeriod(periodId),
    onSuccess: async (_, variables) => {
      toast({
        title: variables.locked ? t("paymentsPage.periodUnlocked") : t("paymentsPage.periodLocked"),
        description:
          variables.locked
            ? t("paymentsPage.periodUnlockedDescription")
            : t("paymentsPage.periodLockedDescription"),
      });
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) =>
      toast({
        title: t("paymentsPage.updatePeriodError"),
        description: getErrorMessage(error),
        variant: "destructive",
      }),
  });

  const recalculatePeriod = useMutation({
    mutationFn: (periodId: number) => payrollApi.recalculatePeriod(periodId),
    onSuccess: async () => {
      toast({
        title: t("paymentsPage.payrollRecalculated"),
        description: t("paymentsPage.payrollRecalculatedDescription"),
      });
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (error) =>
      toast({
        title: t("paymentsPage.recalculateError"),
        description: getErrorMessage(error),
        variant: "destructive",
      }),
  });

  const selectedEmployee = useMemo(
    () => (employeesQuery.data || []).find((employee) => employee.id === parsedEmployeeId) || null,
    [employeesQuery.data, parsedEmployeeId],
  );

  const rows = ledgerQuery.data?.items || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("payrollHistoryPage.title")} description={t("payrollHistoryPage.description")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("payrollHistoryPage.employeeFilterTitle")}</CardTitle>
          <CardDescription>{t("payrollHistoryPage.employeeFilterDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-2">
            <Select value={employeeId} onValueChange={(value) => { setEmployeeId(value); setPage(1); setExpandedRows({}); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("payrollHistoryPage.selectEmployee")} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {(employeesQuery.data || []).map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <MetricCard
            label={t("paymentsPage.storedTotal")}
            value={formatCurrency(ledgerQuery.data?.total?.total_balance || 0)}
            icon={WalletCards}
            hint={selectedEmployee?.full_name || ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("payrollHistoryPage.historyTitle")}</CardTitle>
          <CardDescription>{t("payrollHistoryPage.rowsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("paymentsPage.columns.type")}</TableHead>
                  <TableHead>{t("paymentsPage.columns.date")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("paymentsPage.columns.description")}</TableHead>
                  <TableHead>{t("paymentsPage.columns.balance")}</TableHead>
                  <TableHead>{t("paymentsPage.columns.runningTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isPeriod = row.type === "period";
                  const expanded = Boolean(expandedRows[row.id]);
                  const locked = row.status === "locked";
                  const periodId = Number(row.period_id || row.details?.payroll_period_id || 0);
                  return (
                    <Fragment key={row.id}>
                      <TableRow className={isPeriod ? "cursor-pointer" : ""} onClick={() => {
                        if (isPeriod) {
                          setExpandedRows((current) => ({ ...current, [row.id]: !current[row.id] }));
                        }
                      }}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isPeriod ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
                            {formatLabel(row.type)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(row.date)}</TableCell>
                        <TableCell>{row.status ? <StatusBadge status={row.status} /> : t("common.notAvailable")}</TableCell>
                        <TableCell>{row.description || t("common.notAvailable")}</TableCell>
                        <TableCell>{formatCurrency(row.balance)}</TableCell>
                        <TableCell>{formatCurrency(row.running_total)}</TableCell>
                      </TableRow>
                      {isPeriod && expanded ? (
                        <TableRow key={`${row.id}-details`}>
                          <TableCell colSpan={6}>
                            <div className="grid gap-4 rounded-md border bg-muted/20 p-4 md:grid-cols-[1fr_auto]">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">{t("payrollHistoryPage.grossSalary")}</p>
                                  <p className="font-medium">{formatCurrency(row.details?.gross_salary as string | number | undefined)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">{t("payrollHistoryPage.netSalary")}</p>
                                  <p className="font-medium">{formatCurrency(row.details?.net_salary as string | number | undefined)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">{t("payrollHistoryPage.attendanceDeduction")}</p>
                                  <p className="font-medium">{formatCurrency(row.details?.attendance_deduction_amount as string | number | undefined)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">{t("payrollHistoryPage.calculated")}</p>
                                  <p className="font-medium">{row.details?.calculated_at ? formatDateTime(String(row.details.calculated_at)) : t("common.notAvailable")}</p>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-4">
                                  <p className="text-xs text-muted-foreground">{t("payrollHistoryPage.issues")}</p>
                                  <p className="font-medium">{String(row.details?.needs_review_reason || t("payrollHistoryPage.noAttendanceIssues"))}</p>
                                </div>
                              </div>
                              {periodId ? (
                                <div className="flex flex-wrap items-start gap-2 md:justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={locked || recalculatePeriod.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      recalculatePeriod.mutate(periodId);
                                    }}
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" /> {t("paymentsPage.recalculate")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={locked ? "secondary" : "default"}
                                    disabled={lockPeriod.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      lockPeriod.mutate({ periodId, locked });
                                    }}
                                  >
                                    {locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                                    {locked ? t("paymentsPage.unlock") : t("paymentsPage.lock")}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={ledgerQuery.isLoading ? t("payrollHistoryPage.loadingHistory") : t("payrollHistoryPage.noHistory")}
              description={t("payrollHistoryPage.noHistoryDescription")}
            />
          )}
          {ledgerQuery.data?.total_pages ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t("payrollHistoryPage.pagination", {
                  page: ledgerQuery.data.page,
                  total: ledgerQuery.data.total_pages,
                  count: ledgerQuery.data.total_records,
                })}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{t("common.previous")}</Button>
                <Button size="sm" variant="outline" disabled={page >= ledgerQuery.data.total_pages} onClick={() => setPage((current) => current + 1)}>{t("common.next")}</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
