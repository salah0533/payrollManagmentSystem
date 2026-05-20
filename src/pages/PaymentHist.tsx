import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, FileClock, ReceiptText, WalletCards } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { employeeApi } from "@/services/employeeApi";
import { payrollApi } from "@/services/payrollApi";

const PAGE_SIZE = 20;

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) {
    return [];
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const safePages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  safePages.forEach((page, index) => {
    if (index > 0 && page - safePages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

export default function PaymentHist() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employeeId, setEmployeeId] = useState(searchParams.get("employee") || "");
  const [page, setPage] = useState(() => {
    const rawValue = Number(searchParams.get("page") || "1");
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 1;
  });

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
  });

  useEffect(() => {
    if (employeeId || !employeesQuery.data?.length) {
      return;
    }
    setEmployeeId(String(employeesQuery.data[0].id));
  }, [employeeId, employeesQuery.data]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (employeeId) {
        next.set("employee", employeeId);
        next.set("page", String(page));
      } else {
        next.delete("employee");
        next.delete("page");
      }
      return next;
    }, { replace: true });
  }, [employeeId, page, setSearchParams]);

  const parsedEmployeeId = Number(employeeId);
  const canLoadHistory = Number.isFinite(parsedEmployeeId) && parsedEmployeeId > 0;

  const historyQuery = useQuery({
    queryKey: ["payroll", "employee-history", parsedEmployeeId, page, PAGE_SIZE],
    queryFn: () => payrollApi.getEmployeeHistory(parsedEmployeeId, page, PAGE_SIZE),
    enabled: canLoadHistory,
  });

  useEffect(() => {
    const totalPages = historyQuery.data?.total_pages ?? 0;
    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [historyQuery.data?.total_pages, page]);

  const selectedEmployee = useMemo(
    () => (employeesQuery.data || []).find((employee) => employee.id === parsedEmployeeId) ?? null,
    [employeesQuery.data, parsedEmployeeId],
  );

  const rows = historyQuery.data?.items || [];
  const totalPages = historyQuery.data?.total_pages ?? 0;
  const pageItems = buildPageItems(page, totalPages);
  const rangeStart = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("payrollHistoryPage.title")} description={t("payrollHistoryPage.description")} />

      <Card className="filter-card">
        <CardHeader>
          <CardTitle>{t("payrollHistoryPage.employeeFilterTitle")}</CardTitle>
          <CardDescription>{t("payrollHistoryPage.employeeFilterDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
          {(employeesQuery.data || []).length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("payrollHistoryPage.selectEmployee")}</p>
              <Select
                value={employeeId}
                onValueChange={(value) => {
                  setEmployeeId(value);
                  setPage(1);
                }}
              >
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
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {employeesQuery.isLoading ? t("payrollHistoryPage.loadingEmployees") : t("payrollHistoryPage.noEmployees")}
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-background p-4">
            {selectedEmployee ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("common.employee")}</p>
                  <p className="mt-1 text-lg font-semibold">{selectedEmployee.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position || t("common.noRecord")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={historyQuery.data?.employee_status || selectedEmployee.status} />
                  <div className="text-sm text-muted-foreground">#{selectedEmployee.id}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("payrollHistoryPage.selectEmployeeFirstDescription")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {!canLoadHistory ? (
        <EmptyState
          title={t("payrollHistoryPage.selectEmployeeFirst")}
          description={t("payrollHistoryPage.selectEmployeeFirstDescription")}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={t("payrollHistoryPage.totalNet")}
              value={formatCurrency(historyQuery.data?.summary.net_salary_total || 0)}
              icon={DollarSign}
              tone="success"
              hint={t("payrollHistoryPage.totalNetHint")}
            />
            <MetricCard
              label={t("payrollHistoryPage.totalPaid")}
              value={formatCurrency(historyQuery.data?.summary.paid_amount_total || 0)}
              icon={ReceiptText}
              tone="info"
              hint={t("payrollHistoryPage.totalPaidHint")}
            />
            <MetricCard
              label={t("payrollHistoryPage.totalRest")}
              value={formatCurrency(historyQuery.data?.summary.remaining_amount_total || 0)}
              icon={WalletCards}
              tone="warning"
              hint={t("payrollHistoryPage.totalRestHint")}
            />
            <MetricCard
              label={t("payrollHistoryPage.payrollCount")}
              value={historyQuery.data?.summary.payroll_count ?? 0}
              icon={FileClock}
              hint={t("payrollHistoryPage.payrollCountHint")}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("payrollHistoryPage.historyTitle")}</CardTitle>
              <CardDescription>
                {rows.length
                  ? t("payrollHistoryPage.showingRecords", {
                      start: rangeStart,
                      end: rangeEnd,
                      total: historyQuery.data?.total_records ?? 0,
                    })
                  : t("payrollHistoryPage.historyDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.length ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("payrollHistoryPage.period")}</TableHead>
                        <TableHead>{t("payrollHistoryPage.dateRange")}</TableHead>
                        <TableHead>{t("payrollHistoryPage.net")}</TableHead>
                        <TableHead>{t("payrollHistoryPage.payable")}</TableHead>
                        <TableHead>{t("payrollHistoryPage.paid")}</TableHead>
                        <TableHead>{t("payrollHistoryPage.rest")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("payrollHistoryPage.paidDate")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.period_name}</p>
                              <p className="text-xs text-muted-foreground">#{row.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(row.period_start_date)} - {formatDate(row.period_end_date)}</TableCell>
                          <TableCell>{formatCurrency(row.net_salary)}</TableCell>
                          <TableCell>{formatCurrency(row.total_amount)}</TableCell>
                          <TableCell>{formatCurrency(row.paid_amount)}</TableCell>
                          <TableCell>{formatCurrency(row.balance_amount)}</TableCell>
                          <TableCell><StatusBadge status={row.status} /></TableCell>
                          <TableCell>{row.paid_at ? formatDate(row.paid_at) : t("common.noRecord")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {totalPages > 1 ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t("payrollHistoryPage.pageLabel", { page, total: totalPages })}
                      </p>
                      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (page > 1) {
                                  setPage(page - 1);
                                }
                              }}
                              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          {pageItems.map((item, index) => (
                            <PaginationItem key={`${item}-${index}`}>
                              {item === "ellipsis" ? (
                                <PaginationEllipsis />
                              ) : (
                                <PaginationLink
                                  href="#"
                                  isActive={item === page}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    setPage(item);
                                  }}
                                >
                                  {item}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (page < totalPages) {
                                  setPage(page + 1);
                                }
                              }}
                              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  title={historyQuery.isLoading ? t("payrollHistoryPage.loadingHistory") : t("payrollHistoryPage.noHistory")}
                  description={t("payrollHistoryPage.noHistoryDescription")}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
