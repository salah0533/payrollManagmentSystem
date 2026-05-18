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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        description: t("homePage.attendanceRecorded"),
      });
      queryClient.setQueryData(["employee-home", "attendance", today], [result.attendance_day]);
      await queryClient.invalidateQueries({ queryKey: ["employee-home", "attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-home", "attendance-summary"] });
    },
    onError: (error) => {
      toast({
        title: t("homePage.attendanceActionFailed"),
        description: getErrorMessage(error, t("homePage.attendanceActionFailedDescription")),
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
        title={t("homePage.title")}
        description={t("homePage.description")}
        actions={<Button variant="outline" onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" />{t("common.logout")}</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("homePage.todayStatus")}
          value={<StatusBadge status={todayAttendance?.status || "pending"} />}
          icon={Clock3}
          hint={todayAttendance ? formatDate(todayAttendance.work_date) : autoAttendanceEnabled ? t("homePage.generatedAfterWorkday") : t("homePage.noRecordYet")}
        />
        <MetricCard
          label={t("homePage.monthlyTrackedDays")}
          value={monthlyAttendanceStats.daysTracked}
          icon={Clock3}
          tone="info"
          hint={formatMinutes(monthlyAttendanceStats.workedMinutes)}
        />
        <MetricCard
          label={t("homePage.unreadNotifications")}
          value={latestUnreadNotifications.length}
          icon={Bell}
          tone="warning"
          hint={t("homePage.notificationsHint")}
        />
        <MetricCard
          label={t("homePage.latestVacation")}
          value={<StatusBadge status={String(latestVacation?.vacation_status || "pending")} />}
          icon={Palmtree}
          tone="success"
          hint={latestVacation ? t("labels.range", { start: formatDate(latestVacation.start_date), end: formatDate(latestVacation.end_date) }) : t("homePage.noRequests")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.attendanceActions")}</CardTitle>
            <CardDescription>{t("homePage.attendanceActionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {autoAttendanceEnabled ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {t("homePage.autoAttendanceNotice")}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button disabled={autoAttendanceEnabled || actionState.checkInDisabled || attendanceAction.isPending} onClick={() => attendanceAction.mutate("check-in")}>
                {t("labels.code.check_in")}
              </Button>
              <Button
                variant="outline"
                disabled={autoAttendanceEnabled || actionState.breakStartDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("break-start")}
              >
                {t("labels.code.break_start")}
              </Button>
              <Button
                variant="outline"
                disabled={autoAttendanceEnabled || actionState.breakEndDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("break-end")}
              >
                {t("labels.code.break_end")}
              </Button>
              <Button
                variant="secondary"
                disabled={autoAttendanceEnabled || actionState.checkOutDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("check-out")}
              >
                {t("labels.code.check_out")}
              </Button>
            </div>

            {todayAttendance ? (
              <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("labels.code.check_in")}</p>
                  <p className="font-medium">{todayAttendance.check_in_time ? todayAttendance.check_in_time.slice(0, 5) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("homePage.break")}</p>
                  <p className="font-medium">
                    {todayAttendance.break_start_time ? todayAttendance.break_start_time.slice(0, 5) : "-"} /{" "}
                    {todayAttendance.break_end_time ? todayAttendance.break_end_time.slice(0, 5) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labels.code.check_out")}</p>
                  <p className="font-medium">{todayAttendance.check_out_time ? todayAttendance.check_out_time.slice(0, 5) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("homePage.worked")}</p>
                  <p className="font-medium">{formatMinutes(todayAttendance.actual_work_minutes)}</p>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t("homePage.noAttendanceYet")}
                description={
                  autoAttendanceEnabled
                    ? t("homePage.autoAttendanceEmpty")
                    : t("homePage.useButtonsToStart")
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.latestUnreadNotifications")}</CardTitle>
            <CardDescription>{t("homePage.latestUnreadNotificationsDescription")}</CardDescription>
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
              <EmptyState title={t("homePage.noUnreadNotifications")} description={t("homePage.caughtUp")} />
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await refreshUnreadNotificationCount();
                await queryClient.invalidateQueries({ queryKey: ["employee-home", "notifications"] });
              }}
            >
              {t("homePage.refreshNotifications")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.latestVacationRequest")}</CardTitle>
            <CardDescription>{t("homePage.latestVacationRequestDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {latestVacation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("labels.range", { start: formatDate(latestVacation.start_date), end: formatDate(latestVacation.end_date) })}</p>
                    <p className="text-sm text-muted-foreground">{t("common.type")}: {formatLabel(String(latestVacation.vacation_type))}</p>
                  </div>
                  <StatusBadge status={String(latestVacation.vacation_status)} />
                </div>
              </div>
            ) : (
              <EmptyState title={t("homePage.noVacationRequests")} description={t("homePage.noVacationRequestsDescription")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.payrollStatus")}</CardTitle>
            <CardDescription>{t("homePage.payrollStatusDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              {t("homePage.payrollPeriodNotice")}
            </div>
            <Select value={selectedPayrollPeriod} onValueChange={setSelectedPayrollPeriod}>
              <SelectTrigger>
                <SelectValue placeholder={payrollPeriodsQuery.isLoading ? t("paymentsPage.loadingPeriods") : t("paymentsPage.selectPeriod")} />
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
              {t("homePage.currentUserPeriod", {
                user: currentUser?.employee?.full_name || currentUser?.username,
                period:
                  payrollPeriodsQuery.data?.[0]?.name ||
                  formatDate(toIsoDate(addMonths(new Date(), 0))),
              })}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(selectedPayrollPeriod ? `/employee/payroll?period=${selectedPayrollPeriod}` : "/employee/payroll")}
            >
              {t("homePage.openPayroll")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
