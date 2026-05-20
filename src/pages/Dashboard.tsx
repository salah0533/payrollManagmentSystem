import { useMemo } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileClock,
  Landmark,
  ReceiptText,
  Send,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  AttendanceTrendChart,
  EmployeeStatusDonut,
  PayrollStatusChart,
  SimpleBarChart,
  type AttendanceTrendDatum,
  type PayrollStatusDatum,
  type SimpleBarDatum,
} from "@/components/dashboard/DashboardCharts";
import {
  ChartCard,
  DashboardEmptyState,
  DashboardHero,
  DashboardQuickAction,
  DashboardSection,
  DashboardStatCard,
  InsightRow,
} from "@/components/dashboard/DashboardPrimitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, formatDateTime, formatLabel, formatMinutes, formatNumber, toIsoDate } from "@/lib/format";
import { getRoleLabelKey } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";
import { attendanceApi } from "@/services/attendanceApi";
import { auditApi } from "@/services/auditApi";
import { dashboardApi } from "@/services/dashboardApi";
import { employeeApi } from "@/services/employeeApi";
import { notificationApi } from "@/services/notificationApi";
import { payrollApi } from "@/services/payrollApi";
import { userApi } from "@/services/userApi";
import { vacationApi } from "@/services/vacationApi";
import type { AdminNotification, AttendanceDay, Employee, PayrollPeriod, User, UserNotification, Vacation } from "@/types/domain";

const VACATION_STATUS_BY_ID: Record<string, string> = {
  "0": "pending",
  "1": "approved",
  "2": "cancelled",
  "3": "rejected",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--chart-3))",
  needs_review: "hsl(var(--chart-2))",
  reviewed: "hsl(var(--chart-3))",
  approved: "hsl(var(--chart-1))",
  partially_paid: "hsl(var(--chart-2))",
  paid: "hsl(var(--success))",
  locked: "hsl(var(--chart-5))",
  pending: "hsl(var(--chart-2))",
  rejected: "hsl(var(--chart-4))",
  cancelled: "hsl(var(--muted-foreground))",
  active: "hsl(var(--chart-1))",
  inactive: "hsl(var(--chart-4))",
};

function toNumber(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeVacationStatus(value?: number | string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VACATION_STATUS_BY_ID[normalized] || normalized || "pending";
}

function byNewestPeriod(periods: PayrollPeriod[]) {
  return [...periods].sort((left, right) => {
    const rightDate = new Date(right.end_date || right.generated_at || 0).getTime();
    const leftDate = new Date(left.end_date || left.generated_at || 0).getTime();
    return rightDate - leftDate;
  });
}

function employeeNameById(employees: Employee[], employeeId: number) {
  return employees.find((employee) => employee.id === employeeId)?.full_name;
}

function aggregateAttendanceTrend(days: AttendanceDay[]): AttendanceTrendDatum[] {
  const grouped = new Map<string, AttendanceTrendDatum>();

  days.forEach((day) => {
    const key = day.work_date;
    const existing =
      grouped.get(key) ||
      ({
        date: key,
        label: format(parseISO(key), "MMM d"),
        present: 0,
        late: 0,
        absent: 0,
        incomplete: 0,
      } satisfies AttendanceTrendDatum);

    if (["present", "paid_vacation", "sick_leave"].includes(day.status)) {
      existing.present += 1;
    } else if (day.status === "late") {
      existing.late += 1;
    } else if (day.status === "absent") {
      existing.absent += 1;
    } else if (day.status === "incomplete") {
      existing.incomplete += 1;
    }

    grouped.set(key, existing);
  });

  return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function aggregatePayrollStatus(period?: PayrollPeriod): PayrollStatusDatum[] {
  const grouped = new Map<string, PayrollStatusDatum>();

  period?.payrolls?.forEach((payroll) => {
    const status = payroll.status || "draft";
    const existing =
      grouped.get(status) ||
      ({
        status: formatLabel(status),
        count: 0,
        amount: 0,
        color: STATUS_COLORS[status] || "hsl(var(--chart-3))",
      } satisfies PayrollStatusDatum);
    existing.count += 1;
    existing.amount += toNumber(payroll.total_amount);
    grouped.set(status, existing);
  });

  return [...grouped.values()];
}

function aggregateVacationStatus(vacations: Vacation[]): SimpleBarDatum[] {
  const grouped = new Map<string, SimpleBarDatum>();

  vacations.forEach((vacation) => {
    const status = normalizeVacationStatus(vacation.vacation_status);
    const existing =
      grouped.get(status) ||
      ({
        name: formatLabel(status),
        value: 0,
        color: STATUS_COLORS[status] || "hsl(var(--chart-2))",
      } satisfies SimpleBarDatum);
    existing.value += 1;
    grouped.set(status, existing);
  });

  return [...grouped.values()];
}

function aggregateRoleDistribution(users: User[], t: (key: string) => string): SimpleBarDatum[] {
  const grouped = new Map<string, SimpleBarDatum>();

  users.forEach((user) => {
    user.roles.forEach((role) => {
      const code = role.code || "user";
      const existing =
        grouped.get(code) ||
        ({
          name: t(getRoleLabelKey(code)),
          value: 0,
          color: code === "admin" ? "hsl(var(--chart-5))" : code === "hr" ? "hsl(var(--chart-3))" : "hsl(var(--chart-1))",
        } satisfies SimpleBarDatum);
      existing.value += 1;
      grouped.set(code, existing);
    });
  });

  return [...grouped.values()];
}

function normalizeNotification(notification: AdminNotification | UserNotification) {
  if ("notification_id" in notification) {
    return {
      id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      createdAt: notification.created_at,
      isRead: notification.is_read,
      meta: null,
    };
  }

  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    createdAt: notification.created_at,
    isRead: true,
    meta: notification.recipient_count,
  };
}

export default function Dashboard({ role }: { role: "admin" | "hr" }) {
  const { t } = useTranslation();
  const { currentUser, permissions, unreadNotificationCount } = useAuth();
  const isAdmin = role === "admin";
  const authPermissions = permissions ?? currentUser?.permissions ?? [];
  const hasPermission = (permission: string) => isAdmin || authPermissions.includes(permission);
  const today = new Date();
  const monthStart = toIsoDate(startOfMonth(today));
  const monthEnd = toIsoDate(endOfMonth(today));
  const currentYear = today.getFullYear();

  const canReadEmployees = hasPermission("employees.read");
  const canReadAttendance = hasPermission("attendance.read_all");
  const canReadPayroll = hasPermission("payroll.read_all");
  const canReadVacations = hasPermission("vacations.read_all");
  const canReadOwnNotifications = hasPermission("notifications.read_own");
  const canReadAllNotifications = hasPermission("notifications.read_all");
  const canSendNotifications = hasPermission("notifications.send");
  const canReadAudit = isAdmin && hasPermission("audit.read");

  const statsQuery = useQuery({
    queryKey: ["dashboard", role, "stats"],
    queryFn: () => dashboardApi.getStats(),
  });

  const employeesQuery = useQuery({
    queryKey: ["dashboard", role, "employees"],
    queryFn: () => employeeApi.list(),
    enabled: canReadEmployees,
  });

  const attendanceMonthQuery = useQuery({
    queryKey: ["dashboard", role, "attendance-range", monthStart, monthEnd],
    queryFn: () => attendanceApi.listRange(monthStart, monthEnd),
    enabled: canReadAttendance,
  });

  const yearVacationsQuery = useQuery({
    queryKey: ["dashboard", role, "vacations-year", currentYear],
    queryFn: () => vacationApi.listAll(currentYear),
    enabled: canReadVacations,
  });

  const currentVacationsQuery = useQuery({
    queryKey: ["dashboard", role, "current-vacations"],
    queryFn: () => vacationApi.listCurrent(),
    enabled: canReadVacations,
  });

  const payrollPeriodsQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-periods"],
    queryFn: () => payrollApi.listPeriods(),
    enabled: canReadPayroll,
  });

  const payrollPeriods = useMemo(() => payrollPeriodsQuery.data || [], [payrollPeriodsQuery.data]);
  const currentPayrollPeriod = useMemo(() => byNewestPeriod(payrollPeriods)[0], [payrollPeriods]);

  const payrollDiscrepanciesQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-discrepancies", currentPayrollPeriod?.id],
    queryFn: () => payrollApi.getDiscrepancies(currentPayrollPeriod?.id as number),
    enabled: canReadPayroll && Boolean(currentPayrollPeriod?.id),
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", role, "users"],
    queryFn: () => userApi.list(),
    enabled: isAdmin,
  });

  const personalNotificationsQuery = useQuery({
    queryKey: ["dashboard", role, "personal-notifications"],
    queryFn: () =>
      notificationApi.listMine({
        unread_only: false,
        archived: false,
        include_expired: false,
        limit: 5,
        offset: 0,
      }),
    enabled: canReadOwnNotifications,
  });

  const allNotificationsQuery = useQuery({
    queryKey: ["dashboard", role, "all-notifications"],
    queryFn: () => notificationApi.listAll({ limit: 5, offset: 0 }),
    enabled: canReadAllNotifications,
  });

  const auditQuery = useQuery({
    queryKey: ["dashboard", role, "audit-preview"],
    queryFn: () => auditApi.list(5),
    enabled: canReadAudit,
  });

  const stats = statsQuery.data;
  const employees = useMemo(() => employeesQuery.data || [], [employeesQuery.data]);
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);
  const currentVacations = useMemo(() => currentVacationsQuery.data || [], [currentVacationsQuery.data]);
  const yearVacations = useMemo(() => yearVacationsQuery.data || [], [yearVacationsQuery.data]);
  const attendanceTrend = useMemo(() => aggregateAttendanceTrend(attendanceMonthQuery.data || []), [attendanceMonthQuery.data]);
  const payrollStatusData = useMemo(() => aggregatePayrollStatus(currentPayrollPeriod), [currentPayrollPeriod]);
  const vacationStatusData = useMemo(() => aggregateVacationStatus(yearVacations), [yearVacations]);
  const roleDistributionData = useMemo(() => aggregateRoleDistribution(users, t), [users, t]);

  const totalEmployees = stats?.total_emps ?? employees.length;
  const activeEmployees = stats?.total_active_emps ?? employees.filter((employee) => employee.is_active).length;
  const inactiveEmployees = Math.max(totalEmployees - activeEmployees, 0);
  const attendanceRate = Number(stats?.total_att_percent || 0);
  const openPayrollDiscrepancies = (payrollDiscrepanciesQuery.data || []).filter((item) => item.status !== "resolved").length;
  const pendingVacations = yearVacations.filter((vacation) => normalizeVacationStatus(vacation.vacation_status) === "pending");
  const payrollTotal = currentPayrollPeriod?.payrolls?.reduce((sum, row) => sum + toNumber(row.total_amount), 0) || 0;
  const payrollPaid = currentPayrollPeriod?.payrolls?.reduce((sum, row) => sum + toNumber(row.paid_amount), 0) || 0;
  const activeUsers = users.filter((user) => user.is_active).length;
  const notificationItems = [
    ...(allNotificationsQuery.data?.items || []),
    ...(allNotificationsQuery.data?.items?.length ? [] : personalNotificationsQuery.data?.items || []),
  ]
    .slice(0, 5)
    .map(normalizeNotification);

  const quickActions = [
    isAdmin
      ? {
          to: "/admin/users",
          icon: UserCog,
          label: t("quickActions.manageUsers"),
          description: t("quickActions.manageUsersDescription"),
          tone: "info" as const,
          show: true,
        }
      : null,
    {
      to: `/${role}/employees`,
      icon: UserPlus,
      label: isAdmin ? t("quickActions.addEmployee") : t("quickActions.viewEmployeeRecords"),
      description: isAdmin ? t("quickActions.addEmployeeDescription") : t("quickActions.viewEmployeeRecordsDescription"),
      tone: "success" as const,
      show: canReadEmployees,
    },
    {
      to: `/${role}/attendance`,
      icon: Clock3,
      label: t("quickActions.reviewAttendance"),
      description: t("quickActions.reviewAttendanceDescription"),
      tone: "warning" as const,
      show: canReadAttendance,
    },
    {
      to: `/${role}/payroll`,
      icon: WalletCards,
      label: isAdmin ? t("quickActions.openPayroll") : t("quickActions.preparePayroll"),
      description: isAdmin ? t("quickActions.openPayrollDescription") : t("quickActions.preparePayrollDescription"),
      tone: "info" as const,
      show: canReadPayroll,
    },
    {
      to: `/${role}/vacations`,
      icon: Landmark,
      label: t("quickActions.reviewVacations"),
      description: t("quickActions.reviewVacationsDescription"),
      tone: "success" as const,
      show: canReadVacations,
    },
    canReadOwnNotifications
      ? {
          to: `/${role}/notifications`,
          icon: Send,
          label: canSendNotifications ? t("quickActions.sendNotice") : t("quickActions.viewNotifications"),
          description: canSendNotifications ? t("quickActions.sendNoticeDescription") : t("quickActions.viewNotificationsDescription"),
          tone: "default" as const,
          show: true,
        }
      : null,
    canReadAudit
      ? {
          to: "/admin/audit-logs",
          icon: ShieldCheck,
          label: t("quickActions.viewAuditLogs"),
          description: t("quickActions.viewAuditLogsDescription"),
          tone: "danger" as const,
          show: true,
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => Boolean(action?.show));

  const operationItems = [
    {
      icon: ClipboardCheck,
      title: t("dashboard.attendanceReview"),
      description: t("dashboard.attendanceReviewHint"),
      value: stats?.needs_review_days ?? 0,
      tone: (stats?.needs_review_days || 0) > 0 ? ("warning" as const) : ("success" as const),
      show: canReadAttendance,
    },
    {
      icon: AlertTriangle,
      title: t("dashboard.incompleteDays"),
      description: t("dashboard.incompleteDaysHint"),
      value: stats?.incomplete_days ?? 0,
      tone: (stats?.incomplete_days || 0) > 0 ? ("danger" as const) : ("success" as const),
      show: canReadAttendance,
    },
    {
      icon: ReceiptText,
      title: t("dashboard.payrollIssues"),
      description: currentPayrollPeriod?.name || t("paymentsPage.selectPeriod"),
      value: openPayrollDiscrepancies,
      tone: openPayrollDiscrepancies > 0 ? ("danger" as const) : ("success" as const),
      show: canReadPayroll,
    },
    {
      icon: CalendarClock,
      title: t("dashboard.pendingLeaveRequests"),
      description: t("dashboard.pendingLeaveRequestsDescription"),
      value: pendingVacations.length,
      tone: pendingVacations.length > 0 ? ("warning" as const) : ("success" as const),
      show: canReadVacations,
    },
  ].filter((item) => item.show);

  const nonZeroOperations = operationItems.filter((item) => item.value > 0);
  const isStatsLoading = statsQuery.isLoading;

  return (
    <div className="space-y-8 animate-fade-in">
      <DashboardHero
        kicker={isAdmin ? t("dashboard.adminKicker") : t("dashboard.hrKicker")}
        title={isAdmin ? t("dashboard.adminTitle") : t("dashboard.hrTitle")}
        description={isAdmin ? t("dashboard.adminDescription") : t("dashboard.hrDescription")}
        meta={[
          { label: t("dashboard.period"), value: formatDate(today.toISOString()) },
          { label: t("dashboard.monthToDate"), value: `${formatDate(monthStart)} - ${formatDate(monthEnd)}` },
        ]}
      >
        <div className="rounded-[1.15rem] border border-white/15 bg-white/10 p-4">
          <p className="text-sm font-semibold text-primary-foreground/72">{t("dashboard.liveHealth")}</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-4xl font-semibold">{formatNumber(attendanceRate, true)}%</p>
              <p className="mt-1 text-xs text-primary-foreground/60">{t("dashboard.attendanceRate")}</p>
            </div>
            <StatusBadge status={attendanceRate >= 80 ? "active" : attendanceRate >= 50 ? "pending" : "needs_review"} />
          </div>
        </div>
      </DashboardHero>

      <section className="space-y-4">
        <DashboardSection
          title={t("dashboard.overview")}
          description={isAdmin ? t("dashboard.adminOverviewDescription") : t("dashboard.hrOverviewDescription")}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isAdmin ? (
            <DashboardStatCard
              label={t("dashboard.totalUsers")}
              value={formatNumber(users.length)}
              description={t("dashboard.totalUsersDescription", { active: formatNumber(activeUsers) })}
              icon={UserCog}
              tone="info"
              isLoading={usersQuery.isLoading}
            />
          ) : null}
          <DashboardStatCard
            label={t("dashboard.totalEmployees")}
            value={formatNumber(totalEmployees)}
            description={t("dashboard.totalEmployeesDescription", { inactive: formatNumber(inactiveEmployees) })}
            icon={Users}
            isLoading={isStatsLoading}
          />
          <DashboardStatCard
            label={t("dashboard.activeEmployees")}
            value={formatNumber(activeEmployees)}
            description={t("dashboard.activeEmployeesDescription")}
            icon={CheckCircle2}
            tone="success"
            isLoading={isStatsLoading}
          />
          <DashboardStatCard
            label={t("dashboard.attendanceRate")}
            value={`${formatNumber(attendanceRate, true)}%`}
            description={t("dashboard.attendanceRateDescription")}
            icon={Clock3}
            tone={attendanceRate >= 80 ? "success" : attendanceRate >= 50 ? "warning" : "danger"}
            isLoading={isStatsLoading}
          />
          <DashboardStatCard
            label={t("dashboard.employeesOnVacation")}
            value={formatNumber(stats?.total_vacation ?? currentVacations.length)}
            description={t("dashboard.employeesOnVacationDescription")}
            icon={Landmark}
            tone="warning"
            isLoading={isStatsLoading || currentVacationsQuery.isLoading}
          />
          {canReadPayroll ? (
            <DashboardStatCard
              label={t("dashboard.currentPayroll")}
              value={formatCurrency(payrollTotal)}
              description={t("dashboard.currentPayrollDescription", { paid: formatCurrency(payrollPaid) })}
              icon={ReceiptText}
              tone="info"
              isLoading={payrollPeriodsQuery.isLoading}
            />
          ) : null}
          {canReadPayroll ? (
            <DashboardStatCard
              label={t("dashboard.payrollIssues")}
              value={formatNumber(openPayrollDiscrepancies)}
              description={t("dashboard.payrollIssuesDescription")}
              icon={AlertTriangle}
              tone={openPayrollDiscrepancies ? "danger" : "success"}
              isLoading={payrollDiscrepanciesQuery.isLoading}
            />
          ) : null}
          <DashboardStatCard
            label={t("dashboard.unreadNotices")}
            value={formatNumber(personalNotificationsQuery.data?.unread_count ?? unreadNotificationCount)}
            description={t("dashboard.unreadNoticesHint")}
            icon={Bell}
            tone={(personalNotificationsQuery.data?.unread_count ?? unreadNotificationCount) ? "warning" : "success"}
            isLoading={personalNotificationsQuery.isLoading}
          />
        </div>
      </section>

      <section className="space-y-4">
        <DashboardSection
          title={t("dashboard.quickActions")}
          description={isAdmin ? t("dashboard.adminQuickActionsDescription") : t("dashboard.hrQuickActionsDescription")}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

      <section className="space-y-4">
        <DashboardSection title={t("dashboard.analytics")} description={t("dashboard.analyticsDescription")} />
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title={t("charts.workforceStatus")}
            description={t("charts.workforceStatusDescription")}
            isLoading={statsQuery.isLoading}
            isError={statsQuery.isError}
            isEmpty={totalEmployees === 0}
            emptyTitle={t("charts.noEmployees")}
            emptyDescription={t("dashboard.noEmployeesAnalyticsDescription")}
            errorTitle={t("dashboard.loadSectionError")}
          >
            <EmployeeStatusDonut active={activeEmployees} inactive={inactiveEmployees} />
          </ChartCard>

          {canReadAttendance ? (
            <ChartCard
              title={t("charts.attendanceTrend")}
              description={t("charts.attendanceTrendDescription")}
              isLoading={attendanceMonthQuery.isLoading}
              isError={attendanceMonthQuery.isError}
              isEmpty={attendanceTrend.length === 0}
              emptyTitle={t("charts.noAttendanceData")}
              emptyDescription={t("charts.noAttendanceDataDescription")}
              errorTitle={t("dashboard.loadSectionError")}
            >
              <AttendanceTrendChart data={attendanceTrend} />
            </ChartCard>
          ) : null}

          {canReadPayroll ? (
            <ChartCard
              title={t("charts.payrollStatus")}
              description={t("charts.payrollStatusDescription")}
              isLoading={payrollPeriodsQuery.isLoading}
              isError={payrollPeriodsQuery.isError}
              isEmpty={payrollStatusData.length === 0}
              emptyTitle={t("charts.noPayrollData")}
              emptyDescription={t("charts.noPayrollDataDescription")}
              errorTitle={t("dashboard.loadSectionError")}
            >
              <PayrollStatusChart data={payrollStatusData} />
            </ChartCard>
          ) : null}

          {canReadVacations ? (
            <ChartCard
              title={t("charts.vacationPipeline")}
              description={t("charts.vacationPipelineDescription")}
              isLoading={yearVacationsQuery.isLoading}
              isError={yearVacationsQuery.isError}
              isEmpty={vacationStatusData.length === 0}
              emptyTitle={t("charts.noVacationData")}
              emptyDescription={t("charts.noVacationDataDescription")}
              errorTitle={t("dashboard.loadSectionError")}
            >
              <SimpleBarChart data={vacationStatusData} />
            </ChartCard>
          ) : null}

          {isAdmin ? (
            <ChartCard
              title={t("charts.roleDistribution")}
              description={t("charts.roleDistributionDescription")}
              isLoading={usersQuery.isLoading}
              isError={usersQuery.isError}
              isEmpty={roleDistributionData.length === 0}
              emptyTitle={t("charts.noRoleData")}
              emptyDescription={t("charts.noRoleDataDescription")}
              errorTitle={t("dashboard.loadSectionError")}
            >
              <SimpleBarChart data={roleDistributionData} />
            </ChartCard>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <DashboardSection title={t("dashboard.operations")} description={t("dashboard.operationsDescription")} />
          <div className="space-y-3">
            {operationItems.length && nonZeroOperations.length ? (
              operationItems.map((item) => (
                <InsightRow
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  tone={item.tone}
                  meta={
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl font-semibold">{formatNumber(item.value)}</span>
                      <StatusBadge status={item.value > 0 ? "pending" : "approved"} />
                    </div>
                  }
                />
              ))
            ) : (
              <DashboardEmptyState
                title={t("dashboard.noActionRequired")}
                description={t("dashboard.noActionRequiredDescription")}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <DashboardSection title={t("dashboard.currentVacations")} description={t("dashboard.currentVacationsDescription")} />
          <div className="space-y-3">
            {currentVacationsQuery.isLoading ? (
              <DashboardEmptyState title={t("dashboard.loadingCurrentVacations")} compact />
            ) : currentVacations.length ? (
              currentVacations.slice(0, 5).map((vacation) => {
                const status = normalizeVacationStatus(vacation.vacation_status);
                return (
                  <InsightRow
                    key={vacation.id}
                    icon={Landmark}
                    title={employeeNameById(employees, vacation.employee_id) || t("labels.employeeId", { id: vacation.employee_id })}
                    description={t("labels.range", { start: formatDate(vacation.start_date), end: formatDate(vacation.end_date) })}
                    tone={status === "approved" ? "success" : status === "pending" ? "warning" : "default"}
                    meta={<StatusBadge status={status} />}
                  />
                );
              })
            ) : (
              <DashboardEmptyState
                title={t("dashboard.noActiveVacations")}
                description={t("dashboard.noActiveVacationsDescription")}
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <DashboardSection title={t("dashboard.recentNotifications")} description={t("dashboard.recentNotificationsDescription")} />
          <div className="space-y-3">
            {personalNotificationsQuery.isLoading || allNotificationsQuery.isLoading ? (
              <DashboardEmptyState title={t("notificationsPage.loadingNotifications")} compact />
            ) : notificationItems.length ? (
              notificationItems.map((notification) => (
                <InsightRow
                  key={notification.id}
                  icon={Bell}
                  title={notification.title}
                  description={notification.message}
                  tone={notification.priority === "high" ? "danger" : notification.priority === "low" ? "default" : "info"}
                  meta={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-info" aria-label={t("dashboard.unread")} /> : null}
                      <StatusBadge status={notification.priority} />
                    </div>
                  }
                />
              ))
            ) : (
              <DashboardEmptyState title={t("dashboard.noRecentNotifications")} description={t("dashboard.noRecentNotificationsDescription")} />
            )}
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-4">
            <DashboardSection title={t("dashboard.auditPreview")} description={t("dashboard.auditPreviewDescription")} />
            <div className="space-y-3">
              {auditQuery.isLoading ? (
                <DashboardEmptyState title={t("auditPage.loading")} compact />
              ) : auditQuery.data?.length ? (
                auditQuery.data.map((item) => (
                  <InsightRow
                    key={item.id}
                    icon={FileClock}
                    title={formatLabel(item.action)}
                    description={t("dashboard.auditDescription", {
                      entity: formatLabel(item.entity_type),
                      id: item.entity_id ?? t("common.notAvailable"),
                    })}
                    tone="default"
                    meta={<span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>}
                  />
                ))
              ) : (
                <DashboardEmptyState title={t("auditPage.empty")} description={t("auditPage.emptyDescription")} />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DashboardSection title={t("dashboard.hrTaskQueue")} description={t("dashboard.hrTaskQueueDescription")} />
            <div className="space-y-3">
              <InsightRow
                icon={Clock3}
                title={t("dashboard.lateDays")}
                description={t("dashboard.lateDaysDescription", { count: formatNumber(stats?.late_days ?? 0) })}
                tone={(stats?.late_days || 0) > 0 ? "warning" : "success"}
                meta={<StatusBadge status={(stats?.late_days || 0) > 0 ? "pending" : "approved"} />}
              />
              <InsightRow
                icon={AlertTriangle}
                title={t("dashboard.absentDays")}
                description={t("dashboard.absentDaysDescription", { count: formatNumber(stats?.absent_days ?? 0) })}
                tone={(stats?.absent_days || 0) > 0 ? "danger" : "success"}
                meta={<StatusBadge status={(stats?.absent_days || 0) > 0 ? "needs_review" : "approved"} />}
              />
              <InsightRow
                icon={ReceiptText}
                title={t("dashboard.paidUnpaidTime")}
                description={`${formatMinutes(stats?.total_paid_minutes || 0)} / ${formatMinutes(stats?.total_unpaid_minutes || 0)}`}
                tone="info"
                meta={<StatusBadge status="reviewed" />}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
