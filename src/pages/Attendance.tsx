import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, startOfMonth } from "date-fns";
import { CheckCircle2, RotateCcw } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatMinutes, formatTime, toIsoDate } from "@/lib/format";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { toast } from "@/hooks/use-toast";

export default function Attendance({ scope }: { scope: "manage" | "self" }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(toIsoDate(new Date()));
  const [range, setRange] = useState({
    start_date: toIsoDate(startOfMonth(new Date())),
    end_date: toIsoDate(endOfMonth(new Date())),
  });
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    employee_id: "",
    work_date: "",
    field_changed: "check_in_time",
    new_value: "",
    reason: "",
  });

  const employeesQuery = useQuery({
    queryKey: ["attendance", "employees"],
    queryFn: () => employeeApi.list(),
    enabled: scope === "manage",
  });

  const attendanceTypesQuery = useQuery({
    queryKey: ["attendance", "types"],
    queryFn: () => attendanceApi.getTypes(),
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

  const attendanceTypeMap = useMemo(
    () => Object.fromEntries((attendanceTypesQuery.data || []).map((item) => [item.id, item.attendence_type.toLowerCase().replace(/\s+/g, "_")])),
    [attendanceTypesQuery.data],
  );

  const filteredDailyRows = useMemo(() => {
    return (dailyAttendanceQuery.data || []).filter((row) => {
      const employee = employeeMap[row.employee_id];
      const type = attendanceTypeMap[row.attendence_type] || String(row.attendence_type);
      const employeeName = employee?.full_name || `Employee #${row.employee_id}`;
      const matchesSearch = employeeName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || type.includes(statusFilter.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [attendanceTypeMap, dailyAttendanceQuery.data, employeeMap, search, statusFilter]);

  const selfRows = useMemo(() => selfAttendanceQuery.data ?? [], [selfAttendanceQuery.data]);

  const manageStats = useMemo(() => {
    const rows = filteredDailyRows;
    const present = rows.filter((row) => (attendanceTypeMap[row.attendence_type] || "").includes("present")).length;
    const late = rows.filter((row) => (attendanceTypeMap[row.attendence_type] || "").includes("late")).length;
    const incomplete = rows.filter((row) => row.entry_time && !row.exit_time).length;
    const absent = rows.filter((row) => (attendanceTypeMap[row.attendence_type] || "").includes("absent")).length;
    return { present, late, incomplete, absent };
  }, [attendanceTypeMap, filteredDailyRows]);

  const selfStats = useMemo(() => {
    const worked = selfRows.reduce((sum, row) => sum + row.actual_work_minutes, 0);
    const lateDays = selfRows.filter((row) => row.late_minutes > 0).length;
    const missedCheckout = selfRows.filter((row) => row.check_in_time && !row.check_out_time).length;
    return { worked, lateDays, missedCheckout };
  }, [selfRows]);

  const refreshManageAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance", "manage"] });
  };

  const refreshSelfAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attendance", "self"] });
  };

  const markAllPresent = useMutation({
    mutationFn: () => attendanceApi.markAllPresent(),
    onSuccess: async (result) => {
      toast({
        title: "Attendance updated",
        description: `Created ${result.created || 0}, updated ${result.updated || 0} records.`,
      });
      await refreshManageAttendance();
    },
    onError: (error) => {
      toast({
        title: "Unable to mark attendance",
        description: getErrorMessage(error, "The backend rejected the mark-all-present request."),
        variant: "destructive",
      });
    },
  });

  const submitCorrection = useMutation({
    mutationFn: () =>
      attendanceApi.manualCorrection({
        employee_id: Number(correctionForm.employee_id),
        work_date: correctionForm.work_date,
        field_changed: correctionForm.field_changed,
        new_value: correctionForm.new_value,
        reason: correctionForm.reason,
      }),
    onSuccess: async () => {
      toast({ title: "Attendance corrected", description: "The correction request was accepted by the backend." });
      setCorrectionOpen(false);
      await refreshManageAttendance();
    },
    onError: (error) => {
      toast({
        title: "Unable to save correction",
        description: getErrorMessage(error, "Please review the correction details."),
        variant: "destructive",
      });
    },
  });

  const recalculateAttendance = useMutation({
    mutationFn: ({ employeeId, workDate }: { employeeId: number; workDate: string }) =>
      attendanceApi.recalculate(employeeId, workDate, workDate),
    onSuccess: async (result) => {
      toast({
        title: "Attendance recalculated",
        description: `Recalculated ${result.recalculated_days} day(s) for employee ${result.employee_id}.`,
      });
      await refreshManageAttendance();
      await refreshSelfAttendance();
    },
    onError: (error) => {
      toast({
        title: "Unable to recalculate attendance",
        description: getErrorMessage(error, "The backend rejected the recalculation request."),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={scope === "manage" ? "Attendance Management" : "My Attendance"}
        description={
          scope === "manage"
            ? "Review daily attendance, mark all present, investigate incomplete days, and submit corrections."
            : "Review your own attendance only through `/me/attendance`."
        }
        actions={
          scope === "manage" ? (
            <>
              <Input className="w-40" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              <Button variant="outline" onClick={() => markAllPresent.mutate()} disabled={markAllPresent.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {markAllPresent.isPending ? "Saving..." : "Mark all present"}
              </Button>
            </>
          ) : null
        }
      />

      {scope === "manage" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Present" value={manageStats.present} icon={CheckCircle2} tone="success" />
            <MetricCard label="Late" value={manageStats.late} icon={RotateCcw} tone="warning" />
            <MetricCard label="Incomplete" value={manageStats.incomplete} icon={RotateCcw} tone="info" />
            <MetricCard label="Absent" value={manageStats.absent} icon={RotateCcw} tone="danger" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search by employee and filter by attendance status keyword.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Search employee" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Input placeholder="Status filter: present, late, absent" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance list</CardTitle>
              <CardDescription>Loaded from `/attendance/emps/{date}` and enhanced with employee names from `/employee`.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDailyRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyRows.map((row) => {
                      const employee = employeeMap[row.employee_id];
                      const type = attendanceTypeMap[row.attendence_type] || String(row.attendence_type);
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{employee?.full_name || `Employee #${row.employee_id}`}</p>
                              <p className="text-xs text-muted-foreground">{employee?.position || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{formatTime(row.entry_time)}</TableCell>
                          <TableCell>{formatTime(row.exit_time)}</TableCell>
                          <TableCell><StatusBadge status={type} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCorrectionForm({
                                    employee_id: String(row.employee_id),
                                    work_date: row.date,
                                    field_changed: "check_in_time",
                                    new_value: "",
                                    reason: "",
                                  });
                                  setCorrectionOpen(true);
                                }}
                              >
                                Correct
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => recalculateAttendance.mutate({ employeeId: row.employee_id, workDate: row.date })}
                              >
                                Recalculate
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
                  title={dailyAttendanceQuery.isLoading ? "Loading attendance..." : "No attendance rows found"}
                  description="Try another date, or mark all present to generate the daily base records."
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Tracked days" value={selfRows.length} icon={CheckCircle2} tone="success" />
            <MetricCard label="Worked time" value={formatMinutes(selfStats.worked)} icon={RotateCcw} tone="info" />
            <MetricCard label="Late / incomplete" value={`${selfStats.lateDays} / ${selfStats.missedCheckout}`} icon={RotateCcw} tone="warning" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Date range</CardTitle>
              <CardDescription>The employee interface always loads attendance through `/me/attendance`.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input type="date" value={range.start_date} onChange={(event) => setRange((value) => ({ ...value, start_date: event.target.value }))} />
              <Input type="date" value={range.end_date} onChange={(event) => setRange((value) => ({ ...value, end_date: event.target.value }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance history</CardTitle>
            </CardHeader>
            <CardContent>
              {selfRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check in</TableHead>
                      <TableHead>Check out</TableHead>
                      <TableHead>Worked</TableHead>
                      <TableHead>Late</TableHead>
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
                  title={selfAttendanceQuery.isLoading ? "Loading your attendance..." : "No attendance records yet"}
                  description="Change the date range or use the self-service attendance actions from the employee home page."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attendance correction</DialogTitle>
            <DialogDescription>Submit a manual correction reason if the backend supports attendance corrections for this role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="correctionEmployee">Employee ID</Label>
              <Input id="correctionEmployee" value={correctionForm.employee_id} onChange={(event) => setCorrectionForm((value) => ({ ...value, employee_id: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionDate">Work date</Label>
              <Input id="correctionDate" type="date" value={correctionForm.work_date} onChange={(event) => setCorrectionForm((value) => ({ ...value, work_date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionField">Field changed</Label>
              <Input id="correctionField" value={correctionForm.field_changed} onChange={(event) => setCorrectionForm((value) => ({ ...value, field_changed: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionValue">New value</Label>
              <Input id="correctionValue" value={correctionForm.new_value} onChange={(event) => setCorrectionForm((value) => ({ ...value, new_value: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctionReason">Reason</Label>
              <Input id="correctionReason" value={correctionForm.reason} onChange={(event) => setCorrectionForm((value) => ({ ...value, reason: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => submitCorrection.mutate()} disabled={submitCorrection.isPending}>
              {submitCorrection.isPending ? "Saving..." : "Submit correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
