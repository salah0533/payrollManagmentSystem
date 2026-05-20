import { Fragment, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { DollarSign, FileClock, Printer, ReceiptText, WalletCards } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate, formatLabel, formatMinutes, formatNumber } from "@/lib/format";
import { getCurrentLanguage, isRtlLanguage } from "@/lib/i18n";
import { employeeApi } from "@/services/employeeApi";
import { payrollApi } from "@/services/payrollApi";
import type { PayrollAdjustment, PayrollEmployeeHistoryItem } from "@/types/domain";

const PAGE_SIZE = 20;

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

type HistoryDetailItem = {
  id: string;
  group: "calculation" | "adjustment" | "summary" | "loading" | "empty";
  label: string;
  value: string;
  meta?: string;
};

const paymentHistoryLocalizedText = {
  fr: {
    printReport: "Imprimer le rapport",
    reportTitle: "Rapport d'historique de paie",
    reportDescription: "Historique de paie de la page actuelle pour l'employé sélectionné, avec les lignes de calcul enregistrées et les ajustements.",
    showDetails: "Afficher les détails",
    loadingDetails: "Chargement des détails d'ajustement enregistrés...",
    noBreakdown: "Aucune ligne de ventilation enregistrée pour cette ligne de paie.",
    detailSource: "Source",
    detailLabel: "Détail",
    detailNotes: "Notes",
    detailValue: "Valeur",
    detailsSource: "Détails",
    calculationSource: "Calcul",
    adjustmentSource: "Ajustement",
    summarySource: "Résumé",
    periodSummary: "Résumé de la ligne de paie",
    hide: "Masquer",
  },
  ar: {
    printReport: "طباعة التقرير",
    reportTitle: "تقرير سجل الرواتب",
    reportDescription: "سجل الرواتب للصفحة الحالية للموظف المحدد، مع سطور الحساب المحفوظة وصفوف التعديلات.",
    showDetails: "إظهار التفاصيل",
    loadingDetails: "جارٍ تحميل تفاصيل التعديلات المحفوظة...",
    noBreakdown: "لا توجد سطور تفصيل محفوظة لهذا السجل.",
    detailSource: "المصدر",
    detailLabel: "التفصيل",
    detailNotes: "ملاحظات",
    detailValue: "القيمة",
    detailsSource: "التفاصيل",
    calculationSource: "الحساب",
    adjustmentSource: "التعديل",
    summarySource: "الملخص",
    periodSummary: "ملخص سجل الرواتب",
    hide: "إخفاء",
  },
} as const;

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

function formatDetailValue(value: unknown, format: "minutes" | "number" | "currency") {
  const numericValue = Number(value ?? 0);
  if (format === "minutes") {
    return formatMinutes(numericValue);
  }
  if (format === "currency") {
    return formatCurrency(value as number | string);
  }
  return formatNumber(numericValue);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function PaymentHist() {
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const isRtl = isRtlLanguage(currentLanguage);
  const [searchParams, setSearchParams] = useSearchParams();
  const [employeeId, setEmployeeId] = useState(searchParams.get("employee") || "");
  const [expandedPayrollIds, setExpandedPayrollIds] = useState<number[]>([]);
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

  useEffect(() => {
    setExpandedPayrollIds([]);
  }, [employeeId, page]);

  const selectedEmployee = useMemo(
    () => (employeesQuery.data || []).find((employee) => employee.id === parsedEmployeeId) ?? null,
    [employeesQuery.data, parsedEmployeeId],
  );

  const rows = historyQuery.data?.items || [];
  const totalPages = historyQuery.data?.total_pages ?? 0;
  const pageItems = buildPageItems(page, totalPages);
  const rangeStart = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;

  const adjustmentQueries = useQueries({
    queries: rows.map((row) => ({
      queryKey: ["payroll", "adjustments", row.id],
      queryFn: () => payrollApi.listAdjustments(row.id),
      enabled: canLoadHistory,
    })),
  });

  const adjustmentsByPayrollId = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row, index) => [
          row.id,
          {
            items: (adjustmentQueries[index]?.data || []) as PayrollAdjustment[],
            isLoading: Boolean(adjustmentQueries[index]?.isLoading || adjustmentQueries[index]?.isFetching),
          },
        ]),
      ),
    [adjustmentQueries, rows],
  );

  const buildCalculationDetails = (row: PayrollEmployeeHistoryItem): HistoryDetailItem[] => {
    const snapshot = row.calculation_data_json || {};
    return calculationFields
      .filter((field) => Object.prototype.hasOwnProperty.call(snapshot, field.key) && snapshot[field.key] != null)
      .map((field) => ({
        id: `${row.id}-calculation-${field.key}`,
        group: "calculation" as const,
        label: t(field.labelKey),
        value: formatDetailValue(snapshot[field.key], field.format),
      }));
  };

  const buildSummaryFallbackDetails = (row: PayrollEmployeeHistoryItem): HistoryDetailItem[] => {
    const fallbackItems = [
      {
        key: "bonus",
        label: t("payrollPage.breakdown.bonus"),
        amount: row.bonus_amount,
      },
      {
        key: "attendance-deduction",
        label: t("payrollPage.breakdown.attendance_deduction"),
        amount: row.attendance_deduction_amount ?? row.deduction_amount ?? 0,
      },
      {
        key: "manual-deductions",
        label: t("payrollPage.breakdown.manual_deductions"),
        amount: row.manual_deduction_amount ?? 0,
      },
      {
        key: "late-penalty",
        label: t("payrollPage.breakdown.late_penalty"),
        amount: row.late_penalty_amount ?? row.late_deduction_amount ?? 0,
      },
      {
        key: "adjustment-total",
        label: t("payrollPage.breakdown.adjustment_total"),
        amount: row.adjustment_amount,
      },
    ];

    return fallbackItems
      .filter((item) => Number(item.amount || 0) !== 0)
      .map((item) => ({
        id: `${row.id}-summary-${item.key}`,
        group: "summary" as const,
        label: item.label,
        value: formatCurrency(item.amount),
      }));
  };

  const buildAdjustmentDetails = (row: PayrollEmployeeHistoryItem, adjustments: PayrollAdjustment[]): HistoryDetailItem[] =>
    adjustments.map((adjustment) => ({
      id: `${row.id}-adjustment-${adjustment.id}`,
      group: "adjustment" as const,
      label: formatLabel(adjustment.adjustment_type),
      value: formatCurrency(adjustment.amount),
      meta: adjustment.reason,
    }));

  const detailItemsByPayrollId = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => {
          const adjustmentState = adjustmentsByPayrollId[row.id];
          const adjustmentItems = adjustmentState?.items || [];
          const detailItems: HistoryDetailItem[] = [
            ...buildCalculationDetails(row),
            ...buildAdjustmentDetails(row, adjustmentItems),
          ];

          if (!adjustmentState?.isLoading && adjustmentItems.length === 0) {
            detailItems.push(...buildSummaryFallbackDetails(row));
          }

          if (adjustmentState?.isLoading) {
            detailItems.push({
              id: `${row.id}-loading`,
              group: "loading",
              label:
                paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.loadingDetails ||
                t("payrollHistoryPage.loadingDetails"),
              value: "",
            });
          }

          if (detailItems.length === 0) {
            detailItems.push({
              id: `${row.id}-empty`,
              group: "empty",
              label:
                paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.noBreakdown ||
                t("payrollHistoryPage.noBreakdown"),
              value: "",
            });
          }

          return [row.id, detailItems];
        }),
      ),
    [adjustmentsByPayrollId, currentLanguage, rows, t],
  );

  const handlePrintReport = () => {
    if (typeof window === "undefined" || !rows.length) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      return;
    }

    const localizedText = paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText];
    const getHistoryText = (
      key: keyof (typeof paymentHistoryLocalizedText)["fr"] | "status" | "employee" | "paidDate" | "net" | "payable" | "paid" | "rest" | "totalNet" | "totalPaid" | "totalRest" | "payrollCount" | "pageLabel" | "showingRecords",
      fallback: string,
    ) => {
      if (key in (localizedText || {})) {
        return localizedText?.[key as keyof typeof localizedText] || fallback;
      }
      if (key === "status") return t("common.status");
      if (key === "employee") return t("common.employee");
      if (key === "paidDate") return t("payrollHistoryPage.paidDate");
      if (key === "net") return t("payrollHistoryPage.net");
      if (key === "payable") return t("payrollHistoryPage.payable");
      if (key === "paid") return t("payrollHistoryPage.paid");
      if (key === "rest") return t("payrollHistoryPage.rest");
      if (key === "totalNet") return t("payrollHistoryPage.totalNet");
      if (key === "totalPaid") return t("payrollHistoryPage.totalPaid");
      if (key === "totalRest") return t("payrollHistoryPage.totalRest");
      if (key === "payrollCount") return t("payrollHistoryPage.payrollCount");
      if (key === "pageLabel") return t("payrollHistoryPage.pageLabel", { page, total: totalPages || 1 });
      if (key === "showingRecords") {
        return t("payrollHistoryPage.showingRecords", {
          start: rangeStart,
          end: rangeEnd,
          total: historyQuery.data?.total_records ?? rows.length,
        });
      }
      return fallback;
    };

    const detailRowsMarkup = rows
      .map((row) => {
        const detailItems = detailItemsByPayrollId[row.id] || [];
        const detailMarkup = detailItems
          .filter((item) => item.group !== "loading")
          .map(
            (item) => `
              <tr class="detail-row">
                <td>${escapeHtml(
                  item.group === "calculation"
                    ? getHistoryText("calculationSource", t("payrollHistoryPage.calculationSource"))
                    : item.group === "adjustment"
                      ? getHistoryText("adjustmentSource", t("payrollHistoryPage.adjustmentSource"))
                      : getHistoryText("summarySource", t("payrollHistoryPage.summarySource")),
                )}</td>
                <td>${escapeHtml(item.label)}</td>
                <td>${escapeHtml(item.meta || "")}</td>
                <td class="value-cell">${escapeHtml(item.value)}</td>
              </tr>
            `,
          )
          .join("");

        return `
          <section class="period-block">
            <div class="period-header">
              <div>
                <h3>${escapeHtml(row.period_name)}</h3>
                <p>${escapeHtml(`${formatDate(row.period_start_date)} - ${formatDate(row.period_end_date)}`)}</p>
              </div>
              <div class="period-meta">
                <p>${escapeHtml(getHistoryText("status", t("common.status")))}: ${escapeHtml(formatLabel(row.status))}</p>
                <p>${escapeHtml(getHistoryText("paidDate", t("payrollHistoryPage.paidDate")))}: ${escapeHtml(
                  row.paid_at ? formatDate(row.paid_at) : t("common.noRecord"),
                )}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>${escapeHtml(getHistoryText("detailSource", t("payrollHistoryPage.detailSource")))}</th>
                  <th>${escapeHtml(getHistoryText("detailLabel", t("payrollHistoryPage.detailLabel")))}</th>
                  <th>${escapeHtml(getHistoryText("detailNotes", t("payrollHistoryPage.detailNotes")))}</th>
                  <th>${escapeHtml(getHistoryText("detailValue", t("payrollHistoryPage.detailValue")))}</th>
                </tr>
              </thead>
              <tbody>
                <tr class="summary-row">
                  <td>${escapeHtml(getHistoryText("summarySource", t("payrollHistoryPage.summarySource")))}</td>
                  <td>${escapeHtml(getHistoryText("periodSummary", t("payrollHistoryPage.periodSummary")))}</td>
                  <td>${escapeHtml(`${getHistoryText("net", t("payrollHistoryPage.net"))}: ${formatCurrency(row.net_salary)} | ${getHistoryText("payable", t("payrollHistoryPage.payable"))}: ${formatCurrency(row.total_amount)} | ${getHistoryText("paid", t("payrollHistoryPage.paid"))}: ${formatCurrency(row.paid_amount)} | ${getHistoryText("rest", t("payrollHistoryPage.rest"))}: ${formatCurrency(row.balance_amount)}`)}</td>
                  <td class="value-cell">${escapeHtml(formatCurrency(row.net_salary))}</td>
                </tr>
                ${detailMarkup}
              </tbody>
            </table>
          </section>
        `;
      })
      .join("");

    const printTitle = `${getHistoryText("reportTitle", t("payrollHistoryPage.reportTitle"))} - ${selectedEmployee?.full_name || t("common.employee")}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${escapeHtml(currentLanguage)}" dir="${isRtl ? "rtl" : "ltr"}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(printTitle)}</title>
          <style>
            html { direction: ${isRtl ? "rtl" : "ltr"}; }
            body {
              font-family: Arial, "Segoe UI", Tahoma, sans-serif;
              margin: 24px;
              color: #0f172a;
              direction: ${isRtl ? "rtl" : "ltr"};
              text-align: start;
            }
            h1, h2, h3, p { margin: 0; }
            .header { margin-bottom: 24px; }
            .header h1 { font-size: 24px; margin-bottom: 8px; }
            .header-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
            .card { border: 1px solid #d4d4d8; border-radius: 12px; padding: 12px 14px; }
            .muted { color: #64748b; font-size: 12px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
            .period-block { margin-top: 24px; }
            .period-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
            .period-header h3 { font-size: 18px; margin-bottom: 4px; }
            .period-meta { text-align: end; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d4d4d8; padding: 8px 10px; text-align: start; vertical-align: top; }
            th { background: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
            .summary-row { background: #f8fafc; font-weight: 600; }
            .detail-row:nth-child(even) { background: #fcfcfd; }
            .value-cell { white-space: nowrap; font-weight: 600; text-align: end; }
            .summary-row td { text-align: start; }
            .summary-row .value-cell { text-align: end; }
            @media print {
              body { margin: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(getHistoryText("reportTitle", t("payrollHistoryPage.reportTitle")))}</h1>
            <p class="muted">${escapeHtml(getHistoryText("reportDescription", t("payrollHistoryPage.reportDescription")))}</p>
            <div class="header-grid">
              <div class="card">
                <p class="muted">${escapeHtml(getHistoryText("employee", t("common.employee")))}</p>
                <p>${escapeHtml(selectedEmployee?.full_name || t("common.noRecord"))}</p>
              </div>
              <div class="card">
                <p class="muted">${escapeHtml(getHistoryText("pageLabel", t("payrollHistoryPage.pageLabel", { page, total: totalPages || 1 })))}</p>
                <p>${escapeHtml(getHistoryText("showingRecords", t("payrollHistoryPage.showingRecords", { start: rangeStart, end: rangeEnd, total: historyQuery.data?.total_records ?? rows.length })))}</p>
              </div>
            </div>
            <div class="summary-grid">
              <div class="card">
                <p class="muted">${escapeHtml(getHistoryText("totalNet", t("payrollHistoryPage.totalNet")))}</p>
                <p>${escapeHtml(formatCurrency(historyQuery.data?.summary.net_salary_total || 0))}</p>
              </div>
              <div class="card">
                <p class="muted">${escapeHtml(getHistoryText("totalPaid", t("payrollHistoryPage.totalPaid")))}</p>
                <p>${escapeHtml(formatCurrency(historyQuery.data?.summary.paid_amount_total || 0))}</p>
              </div>
              <div class="card">
                <p class="muted">${escapeHtml(getHistoryText("totalRest", t("payrollHistoryPage.totalRest")))}</p>
                <p>${escapeHtml(formatCurrency(historyQuery.data?.summary.remaining_amount_total || 0))}</p>
              </div>
              <div class="card">
                <p class="muted">${escapeHtml(getHistoryText("payrollCount", t("payrollHistoryPage.payrollCount")))}</p>
                <p>${escapeHtml(String(historyQuery.data?.summary.payroll_count ?? rows.length))}</p>
              </div>
            </div>
          </div>
          ${detailRowsMarkup}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const togglePayrollDetails = (payrollId: number) => {
    setExpandedPayrollIds((current) =>
      current.includes(payrollId) ? current.filter((id) => id !== payrollId) : [...current, payrollId],
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("payrollHistoryPage.title")}
        description={t("payrollHistoryPage.description")}
        actions={
          rows.length ? (
            <Button variant="outline" onClick={handlePrintReport}>
              <Printer className="mr-2 h-4 w-4" />
              {paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.printReport || t("payrollHistoryPage.printReport")}
            </Button>
          ) : null
        }
      />

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
                      {rows.map((row) => {
                        const detailItems = detailItemsByPayrollId[row.id] || [];
                        const isExpanded = expandedPayrollIds.includes(row.id);
                        return (
                          <Fragment key={row.id}>
                            <TableRow
                              data-testid={`payroll-history-row-${row.id}`}
                              aria-expanded={isExpanded}
                              className="cursor-pointer transition-colors hover:bg-muted/30"
                              tabIndex={0}
                              onClick={() => togglePayrollDetails(row.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  togglePayrollDetails(row.id);
                                }
                              }}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{row.period_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    #{row.id} · {(isExpanded
                                      ? paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.hide || t("common.hide")
                                      : paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.showDetails || t("payrollHistoryPage.showDetails"))}
                                  </p>
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
                            {isExpanded && detailItems.map((item) => (
                              <TableRow key={item.id} className="bg-muted/15">
                                <TableCell colSpan={8} className="py-2">
                                  <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        {item.group === "calculation"
                                          ? paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.calculationSource || t("payrollHistoryPage.calculationSource")
                                          : item.group === "adjustment"
                                            ? paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.adjustmentSource || t("payrollHistoryPage.adjustmentSource")
                                            : item.group === "summary"
                                              ? paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.summarySource || t("payrollHistoryPage.summarySource")
                                              : paymentHistoryLocalizedText[currentLanguage as keyof typeof paymentHistoryLocalizedText]?.detailsSource || t("payrollHistoryPage.detailsSource")}
                                      </p>
                                      <p className="font-medium text-foreground">{item.label}</p>
                                      {item.meta ? <p className="text-sm text-muted-foreground">{item.meta}</p> : null}
                                    </div>
                                    {item.value ? (
                                      <div className="text-sm font-semibold text-foreground md:text-right">{item.value}</div>
                                    ) : null}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
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
