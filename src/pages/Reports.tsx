import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, formatLabel, toIsoDate } from "@/lib/format";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { payrollApi } from "@/services/payrollApi";
import { vacationApi } from "@/services/vacationApi";
import type { AttendanceDay, EmployeeLedgerRow, Vacation } from "@/types/domain";

type ReportKind = "payroll" | "attendance" | "vacation" | "company";

type AttendanceReportRow = {
  employee_id: number;
  employee_name: string;
  present: number;
  late: number;
  absent: number;
  vacation: number;
  sick_leave: number;
  weekly_off: number;
  holiday: number;
  incomplete: number;
  total_days: number;
  paid_minutes: number;
  unpaid_minutes: number;
  overtime_minutes: number;
};

type VacationReportRow = {
  employee_id: number;
  employee_name: string;
  start_date: string;
  end_date: string;
  vacation_type: string | number;
  vacation_status: string | number;
  is_paid?: boolean;
};

type CompanyReportSummary = {
  employee_count: number;
  payroll_rows: number;
  payroll_net_movement: number;
  period_rows: number;
  payment_rows: number;
  bonus_rows: number;
  deduction_rows: number;
  attendance_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  vacation_days: number;
  sick_days: number;
  incomplete_days: number;
  paid_minutes: number;
  unpaid_minutes: number;
  overtime_minutes: number;
  vacation_requests: number;
  approved_vacations: number;
  pending_vacations: number;
  rejected_vacations: number;
  cancelled_vacations: number;
};

function defaultStartDate() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultEndDate() {
  return toIsoDate(new Date());
}

function formatMinutesTotal(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

function yearsBetween(startDate: string, endDate: string) {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }
  return years;
}

function overlaps(startDate: string, endDate: string, rangeStart: string, rangeEnd: string) {
  return startDate <= rangeEnd && endDate >= rangeStart;
}

function normalizeVacationStatus(value: string | number) {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "0") return "pending";
  if (normalized === "1") return "approved";
  if (normalized === "2") return "cancelled";
  if (normalized === "3") return "rejected";
  return normalized;
}

async function fetchEmployeeLedgerRows(employeeId: number, startDate: string, endDate: string) {
  const firstPage = await payrollApi.getLedger(employeeId, {
    page: 1,
    pageSize: 100,
    startDate,
    endDate,
    sort: "desc",
  });
  const allRows = [...firstPage.items];
  for (let page = 2; page <= firstPage.total_pages; page += 1) {
    const nextPage = await payrollApi.getLedger(employeeId, {
      page,
      pageSize: 100,
      startDate,
      endDate,
      sort: "desc",
    });
    allRows.push(...nextPage.items);
  }
  return allRows;
}

function summarizeAttendance(days: AttendanceDay[], employeesById: Map<number, string>) {
  const grouped = new Map<number, AttendanceReportRow>();
  days.forEach((day) => {
    const row =
      grouped.get(day.employee_id) ||
      {
        employee_id: day.employee_id,
        employee_name: employeesById.get(day.employee_id) || `Employee #${day.employee_id}`,
        present: 0,
        late: 0,
        absent: 0,
        vacation: 0,
        sick_leave: 0,
        weekly_off: 0,
        holiday: 0,
        incomplete: 0,
        total_days: 0,
        paid_minutes: 0,
        unpaid_minutes: 0,
        overtime_minutes: 0,
      };
    row.total_days += 1;
    if (day.status === "present") row.present += 1;
    if (day.status === "late") row.late += 1;
    if (day.status === "absent") row.absent += 1;
    if (["paid_vacation", "unpaid_vacation"].includes(day.status)) row.vacation += 1;
    if (day.status === "sick_leave") row.sick_leave += 1;
    if (day.status === "weekly_off") row.weekly_off += 1;
    if (day.status === "holiday") row.holiday += 1;
    if (day.status === "incomplete") row.incomplete += 1;
    row.paid_minutes += day.normal_paid_minutes || 0;
    row.unpaid_minutes += day.unpaid_minutes || 0;
    row.overtime_minutes += day.overtime_minutes || 0;
    grouped.set(day.employee_id, row);
  });
  return [...grouped.values()].sort((left, right) => left.employee_name.localeCompare(right.employee_name));
}

function buildCompanySummary(payrollRows: EmployeeLedgerRow[], attendanceRows: AttendanceReportRow[], vacationRows: VacationReportRow[]): CompanyReportSummary {
  return {
    employee_count: new Set([
      ...payrollRows.map((row) => row.employee_id),
      ...attendanceRows.map((row) => row.employee_id),
      ...vacationRows.map((row) => row.employee_id),
    ]).size,
    payroll_rows: payrollRows.length,
    payroll_net_movement: payrollRows.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    period_rows: payrollRows.filter((row) => row.type === "period").length,
    payment_rows: payrollRows.filter((row) => row.type === "payment").length,
    bonus_rows: payrollRows.filter((row) => row.type === "bonus").length,
    deduction_rows: payrollRows.filter((row) => row.type === "deduction").length,
    attendance_days: attendanceRows.reduce((sum, row) => sum + row.total_days, 0),
    present_days: attendanceRows.reduce((sum, row) => sum + row.present, 0),
    late_days: attendanceRows.reduce((sum, row) => sum + row.late, 0),
    absent_days: attendanceRows.reduce((sum, row) => sum + row.absent, 0),
    vacation_days: attendanceRows.reduce((sum, row) => sum + row.vacation, 0),
    sick_days: attendanceRows.reduce((sum, row) => sum + row.sick_leave, 0),
    incomplete_days: attendanceRows.reduce((sum, row) => sum + row.incomplete, 0),
    paid_minutes: attendanceRows.reduce((sum, row) => sum + row.paid_minutes, 0),
    unpaid_minutes: attendanceRows.reduce((sum, row) => sum + row.unpaid_minutes, 0),
    overtime_minutes: attendanceRows.reduce((sum, row) => sum + row.overtime_minutes, 0),
    vacation_requests: vacationRows.length,
    approved_vacations: vacationRows.filter((row) => normalizeVacationStatus(row.vacation_status) === "approved").length,
    pending_vacations: vacationRows.filter((row) => normalizeVacationStatus(row.vacation_status) === "pending").length,
    rejected_vacations: vacationRows.filter((row) => normalizeVacationStatus(row.vacation_status) === "rejected").length,
    cancelled_vacations: vacationRows.filter((row) => normalizeVacationStatus(row.vacation_status) === "cancelled").length,
  };
}

function addReportHeader(
  doc: jsPDF,
  title: string,
  startDate: string,
  endDate: string,
  rowCount: number,
  subtitle: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  doc.setFillColor(16, 61, 58);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(t("reportsPage.pdf.interval", { start: formatDate(startDate), end: formatDate(endDate) }), 14, 21);
  doc.text(t("reportsPage.pdf.generated", { value: formatDateTime(new Date().toISOString()) }), 110, 21);
  doc.setTextColor(32, 36, 40);
  doc.setFontSize(11);
  doc.text(t("reportsPage.pdf.rows", { count: rowCount }), 14, 38);
  doc.text(subtitle, 14, 45);
}

function downloadPdf(
  kind: ReportKind,
  startDate: string,
  endDate: string,
  payrollRows: EmployeeLedgerRow[],
  attendanceRows: AttendanceReportRow[],
  vacationRows: VacationReportRow[],
  companySummary: CompanyReportSummary | null,
  employeeLabel: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const doc = new jsPDF({ orientation: kind === "attendance" ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const title =
    kind === "payroll"
      ? t("reportsPage.types.payroll")
      : kind === "attendance"
        ? t("reportsPage.types.attendance")
        : kind === "vacation"
          ? t("reportsPage.types.vacation")
          : t("reportsPage.types.company");
  const rowCount =
    kind === "payroll"
      ? payrollRows.length
      : kind === "attendance"
        ? attendanceRows.length
        : kind === "vacation"
          ? vacationRows.length
          : 1;
  const subtitle = kind === "company" ? t("reportsPage.companyScope") : employeeLabel;
  addReportHeader(doc, title, startDate, endDate, rowCount, subtitle, t);

  if (kind === "payroll") {
    const totalBalance = payrollRows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
    doc.text(t("reportsPage.pdf.netMovement", { value: formatCurrency(totalBalance) }), 14, 52);
    autoTable(doc, {
      startY: 57,
      head: [[
        t("reportsPage.columns.employee"),
        t("reportsPage.columns.type"),
        t("reportsPage.columns.date"),
        t("reportsPage.columns.status"),
        t("reportsPage.columns.description"),
        t("reportsPage.columns.balance"),
        t("reportsPage.columns.runningTotal"),
      ]],
      body: payrollRows.map((row) => [
        String((row.details as Record<string, unknown> | undefined)?.employee_name || `Employee #${row.employee_id}`),
        formatLabel(row.type),
        formatDateTime(row.date),
        row.status || "-",
        row.description || "-",
        formatCurrency(row.balance),
        formatCurrency(row.running_total),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [16, 61, 58] },
      alternateRowStyles: { fillColor: [244, 247, 246] },
      columnStyles: { 4: { cellWidth: 50 } },
    });
  } else if (kind === "attendance") {
    const presentDays = attendanceRows.reduce((sum, row) => sum + row.present, 0);
    const absentDays = attendanceRows.reduce((sum, row) => sum + row.absent, 0);
    doc.text(t("reportsPage.pdf.presentDays", { count: presentDays }), 14, 52);
    doc.text(t("reportsPage.pdf.absentDays", { count: absentDays }), 62, 52);
    autoTable(doc, {
      startY: 57,
      head: [[
        t("reportsPage.columns.employee"),
        t("reportsPage.columns.present"),
        t("reportsPage.columns.late"),
        t("reportsPage.columns.absent"),
        t("reportsPage.columns.vacation"),
        t("reportsPage.columns.sick"),
        t("reportsPage.columns.weeklyOff"),
        t("reportsPage.columns.holiday"),
        t("reportsPage.columns.incomplete"),
        t("reportsPage.columns.paidTime"),
        t("reportsPage.columns.unpaidTime"),
        t("reportsPage.columns.overtime"),
      ]],
      body: attendanceRows.map((row) => [
        row.employee_name,
        row.present,
        row.late,
        row.absent,
        row.vacation,
        row.sick_leave,
        row.weekly_off,
        row.holiday,
        row.incomplete,
        formatMinutesTotal(row.paid_minutes),
        formatMinutesTotal(row.unpaid_minutes),
        formatMinutesTotal(row.overtime_minutes),
      ]),
      styles: { fontSize: 8, cellPadding: 2.3 },
      headStyles: { fillColor: [16, 61, 58] },
      alternateRowStyles: { fillColor: [244, 247, 246] },
    });
  } else if (kind === "vacation") {
    const approvedCount = vacationRows.filter((row) => normalizeVacationStatus(row.vacation_status) === "approved").length;
    doc.text(t("reportsPage.pdf.approvedRequests", { count: approvedCount }), 14, 52);
    autoTable(doc, {
      startY: 57,
      head: [[
        t("reportsPage.columns.employee"),
        t("reportsPage.columns.start"),
        t("reportsPage.columns.end"),
        t("reportsPage.columns.type"),
        t("reportsPage.columns.status"),
        t("reportsPage.columns.paid"),
      ]],
      body: vacationRows.map((row) => [
        row.employee_name,
        formatDate(row.start_date),
        formatDate(row.end_date),
        formatLabel(String(row.vacation_type)),
        formatLabel(String(row.vacation_status)),
        row.is_paid ? t("common.yes") : t("common.no"),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [16, 61, 58] },
      alternateRowStyles: { fillColor: [244, 247, 246] },
    });
  } else if (companySummary) {
    autoTable(doc, {
      startY: 52,
      head: [[t("reportsPage.columns.metric"), t("reportsPage.columns.value")]],
      body: [
        [t("reportsPage.companyMetrics.employeeCount"), companySummary.employee_count],
        [t("reportsPage.companyMetrics.payrollRows"), companySummary.payroll_rows],
        [t("reportsPage.companyMetrics.payrollNetMovement"), formatCurrency(companySummary.payroll_net_movement)],
        [t("reportsPage.companyMetrics.periodRows"), companySummary.period_rows],
        [t("reportsPage.companyMetrics.paymentRows"), companySummary.payment_rows],
        [t("reportsPage.companyMetrics.bonusRows"), companySummary.bonus_rows],
        [t("reportsPage.companyMetrics.deductionRows"), companySummary.deduction_rows],
        [t("reportsPage.companyMetrics.attendanceDays"), companySummary.attendance_days],
        [t("reportsPage.companyMetrics.presentDays"), companySummary.present_days],
        [t("reportsPage.companyMetrics.lateDays"), companySummary.late_days],
        [t("reportsPage.companyMetrics.absentDays"), companySummary.absent_days],
        [t("reportsPage.companyMetrics.vacationDays"), companySummary.vacation_days],
        [t("reportsPage.companyMetrics.sickDays"), companySummary.sick_days],
        [t("reportsPage.companyMetrics.incompleteDays"), companySummary.incomplete_days],
        [t("reportsPage.companyMetrics.paidTime"), formatMinutesTotal(companySummary.paid_minutes)],
        [t("reportsPage.companyMetrics.unpaidTime"), formatMinutesTotal(companySummary.unpaid_minutes)],
        [t("reportsPage.companyMetrics.overtime"), formatMinutesTotal(companySummary.overtime_minutes)],
        [t("reportsPage.companyMetrics.vacationRequests"), companySummary.vacation_requests],
        [t("reportsPage.companyMetrics.approvedVacations"), companySummary.approved_vacations],
        [t("reportsPage.companyMetrics.pendingVacations"), companySummary.pending_vacations],
        [t("reportsPage.companyMetrics.rejectedVacations"), companySummary.rejected_vacations],
        [t("reportsPage.companyMetrics.cancelledVacations"), companySummary.cancelled_vacations],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 61, 58] },
      alternateRowStyles: { fillColor: [244, 247, 246] },
      columnStyles: { 0: { cellWidth: 88 }, 1: { cellWidth: 74 } },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setTextColor(110, 118, 125);
    doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 28, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`${t("reportsPage.filePrefix")}-${kind}-${startDate}-to-${endDate}.pdf`);
}

export default function Reports() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ReportKind>("payroll");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [payrollRows, setPayrollRows] = useState<EmployeeLedgerRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceReportRow[]>([]);
  const [vacationRows, setVacationRows] = useState<VacationReportRow[]>([]);
  const [companySummary, setCompanySummary] = useState<CompanyReportSummary | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["reports", "employees"],
    queryFn: () => employeeApi.list(),
  });

  const employeesById = useMemo(() => {
    const map = new Map<number, string>();
    (employeesQuery.data || []).forEach((employee) => map.set(employee.id, employee.full_name));
    return map;
  }, [employeesQuery.data]);

  const filteredEmployees = useMemo(() => {
    if (employeeFilter === "all") {
      return employeesQuery.data || [];
    }
    const id = Number(employeeFilter);
    return (employeesQuery.data || []).filter((employee) => employee.id === id);
  }, [employeeFilter, employeesQuery.data]);

  const employeeLabel =
    employeeFilter === "all"
      ? "All employees"
      : filteredEmployees[0]?.full_name || `Employee #${employeeFilter}`;

  const generateReport = useMutation({
    mutationFn: async () => {
      setPayrollRows([]);
      setAttendanceRows([]);
      setVacationRows([]);
      setCompanySummary(null);

      if (kind === "payroll") {
        const ledgers = await Promise.all(filteredEmployees.map((employee) => fetchEmployeeLedgerRows(employee.id, startDate, endDate)));
        const mergedRows = ledgers.flatMap((rows, index) =>
          rows.map((row) => ({
            ...row,
            description: row.description || filteredEmployees[index]?.full_name,
            details: {
              ...(row.details || {}),
              employee_name: filteredEmployees[index]?.full_name || `Employee #${row.employee_id}`,
            },
          })),
        );
        setPayrollRows(mergedRows);
        return;
      }

      if (kind === "attendance") {
        const days =
          employeeFilter === "all"
            ? await attendanceApi.listRange(startDate, endDate)
            : await attendanceApi.getEmployeeRange(Number(employeeFilter), startDate, endDate);
        setAttendanceRows(summarizeAttendance(days, employeesById));
        return;
      }

      const years = yearsBetween(startDate, endDate);
      const yearlyRows = await Promise.all(years.map((year) => vacationApi.listAll(year)));
      const intervalVacations = yearlyRows
        .flat()
        .filter((row: Vacation) => overlaps(row.start_date, row.end_date, startDate, endDate))
        .filter((row: Vacation) => employeeFilter === "all" || row.employee_id === Number(employeeFilter))
        .map((row) => ({
          employee_id: row.employee_id,
          employee_name: employeesById.get(row.employee_id) || `Employee #${row.employee_id}`,
          start_date: row.start_date,
          end_date: row.end_date,
          vacation_type: row.vacation_type,
          vacation_status: row.vacation_status,
          is_paid: row.is_paid,
        }))
        .sort((left, right) => right.start_date.localeCompare(left.start_date));

      if (kind === "vacation") {
        setVacationRows(intervalVacations);
        return;
      }

      const allAttendanceDays = await attendanceApi.listRange(startDate, endDate);
      const filteredAttendanceDays =
        employeeFilter === "all"
          ? allAttendanceDays
          : allAttendanceDays.filter((day) => day.employee_id === Number(employeeFilter));
      const summarizedAttendance = summarizeAttendance(filteredAttendanceDays, employeesById);
      const companyLedgerRows = (
        await Promise.all(filteredEmployees.map((employee) => fetchEmployeeLedgerRows(employee.id, startDate, endDate)))
      ).flatMap((rows, index) =>
        rows.map((row) => ({
          ...row,
          description: row.description || filteredEmployees[index]?.full_name,
          details: {
            ...(row.details || {}),
            employee_name: filteredEmployees[index]?.full_name || `Employee #${row.employee_id}`,
          },
        })),
      );
      setCompanySummary(buildCompanySummary(companyLedgerRows, summarizedAttendance, intervalVacations));
    },
  });

  const activeRows =
    kind === "payroll"
      ? payrollRows
      : kind === "attendance"
        ? attendanceRows
        : kind === "vacation"
          ? vacationRows
          : companySummary
            ? [companySummary]
            : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("reportsPage.title")} description={t("reportsPage.description")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("reportsPage.filtersTitle")}</CardTitle>
          <CardDescription>{t("reportsPage.filtersDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[16rem_16rem_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label>{t("reportsPage.reportLabel")}</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="payroll">{t("reportsPage.types.payroll")}</SelectItem>
                <SelectItem value="attendance">{t("reportsPage.types.attendance")}</SelectItem>
                <SelectItem value="vacation">{t("reportsPage.types.vacation")}</SelectItem>
                <SelectItem value="company">{t("reportsPage.types.company")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("reportsPage.employeeLabel")}</Label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter} disabled={kind === "company"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reportsPage.allEmployees")}</SelectItem>
                {(employeesQuery.data || []).map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("reportsPage.startDate")}</Label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t("reportsPage.endDate")}</Label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>

          <div className="flex items-end gap-2">
            <Button disabled={generateReport.isPending || employeesQuery.isLoading} onClick={() => generateReport.mutate()}>
              <Eye className="h-4 w-4" /> {t("reportsPage.preview")}
            </Button>
            <Button
              variant="outline"
              disabled={!activeRows.length}
              onClick={() => downloadPdf(kind, startDate, endDate, payrollRows, attendanceRows, vacationRows, companySummary, employeeLabel, t)}
            >
              <Download className="h-4 w-4" /> {t("reportsPage.downloadPdf")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label={t("reportsPage.rows")} value={activeRows.length} icon={FileText} />
        <MetricCard label={t("reportsPage.from")} value={formatDate(startDate)} icon={FileText} />
        <MetricCard label={t("reportsPage.to")} value={formatDate(endDate)} icon={FileText} />
      </div>

      <Tabs value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
        <TabsList>
          <TabsTrigger value="payroll">{t("reportsPage.tabs.payroll")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("reportsPage.tabs.attendance")}</TabsTrigger>
          <TabsTrigger value="vacation">{t("reportsPage.tabs.vacation")}</TabsTrigger>
          <TabsTrigger value="company">{t("reportsPage.tabs.company")}</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll">
          <Card>
            <CardHeader><CardTitle>{t("reportsPage.previews.payroll")}</CardTitle></CardHeader>
            <CardContent>
              {payrollRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reportsPage.columns.employee")}</TableHead>
                      <TableHead>{t("reportsPage.columns.type")}</TableHead>
                      <TableHead>{t("reportsPage.columns.date")}</TableHead>
                      <TableHead>{t("reportsPage.columns.status")}</TableHead>
                      <TableHead>{t("reportsPage.columns.description")}</TableHead>
                      <TableHead>{t("reportsPage.columns.balance")}</TableHead>
                      <TableHead>{t("reportsPage.columns.runningTotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((row) => (
                      <TableRow key={`${row.employee_id}-${row.id}`}>
                        <TableCell>{String((row.details as Record<string, unknown> | undefined)?.employee_name || `Employee #${row.employee_id}`)}</TableCell>
                        <TableCell>{formatLabel(row.type)}</TableCell>
                        <TableCell>{formatDateTime(row.date)}</TableCell>
                        <TableCell>{row.status || "-"}</TableCell>
                        <TableCell>{row.description || "-"}</TableCell>
                        <TableCell>{formatCurrency(row.balance)}</TableCell>
                        <TableCell>{formatCurrency(row.running_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t("reportsPage.empty.payrollTitle")} description={t("reportsPage.empty.payrollDescription")} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>{t("reportsPage.previews.attendance")}</CardTitle></CardHeader>
            <CardContent>
              {attendanceRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reportsPage.columns.employee")}</TableHead>
                      <TableHead>{t("reportsPage.columns.present")}</TableHead>
                      <TableHead>{t("reportsPage.columns.late")}</TableHead>
                      <TableHead>{t("reportsPage.columns.absent")}</TableHead>
                      <TableHead>{t("reportsPage.columns.vacation")}</TableHead>
                      <TableHead>{t("reportsPage.columns.sick")}</TableHead>
                      <TableHead>{t("reportsPage.columns.weeklyOff")}</TableHead>
                      <TableHead>{t("reportsPage.columns.holiday")}</TableHead>
                      <TableHead>{t("reportsPage.columns.incomplete")}</TableHead>
                      <TableHead>{t("reportsPage.columns.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRows.map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>{row.employee_name}</TableCell>
                        <TableCell>{row.present}</TableCell>
                        <TableCell>{row.late}</TableCell>
                        <TableCell>{row.absent}</TableCell>
                        <TableCell>{row.vacation}</TableCell>
                        <TableCell>{row.sick_leave}</TableCell>
                        <TableCell>{row.weekly_off}</TableCell>
                        <TableCell>{row.holiday}</TableCell>
                        <TableCell>{row.incomplete}</TableCell>
                        <TableCell>{row.total_days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t("reportsPage.empty.attendanceTitle")} description={t("reportsPage.empty.attendanceDescription")} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacation">
          <Card>
            <CardHeader><CardTitle>{t("reportsPage.previews.vacation")}</CardTitle></CardHeader>
            <CardContent>
              {vacationRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reportsPage.columns.employee")}</TableHead>
                      <TableHead>{t("reportsPage.columns.start")}</TableHead>
                      <TableHead>{t("reportsPage.columns.end")}</TableHead>
                      <TableHead>{t("reportsPage.columns.type")}</TableHead>
                      <TableHead>{t("reportsPage.columns.status")}</TableHead>
                      <TableHead>{t("reportsPage.columns.paid")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacationRows.map((row, index) => (
                      <TableRow key={`${row.employee_id}-${row.start_date}-${index}`}>
                        <TableCell>{row.employee_name}</TableCell>
                        <TableCell>{formatDate(row.start_date)}</TableCell>
                        <TableCell>{formatDate(row.end_date)}</TableCell>
                        <TableCell>{formatLabel(String(row.vacation_type))}</TableCell>
                        <TableCell>{formatLabel(String(row.vacation_status))}</TableCell>
                        <TableCell>{row.is_paid ? t("common.yes") : t("common.no")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t("reportsPage.empty.vacationTitle")} description={t("reportsPage.empty.vacationDescription")} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle>{t("reportsPage.previews.company")}</CardTitle></CardHeader>
            <CardContent>
              {companySummary ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label={t("reportsPage.companyMetrics.employeeCount")} value={companySummary.employee_count} icon={FileText} />
                  <MetricCard label={t("reportsPage.companyMetrics.payrollNetMovement")} value={formatCurrency(companySummary.payroll_net_movement)} icon={FileText} />
                  <MetricCard label={t("reportsPage.companyMetrics.attendanceDays")} value={companySummary.attendance_days} icon={FileText} />
                  <MetricCard label={t("reportsPage.companyMetrics.vacationRequests")} value={companySummary.vacation_requests} icon={FileText} />
                  <MetricCard label={t("reportsPage.companySummaries.presentLateAbsent")} value={`${companySummary.present_days} / ${companySummary.late_days} / ${companySummary.absent_days}`} icon={FileText} />
                  <MetricCard label={t("reportsPage.companySummaries.vacationSickIncomplete")} value={`${companySummary.vacation_days} / ${companySummary.sick_days} / ${companySummary.incomplete_days}`} icon={FileText} />
                  <MetricCard label={t("reportsPage.companySummaries.paidUnpaidTime")} value={`${formatMinutesTotal(companySummary.paid_minutes)} / ${formatMinutesTotal(companySummary.unpaid_minutes)}`} icon={FileText} />
                  <MetricCard label={t("reportsPage.companySummaries.approvedPendingVacations")} value={`${companySummary.approved_vacations} / ${companySummary.pending_vacations}`} icon={FileText} />
                </div>
              ) : (
                <EmptyState title={t("reportsPage.empty.companyTitle")} description={t("reportsPage.empty.companyDescription")} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
