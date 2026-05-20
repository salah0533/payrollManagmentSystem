import { useEffect, useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LogOut,
  Palmtree,
  RefreshCw,
  TimerReset,
  UserRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  DashboardEmptyState,
  DashboardHero,
  DashboardQuickAction,
  DashboardSection,
  DashboardStatCard,
  InsightRow,
} from "@/components/dashboard/DashboardPrimitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime, formatLabel, formatMinutes, toIsoDate } from "@/lib/format";
import { attendanceApi } from "@/services/attendanceApi";
import { employeeApi } from "@/services/employeeApi";
import { notificationApi } from "@/services/notificationApi";
import { payrollApi } from "@/services/payrollApi";
import { vacationApi } from "@/services/vacationApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import type { AttendanceDay, PayrollPeriod, Vacation } from "@/types/domain";

const VACATION_STATUS_BY_ID: Record<string, string> = {
  "0": "pending",
  "1": "approved",
  "2": "cancelled",
  "3": "rejected",
};

const VACATION_TYPE_BY_ID: Record<string, string> = {
  "0": "paid_vacation",
  "1": "unpaid_vacation",
  "2": "sick_leave",
  "3": "emergency",
  "4": "holiday",
};

function resolveAttendanceState(day?: {
  check_in_time?: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  check_out_time?: string | null;
}) {
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

function normalizeVacationStatus(value?: number | string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VACATION_STATUS_BY_ID[normalized] || normalized || "pending";
}

function normalizeVacationType(value?: number | string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VACATION_TYPE_BY_ID[normalized] || normalized || "vacation";
}

function toNumber(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function newestPayrollPeriod(periods: PayrollPeriod[]) {
  return [...periods].sort((left, right) => new Date(right.end_date).getTime() - new Date(left.end_date).getTime())[0];
}

function AttendanceMiniChart({ days }: { days: AttendanceDay[] }) {
  const { t } = useTranslation();
  const orderedDays = [...days].sort((left, right) => left.work_date.localeCompare(right.work_date)).slice(-14);
  const maxMinutes = Math.max(...orderedDays.map((day) => day.actual_work_minutes || day.normal_paid_minutes || 0), 60);

  if (!orderedDays.length) {
    return <DashboardEmptyState title={t("homePage.noAttendanceChartData")} description={t("homePage.noAttendanceChartDataDescription")} compact />;
  }

  return (
    <div className="rounded-[1.15rem] border border-border/70 bg-muted/20 p-4">
      <div className="flex h-44 items-end gap-2">
        {orderedDays.map((day) => {
          const minutes = day.actual_work_minutes || day.normal_paid_minutes || 0;
          const height = Math.max(12, Math.round((minutes / maxMinutes) * 100));
          const tone =
            day.status === "late"
              ? "bg-warning"
              : day.status === "absent" || day.status === "incomplete"
                ? "bg-destructive"
                : day.status === "paid_vacation" || day.status === "sick_leave"
                  ? "bg-info"
                  : "bg-success";

          return (
            <div key={day.id || day.work_date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-32 w-full items-end rounded-full bg-card/80 px-1.5">
                <div
                  className={`w-full rounded-full ${tone} shadow-sm`}
                  style={{ height: `${height}%` }}
                  title={`${formatDate(day.work_date)}: ${formatLabel(day.status)}`}
                />
              </div>
              <span className="max-w-full truncate text-[0.65rem] text-muted-foreground">{formatDate(day.work_date, "d")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, permissions, refreshUnreadNotificationCount, logout } = useAuth();
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState("");
  const today = toIsoDate(new Date());
  const currentMonthStart = toIsoDate(startOfMonth(new Date()));
  const currentMonthEnd = toIsoDate(endOfMonth(new Date()));

  const authPermissions = permissions ?? currentUser?.permissions ?? [];
  const canReadAttendance = authPermissions.includes("attendance.read_own");
  const canUseSelfAttendance = authPermissions.includes("attendance.check_in_own");
  const canReadVacations = authPermissions.includes("vacations.read_own");
  const canRequestVacation = authPermissions.includes("vacations.request_own");
  const canReadPayroll = authPermissions.includes("payroll.read_own");
  const canReadNotifications = authPermissions.includes("notifications.read_own");

  const employeeProfileQuery = useQuery({
    queryKey: ["employee-home", "profile"],
    queryFn: () => employeeApi.getMyProfile(),
    enabled: Boolean(currentUser?.employee_id),
  });

  const todayAttendanceQuery = useQuery({
    queryKey: ["employee-home", "attendance", today],
    queryFn: () => attendanceApi.selfList(today, today),
    enabled: canReadAttendance,
  });

  const vacationsQuery = useQuery({
    queryKey: ["employee-home", "vacations"],
    queryFn: () => vacationApi.listSelf(),
    enabled: canReadVacations,
  });

  const vacationBalanceQuery = useQuery({
    queryKey: ["employee-home", "vacation-balance"],
    queryFn: () => vacationApi.getMyBalance(),
    enabled: canReadVacations,
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
    enabled: canReadNotifications,
  });

  const monthAttendanceQuery = useQuery({
    queryKey: ["employee-home", "attendance-summary", currentMonthStart, currentMonthEnd],
    queryFn: () => attendanceApi.selfList(currentMonthStart, currentMonthEnd),
    enabled: canReadAttendance,
  });

  const payrollPeriodsQuery = useQuery({
    queryKey: ["employee-home", "payroll-periods"],
    queryFn: () => payrollApi.listSelfPeriods(),
    enabled: canReadPayroll,
  });

  const latestPayrollPeriod = useMemo(() => newestPayrollPeriod(payrollPeriodsQuery.data || []), [payrollPeriodsQuery.data]);

  useEffect(() => {
    if (selectedPayrollPeriod || !latestPayrollPeriod?.id) {
      return;
    }
    setSelectedPayrollPeriod(String(latestPayrollPeriod.id));
  }, [latestPayrollPeriod?.id, selectedPayrollPeriod]);

  const selectedPayrollQuery = useQuery({
    queryKey: ["employee-home", "payroll", selectedPayrollPeriod],
    queryFn: () => payrollApi.getSelfPayroll(Number(selectedPayrollPeriod)),
    enabled: canReadPayroll && Boolean(selectedPayrollPeriod),
  });

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
  const vacations = useMemo(() => vacationsQuery.data || [], [vacationsQuery.data]);
  const latestVacation = useMemo(() => {
    return [...vacations].sort((left, right) => right.start_date.localeCompare(left.start_date))[0];
  }, [vacations]);
  const upcomingVacation = useMemo(() => {
    return [...vacations]
      .filter((vacation) => vacation.start_date >= today && ["pending", "approved"].includes(normalizeVacationStatus(vacation.vacation_status)))
      .sort((left, right) => left.start_date.localeCompare(right.start_date))[0];
  }, [today, vacations]);
  const latestUnreadNotifications = notificationsQuery.data?.items || [];
  const monthlyAttendanceStats = useMemo(() => {
    const days = monthAttendanceQuery.data || [];
    const workedMinutes = days.reduce((total, day) => total + day.actual_work_minutes, 0);
    const paidMinutes = days.reduce((total, day) => total + day.normal_paid_minutes, 0);
    const unpaidMinutes = days.reduce((total, day) => total + day.unpaid_minutes, 0);
    const lateDays = days.filter((day) => day.late_minutes > 0 || day.status === "late").length;
    const absentDays = days.filter((day) => day.status === "absent").length;
    return {
      workedMinutes,
      paidMinutes,
      unpaidMinutes,
      daysTracked: days.length,
      lateDays,
      absentDays,
    };
  }, [monthAttendanceQuery.data]);

  const vacationBalance = vacationBalanceQuery.data?.current_year_balance;
  const selectedPayroll = selectedPayrollQuery.data;
  const displayName = employeeProfileQuery.data?.full_name || currentUser?.employee?.full_name || currentUser?.username || t("role.employee");

  const quickActions = [
    {
      to: "/employee/attendance",
      icon: Clock3,
      label: t("quickActions.myAttendance"),
      description: t("quickActions.myAttendanceDescription"),
      tone: "info" as const,
      show: canReadAttendance,
    },
    {
      to: "/employee/vacations",
      icon: Palmtree,
      label: canRequestVacation ? t("quickActions.requestVacation") : t("quickActions.viewVacations"),
      description: canRequestVacation ? t("quickActions.requestVacationDescription") : t("quickActions.viewVacationsDescription"),
      tone: "success" as const,
      show: canReadVacations,
    },
    {
      to: selectedPayrollPeriod ? `/employee/payroll?period=${selectedPayrollPeriod}` : "/employee/payroll",
      icon: CreditCard,
      label: t("quickActions.viewPayroll"),
      description: t("quickActions.viewPayrollDescription"),
      tone: "warning" as const,
      show: canReadPayroll,
    },
    {
      to: "/employee/notifications",
      icon: Bell,
      label: t("quickActions.viewNotifications"),
      description: t("quickActions.viewNotificationsDescription"),
      tone: "default" as const,
      show: canReadNotifications,
    },
    {
      to: "/employee/profile",
      icon: UserRound,
      label: t("quickActions.updateProfile"),
      description: t("quickActions.updateProfileDescription"),
      tone: "info" as const,
      show: true,
    },
  ].filter((action) => action.show);

  return (
    <div className="space-y-8 animate-fade-in">
      <DashboardHero
        kicker={t("homePage.kicker")}
        title={t("homePage.title")}
        description={t("homePage.description", { name: displayName })}
        meta={[
          { label: t("dashboard.period"), value: formatDate(today) },
          { label: t("homePage.employee"), value: displayName },
        ]}
      >
        <div className="rounded-[1.15rem] border border-white/15 bg-white/10 p-4">
          <p className="text-sm font-semibold text-primary-foreground/72">{t("homePage.todayStatus")}</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-semibold">{todayAttendance?.status ? formatLabel(todayAttendance.status) : t("homePage.noRecordYet")}</p>
              <p className="mt-1 text-xs text-primary-foreground/60">
                {todayAttendance ? formatMinutes(todayAttendance.actual_work_minutes) : autoAttendanceEnabled ? t("homePage.generatedAfterWorkday") : t("homePage.noRecordYet")}
              </p>
            </div>
            <Button variant="outline" className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/15" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </DashboardHero>

      <section className="space-y-4">
        <DashboardSection title={t("dashboard.overview")} description={t("homePage.overviewDescription")} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label={t("homePage.todayStatus")}
            value={<StatusBadge status={todayAttendance?.status || "pending"} />}
            icon={Clock3}
            tone={todayAttendance?.status === "present" ? "success" : todayAttendance?.status === "late" ? "warning" : "default"}
            description={todayAttendance ? formatDate(todayAttendance.work_date) : autoAttendanceEnabled ? t("homePage.generatedAfterWorkday") : t("homePage.noRecordYet")}
            isLoading={todayAttendanceQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.monthlyTrackedDays")}
            value={monthlyAttendanceStats.daysTracked}
            icon={CalendarClock}
            tone="info"
            description={formatMinutes(monthlyAttendanceStats.workedMinutes)}
            isLoading={monthAttendanceQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.lateAbsentSummary")}
            value={`${monthlyAttendanceStats.lateDays} / ${monthlyAttendanceStats.absentDays}`}
            icon={TimerReset}
            tone={monthlyAttendanceStats.lateDays || monthlyAttendanceStats.absentDays ? "warning" : "success"}
            description={t("homePage.lateAbsentSummaryDescription")}
            isLoading={monthAttendanceQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.vacationBalance")}
            value={vacationBalance ? vacationBalance.available_days : "-"}
            icon={Palmtree}
            tone="success"
            description={vacationBalance ? t("homePage.vacationBalanceDescription", { pending: vacationBalance.pending_request_days }) : t("homePage.vacationBalanceUnavailable")}
            isLoading={vacationBalanceQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.payrollStatus")}
            value={selectedPayroll ? formatCurrency(selectedPayroll.net_salary) : "-"}
            icon={CreditCard}
            tone="warning"
            description={selectedPayroll ? t("homePage.payrollNetDescription", { status: formatLabel(selectedPayroll.status) }) : t("homePage.payrollPeriodNotice")}
            isLoading={payrollPeriodsQuery.isLoading || selectedPayrollQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.paidUnpaidTime")}
            value={`${formatMinutes(monthlyAttendanceStats.paidMinutes)} / ${formatMinutes(monthlyAttendanceStats.unpaidMinutes)}`}
            icon={CheckCircle2}
            tone="info"
            description={t("homePage.paidUnpaidTimeDescription")}
            isLoading={monthAttendanceQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.unreadNotifications")}
            value={notificationsQuery.data?.unread_count ?? latestUnreadNotifications.length}
            icon={Bell}
            tone={latestUnreadNotifications.length ? "warning" : "success"}
            description={t("homePage.notificationsHint")}
            isLoading={notificationsQuery.isLoading}
          />
          <DashboardStatCard
            label={t("homePage.latestVacation")}
            value={latestVacation ? <StatusBadge status={normalizeVacationStatus(latestVacation.vacation_status)} /> : "-"}
            icon={Palmtree}
            tone="success"
            description={latestVacation ? t("labels.range", { start: formatDate(latestVacation.start_date), end: formatDate(latestVacation.end_date) }) : t("homePage.noRequests")}
            isLoading={vacationsQuery.isLoading}
          />
        </div>
      </section>

      <section className="space-y-4">
        <DashboardSection title={t("dashboard.quickActions")} description={t("homePage.quickActionsDescription")} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <DashboardQuickAction
              key={action.to}
              to={action.to}
              icon={action.icon}
              label={action.label}
              description={action.description}
              tone={action.tone}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.attendanceActions")}</CardTitle>
            <CardDescription>{t("homePage.attendanceActionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {autoAttendanceEnabled ? (
              <div className="rounded-[1rem] border border-info/20 bg-info/5 p-4 text-sm text-muted-foreground">
                {t("homePage.autoAttendanceNotice")}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button disabled={!canUseSelfAttendance || autoAttendanceEnabled || actionState.checkInDisabled || attendanceAction.isPending} onClick={() => attendanceAction.mutate("check-in")}>
                {t("labels.code.check_in")}
              </Button>
              <Button
                variant="outline"
                disabled={!canUseSelfAttendance || autoAttendanceEnabled || actionState.breakStartDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("break-start")}
              >
                {t("labels.code.break_start")}
              </Button>
              <Button
                variant="outline"
                disabled={!canUseSelfAttendance || autoAttendanceEnabled || actionState.breakEndDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("break-end")}
              >
                {t("labels.code.break_end")}
              </Button>
              <Button
                variant="secondary"
                disabled={!canUseSelfAttendance || autoAttendanceEnabled || actionState.checkOutDisabled || attendanceAction.isPending}
                onClick={() => attendanceAction.mutate("check-out")}
              >
                {t("labels.code.check_out")}
              </Button>
            </div>

            {todayAttendance ? (
              <div className="grid gap-3 rounded-[1rem] border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <DashboardEmptyState
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
            <CardTitle>{t("homePage.monthlyAttendance")}</CardTitle>
            <CardDescription>{t("homePage.monthlyAttendanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AttendanceMiniChart days={monthAttendanceQuery.data || []} />
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <InsightRow icon={Clock3} title={t("homePage.worked")} description={formatMinutes(monthlyAttendanceStats.workedMinutes)} tone="info" />
              <InsightRow icon={TimerReset} title={t("dashboard.lateDays")} description={String(monthlyAttendanceStats.lateDays)} tone={monthlyAttendanceStats.lateDays ? "warning" : "success"} />
              <InsightRow icon={FileText} title={t("dashboard.absentDays")} description={String(monthlyAttendanceStats.absentDays)} tone={monthlyAttendanceStats.absentDays ? "danger" : "success"} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.latestUnreadNotifications")}</CardTitle>
            <CardDescription>{t("homePage.latestUnreadNotificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestUnreadNotifications.length ? (
              latestUnreadNotifications.map((notification) => (
                <InsightRow
                  key={notification.notification_id}
                  icon={Bell}
                  title={notification.title}
                  description={notification.message}
                  tone={notification.priority === "high" ? "danger" : "info"}
                  meta={<StatusBadge status={notification.priority} />}
                />
              ))
            ) : (
              <DashboardEmptyState title={t("homePage.noUnreadNotifications")} description={t("homePage.caughtUp")} compact />
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await refreshUnreadNotificationCount();
                await queryClient.invalidateQueries({ queryKey: ["employee-home", "notifications"] });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {t("homePage.refreshNotifications")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.upcomingLeave")}</CardTitle>
            <CardDescription>{t("homePage.upcomingLeaveDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingVacation ? (
              <InsightRow
                icon={Palmtree}
                title={t("labels.range", { start: formatDate(upcomingVacation.start_date), end: formatDate(upcomingVacation.end_date) })}
                description={`${t("common.type")}: ${formatLabel(normalizeVacationType(upcomingVacation.vacation_type))}`}
                tone={normalizeVacationStatus(upcomingVacation.vacation_status) === "approved" ? "success" : "warning"}
                meta={<StatusBadge status={normalizeVacationStatus(upcomingVacation.vacation_status)} />}
              />
            ) : (
              <DashboardEmptyState title={t("homePage.noVacationRequests")} description={t("homePage.noVacationRequestsDescription")} compact />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("homePage.payrollStatus")}</CardTitle>
            <CardDescription>{t("homePage.payrollStatusDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPayrollPeriod} onValueChange={setSelectedPayrollPeriod} disabled={!canReadPayroll}>
              <SelectTrigger>
                <SelectValue placeholder={payrollPeriodsQuery.isLoading ? t("paymentsPage.loadingPeriods") : t("paymentsPage.selectPeriod")} />
              </SelectTrigger>
              <SelectContent>
                {(payrollPeriodsQuery.data || []).map((period) => (
                  <SelectItem key={period.id} value={String(period.id)}>
                    {period.name} ({formatDate(period.start_date)} - {formatDate(period.end_date)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPayroll ? (
              <div className="rounded-[1rem] border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{latestPayrollPeriod?.name || t("paymentsPage.selectPeriod")}</p>
                    <p className="mt-1 font-display text-3xl font-semibold">{formatCurrency(selectedPayroll.net_salary)}</p>
                  </div>
                  <StatusBadge status={selectedPayroll.status} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("homePage.payrollBalanceDescription", { balance: formatCurrency(selectedPayroll.balance_amount) })}
                </p>
              </div>
            ) : (
              <DashboardEmptyState title={t("homePage.noPayrollData")} description={t("homePage.noPayrollDataDescription")} compact />
            )}
            <Button
              variant="outline"
              onClick={() => navigate(selectedPayrollPeriod ? `/employee/payroll?period=${selectedPayrollPeriod}` : "/employee/payroll")}
              disabled={!canReadPayroll}
            >
              {t("homePage.openPayroll")}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
