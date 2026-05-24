import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText } from "lucide-react";

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

type ReportKind = "payroll" | "attendance" | "vacation";

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

function defaultStartDate() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultEndDate() {
  return toIsoDate(new Date());
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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

export default function Reports() {
  const [kind, setKind] = useState<ReportKind>("payroll");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [payrollRows, setPayrollRows] = useState<EmployeeLedgerRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceReportRow[]>([]);
  const [vacationRows, setVacationRows] = useState<VacationReportRow[]>([]);

  const employeesQuery = useQuery({
    queryKey: ["reports", "employees"],
    queryFn: () => employeeApi.list(),
  });

  const employeesById = useMemo(() => {
    const map = new Map<number, string>();
    (employeesQuery.data || []).forEach((employee) => map.set(employee.id, employee.full_name));
    return map;
  }, [employeesQuery.data]);

  const generateReport = useMutation({
    mutationFn: async () => {
      if (kind === "payroll") {
        const employees = employeesQuery.data || [];
        const ledgers = await Promise.all(
          employees.map((employee) =>
            payrollApi.getLedger(employee.id, {
              page: 1,
              pageSize: 100,
              startDate,
              endDate,
              sort: "desc",
            }),
          ),
        );
        setPayrollRows(ledgers.flatMap((ledger) => ledger.items.map((row) => ({ ...row, description: row.description || ledger.employee_name }))));
        return;
      }

      if (kind === "attendance") {
        const days = await attendanceApi.listRange(startDate, endDate);
        const grouped = new Map<number, AttendanceReportRow>();
        days.forEach((day: AttendanceDay) => {
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
        setAttendanceRows([...grouped.values()].sort((left, right) => left.employee_name.localeCompare(right.employee_name)));
        return;
      }

      const years = yearsBetween(startDate, endDate);
      const yearlyRows = await Promise.all(years.map((year) => vacationApi.listAll(year)));
      const rows = yearlyRows
        .flat()
        .filter((row: Vacation) => overlaps(row.start_date, row.end_date, startDate, endDate))
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
      setVacationRows(rows);
    },
  });

  const activeRows = kind === "payroll" ? payrollRows : kind === "attendance" ? attendanceRows : vacationRows;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Reports" description="Preview payroll, attendance, and vacation reports before downloading them." />

      <Card>
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <CardDescription>Select a report type and interval, then generate the preview.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[16rem_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label>Report</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="payroll">Payroll report</SelectItem>
                <SelectItem value="attendance">Attendance report</SelectItem>
                <SelectItem value="vacation">Vacation report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button disabled={generateReport.isPending || employeesQuery.isLoading} onClick={() => generateReport.mutate()}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button variant="outline" disabled={!activeRows.length} onClick={() => downloadCsv(`${kind}-report-${startDate}-to-${endDate}.csv`, activeRows as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Rows" value={activeRows.length} icon={FileText} />
        <MetricCard label="From" value={formatDate(startDate)} icon={FileText} />
        <MetricCard label="To" value={formatDate(endDate)} icon={FileText} />
      </div>

      <Tabs value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
        <TabsList>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="vacation">Vacation</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll">
          <Card>
            <CardHeader><CardTitle>Payroll preview</CardTitle></CardHeader>
            <CardContent>
              {payrollRows.length ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Description</TableHead><TableHead>Balance</TableHead><TableHead>Running total</TableHead></TableRow></TableHeader>
                  <TableBody>{payrollRows.map((row) => <TableRow key={`${row.employee_id}-${row.id}`}><TableCell>{formatLabel(row.type)}</TableCell><TableCell>{formatDateTime(row.date)}</TableCell><TableCell>{row.status || "-"}</TableCell><TableCell>{row.description || "-"}</TableCell><TableCell>{formatCurrency(row.balance)}</TableCell><TableCell>{formatCurrency(row.running_total)}</TableCell></TableRow>)}</TableBody>
                </Table>
              ) : <EmptyState title="No payroll preview" description="Generate a payroll report to preview interval ledger rows." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Attendance preview</CardTitle></CardHeader>
            <CardContent>
              {attendanceRows.length ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Present</TableHead><TableHead>Late</TableHead><TableHead>Absent</TableHead><TableHead>Vacation</TableHead><TableHead>Sick</TableHead><TableHead>Weekly off</TableHead><TableHead>Holiday</TableHead><TableHead>Incomplete</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                  <TableBody>{attendanceRows.map((row) => <TableRow key={row.employee_id}><TableCell>{row.employee_name}</TableCell><TableCell>{row.present}</TableCell><TableCell>{row.late}</TableCell><TableCell>{row.absent}</TableCell><TableCell>{row.vacation}</TableCell><TableCell>{row.sick_leave}</TableCell><TableCell>{row.weekly_off}</TableCell><TableCell>{row.holiday}</TableCell><TableCell>{row.incomplete}</TableCell><TableCell>{row.total_days}</TableCell></TableRow>)}</TableBody>
                </Table>
              ) : <EmptyState title="No attendance preview" description="Generate an attendance report to preview employee period details." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacation">
          <Card>
            <CardHeader><CardTitle>Vacation preview</CardTitle></CardHeader>
            <CardContent>
              {vacationRows.length ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
                  <TableBody>{vacationRows.map((row, index) => <TableRow key={`${row.employee_id}-${row.start_date}-${index}`}><TableCell>{row.employee_name}</TableCell><TableCell>{formatDate(row.start_date)}</TableCell><TableCell>{formatDate(row.end_date)}</TableCell><TableCell>{formatLabel(String(row.vacation_type))}</TableCell><TableCell>{formatLabel(String(row.vacation_status))}</TableCell><TableCell>{row.is_paid ? "Yes" : "No"}</TableCell></TableRow>)}</TableBody>
                </Table>
              ) : <EmptyState title="No vacation preview" description="Generate a vacation report to preview interval requests." />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
