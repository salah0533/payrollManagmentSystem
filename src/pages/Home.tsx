import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Clock3, CreditCard, LogOut, Palmtree } from "lucide-react";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatDateTime, formatLabel, formatMinutes, toIsoDate } from "@/lib/format";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { notificationApi } from "@/services/notificationApi";
import { payrollApi } from "@/services/payrollApi";
import { vacationApi } from "@/services/vacationApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

function resolveAttendanceState(day?: { check_in_time?: string | null; break_start_time?: string | null; break_end_time?: string | null; check_out_time?: string | null }) {
  const checkedIn = Boolean(day?.check_in_time);
  const onBreak = Boolean(day?.break_start_time && !day?.break_end_time);
  const completed = Boolean(day?.check_out_time);

  return {
    checkInDisabled: checkedIn,
    breakStartDisabled: !checkedIn || onBreak || completed,
    breakEndDisabled: !onBreak || completed,
    checkOutDisabled: !checkedIn || onBreak || completed,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, refreshUnreadNotificationCount, logout } = useAuth();
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState("");
  const today = toIsoDate(new Date());
  const currentMonthStart = toIsoDate(startOfMonth(new Date()));
  const currentMonthEnd = toIsoDate(endOfMonth(new Date()));
  const employeeProfileQuery = useQuery({
    queryKey: ["employee-home", "profile"],
    queryFn: () => employeeApi.getMyProfile(),
    enabled: Boolean(currentUser?.employee_id),
  });

  const todayAttendanceQuery = useQuery({
    queryKey: ["employee-home", "attendance", today],
    queryFn: () => attendanceApi.selfList(today, today),
  });

  const vacationsQuery = useQuery({
    queryKey: ["employee-home", "vacations"],
    queryFn: () => vacationApi.listSelf(),
  });

  const notificationsQuery = useQuery({
    queryKey: ["employee-home", "notifications"],
    queryFn: () =>
      notificationApi.listMine({
        unread_only: true,
        archived: false,
        include_expired: false,
        limit: 5,
        offset: 0,
      }),
  });

  const monthAttendanceQuery = useQuery({
    queryKey: ["employee-home", "attendance-summary", currentMonthStart, currentMonthEnd],
    queryFn: () => attendanceApi.selfList(currentMonthStart, currentMonthEnd),
  });

  const payrollPeriodsQuery = useQuery({
    queryKey: ["employee-home", "payroll-periods"],
    queryFn: () => payrollApi.listSelfPeriods(),
  });

  useEffect(() => {
    if (selectedPayrollPeriod || !payrollPeriodsQuery.data?.length) {
      return;
    }
    setSelectedPayrollPeriod(String(payrollPeriodsQuery.data[0].id));
  }, [payrollPeriodsQuery.data, selectedPayrollPeriod]);

  const attendanceAction = useMutation({
    mutationFn: (action: "check-in" | "break-start" | "break-end" | "check-out") => attendanceApi.selfAction(action, {}),
    onSuccess: async (result, action) => {
      toast({
        title: formatLabel(action),
        description: "Attendance event recorded successfully.",
      });
      queryClient.setQueryData(["employee-home", "attendance", today], [result.attendance_day]);
      await queryClient.invalidateQueries({ queryKey: ["employee-home", "attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-home", "attendance-summary"] });
    },
    onError: (error) => {
      toast({
        title: "Attendance action failed",
        description: getErrorMessage(error, "The backend rejected this action."),
        variant: "destructive",
      });
    },
  });

  const todayAttendance = todayAttendanceQuery.data?.[0];
  const autoAttendanceEnabled = Boolean(employeeProfileQuery.data?.auto_attendance_enabled);
  const actionState = resolveAttendanceState(todayAttendance);
  const latestVacation = useMemo(() => {
    const items = vacationsQuery.data || [];
    return [...items].sort((left, right) => right.start_date.localeCompare(left.start_date))[0];
  }, [vacationsQuery.data]);
  const latestUnreadNotifications = notificationsQuery.data?.items || [];
  const monthlyAttendanceStats = useMemo(() => {
    const days = monthAttendanceQuery.data || [];
    const workedMinutes = days.reduce((total, day) => total + day.actual_work_minutes, 0);
    const lateDays = days.filter((day) => day.late_minutes > 0).length;
    return {
      workedMinutes,
      daysTracked: days.length,
      lateDays,
    };
  }, [monthAttendanceQuery.data]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Employee Home"
        description="A simple self-service space for your attendance, notifications, payroll, and vacations."
        actions={<Button variant="outline" onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" />Logout</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today's status"
          value={<StatusBadge status={todayAttendance?.status || "pending"} />}
          icon={Clock3}
          hint={todayAttendance ? formatDate(todayAttendance.work_date) : autoAttendanceEnabled ? "Generated after the scheduled workday ends" : "No record yet"}
        />
        <MetricCard
          label="Monthly tracked days"
          value={monthlyAttendanceStats.daysTracked}
          icon={Clock3}
          tone="info"
          hint={formatMinutes(monthlyAttendanceStats.workedMinutes)}
        />
        <MetricCard
          label="Unread notifications"
          value={latestUnreadNotifications.length}
          icon={Bell}
          tone="warning"
          hint="Refreshed from /me/notifications"
        />
        <MetricCard
          label="Latest vacation"
          value={<StatusBadge status={String(latestVacation?.vacation_status || "pending")} />}
          icon={Palmtree}
          tone="success"
          hint={latestVacation ? `${formatDate(latestVacation.start_date)} to ${formatDate(latestVacation.end_date)}` : "No requests"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Attendance actions</CardTitle>
            <CardDescription>These actions always use `/me/attendance/*` endpoints and never send an `employee_id`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {autoAttendanceEnabled ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Attendance is generated automatically after your scheduled workday ends. Self-service check-in, break, and check-out actions are disabled while auto attendance is enabled.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button disabled={autoAttendanceEnabled || actionState.checkInDisabled || attendanceAction.isPending} onClick={() => attendanceAction.mutate("check-in")}>
                Check In
              </Button>
              <Button
                variant="outline"
                disabled={autoAttendanceEnabled || actionState.breakStartDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("break-start")}
              >
                Break Start
              </Button>
              <Button
                variant="outline"
                disabled={autoAttendanceEnabled || actionState.breakEndDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("break-end")}
              >
                Break End
              </Button>
              <Button
                variant="secondary"
                disabled={autoAttendanceEnabled || actionState.checkOutDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("check-out")}
              >
                Check Out
              </Button>
            </div>

            {todayAttendance ? (
              <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Check in</p>
                  <p className="font-medium">{todayAttendance.check_in_time ? todayAttendance.check_in_time.slice(0, 5) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Break</p>
                  <p className="font-medium">
                    {todayAttendance.break_start_time ? todayAttendance.break_start_time.slice(0, 5) : "-"} /{" "}
                    {todayAttendance.break_end_time ? todayAttendance.break_end_time.slice(0, 5) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check out</p>
                  <p className="font-medium">{todayAttendance.check_out_time ? todayAttendance.check_out_time.slice(0, 5) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Worked</p>
                  <p className="font-medium">{formatMinutes(todayAttendance.actual_work_minutes)}</p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No attendance recorded yet"
                description={
                  autoAttendanceEnabled
                    ? "Attendance will appear automatically after your scheduled workday ends."
                    : "Use the buttons above to start your workday."
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest unread notifications</CardTitle>
            <CardDescription>Unread count is refreshed after notification actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestUnreadNotifications.length ? (
              latestUnreadNotifications.map((notification) => (
                <div key={notification.notification_id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{notification.title}</p>
                    <StatusBadge status={notification.priority} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No unread notifications" description="You're all caught up." />
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await refreshUnreadNotificationCount();
                await queryClient.invalidateQueries({ queryKey: ["employee-home", "notifications"] });
              }}
            >
              Refresh notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest vacation request</CardTitle>
            <CardDescription>Your own vacation history from `/me/vacations`.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestVacation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formatDate(latestVacation.start_date)} to {formatDate(latestVacation.end_date)}</p>
                    <p className="text-sm text-muted-foreground">Type: {formatLabel(String(latestVacation.vacation_type))}</p>
                  </div>
                  <StatusBadge status={String(latestVacation.vacation_status)} />
                </div>
              </div>
            ) : (
              <EmptyState title="No vacation requests yet" description="Request time off from the vacations page when you need it." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll status</CardTitle>
            <CardDescription>Select a payroll period to open your payroll page with the right period already chosen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              Payroll is organized by period, which means each salary run belongs to a specific month or payroll cycle.
            </div>
            <Select value={selectedPayrollPeriod} onValueChange={setSelectedPayrollPeriod}>
              <SelectTrigger>
                <SelectValue placeholder={payrollPeriodsQuery.isLoading ? "Loading payroll periods..." : "Select payroll period"} />
              </SelectTrigger>
              <SelectContent>
                {(payrollPeriodsQuery.data || []).map((period) => (
                  <SelectItem key={period.id} value={String(period.id)}>
                    {period.name} ({formatDate(period.start_date)} to {formatDate(period.end_date)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current user: {currentUser?.employee?.full_name || currentUser?.username}. Latest period: {payrollPeriodsQuery.data?.[0]?.name || formatDate(toIsoDate(addMonths(new Date(), 0)))}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(selectedPayrollPeriod ? `/employee/payroll?period=${selectedPayrollPeriod}` : "/employee/payroll")}
            >
              Open payroll
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
