import { useMemo } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Landmark,
  ReceiptText,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
  type LucideIcon,
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
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, formatLabel, formatMinutes, formatNumber, toIsoDate } from "@/lib/format";
import { getRoleLabelKey } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";
import { attendanceApi } from "@/services/attendanceApi";
import { dashboardApi } from "@/services/dashboardApi";
import { employeeApi } from "@/services/employeeApi";
import { payrollApi } from "@/services/payrollApi";
import { userApi } from "@/services/userApi";
import { vacationApi } from "@/services/vacationApi";
import type { AttendanceDay, Employee, PayrollPeriod, User, Vacation } from "@/types/domain";

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

function toPercent(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.max(0, Math.min(100, (part / total) * 100));
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

function ScoreCard({
  icon: Icon,
  title,
  value,
  description,
  progress,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  progress: number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : tone === "info"
            ? "bg-info/10 text-info"
            : "bg-primary/10 text-primary";

  return (
    <div className="rounded-[1.15rem] border border-white/70 bg-card/85 p-4 shadow-[0_16px_48px_-42px_hsl(var(--foreground)/0.82)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="font-display text-3xl font-semibold">{value}</span>
        <span className="text-sm font-medium text-muted-foreground">{formatNumber(progress, true)}%</span>
      </div>
      <Progress value={progress} className="mt-3 h-2 bg-muted/80" />
    </div>
  );
}

export default function Dashboard({ role }: { role: "admin" | "hr" }) {
  const { t } = useTranslation();
  const { currentUser, permissions } = useAuth();
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

  const payrollPeriodsQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-periods"],
    queryFn: () => payrollApi.listPeriods(),
    enabled: canReadPayroll,
  });

  const payrollPeriods = useMemo(() => payrollPeriodsQuery.data || [], [payrollPeriodsQuery.data]);
  const currentPayrollPeriodSummary = useMemo(() => byNewestPeriod(payrollPeriods)[0], [payrollPeriods]);

  const currentPayrollPeriodQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-period-detail", currentPayrollPeriodSummary?.id],
    queryFn: () => payrollApi.getPeriod(currentPayrollPeriodSummary?.id as number),
    enabled: canReadPayroll && Boolean(currentPayrollPeriodSummary?.id),
  });

  const payrollReportQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-report", currentPayrollPeriodSummary?.id],
    queryFn: () => payrollApi.getReport(currentPayrollPeriodSummary?.id),
    enabled: canReadPayroll && Boolean(currentPayrollPeriodSummary?.id),
  });

  const currentPayrollPeriod = currentPayrollPeriodQuery.data || currentPayrollPeriodSummary;

  const payrollDiscrepanciesQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-discrepancies", currentPayrollPeriodSummary?.id],
    queryFn: () => payrollApi.getDiscrepancies(currentPayrollPeriodSummary?.id as number),
    enabled: canReadPayroll && Boolean(currentPayrollPeriodSummary?.id),
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", role, "users"],
    queryFn: () => userApi.list(),
    enabled: isAdmin,
  });

  const stats = statsQuery.data;
  const employees = useMemo(() => employeesQuery.data || [], [employeesQuery.data]);
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);
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
  const payrollTotal =
    toNumber(payrollReportQuery.data?.total_amount) ||
    currentPayrollPeriod?.payrolls?.reduce((sum, row) => sum + toNumber(row.total_amount), 0) ||
    0;
  const payrollPaid =
    toNumber(payrollReportQuery.data?.paid_amount) ||
    currentPayrollPeriod?.payrolls?.reduce((sum, row) => sum + toNumber(row.paid_amount), 0) ||
    0;
  const activeUsers = users.filter((user) => user.is_active).length;
  const payrollRows = currentPayrollPeriod?.payrolls || [];
  const finalizedPayrollRows = payrollRows.filter((row) => ["approved", "paid", "locked"].includes(row.status)).length;
  const payrollReadinessPercent = toPercent(finalizedPayrollRows, payrollRows.length);
  const attendanceIssueCount =
    (stats?.needs_review_days || 0) +
    (stats?.incomplete_days || 0) +
    (stats?.late_days || 0) +
    (stats?.absent_days || 0);
  const attendanceQualityPercent = Math.max(0, Math.min(100, attendanceRate - toPercent(attendanceIssueCount, Math.max(totalEmployees, 1))));
  const workforceCoveragePercent = toPercent(activeEmployees, totalEmployees);
  const paidTimePercent = toPercent(stats?.total_paid_minutes || 0, (stats?.total_paid_minutes || 0) + (stats?.total_unpaid_minutes || 0));

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
            value={formatNumber(stats?.total_vacation ?? 0)}
            description={t("dashboard.employeesOnVacationDescription")}
            icon={Landmark}
            tone="warning"
            isLoading={isStatsLoading}
          />
          {canReadPayroll ? (
            <DashboardStatCard
              label={t("dashboard.currentPayroll")}
              value={formatCurrency(payrollTotal)}
              description={t("dashboard.currentPayrollDescription", { paid: formatCurrency(payrollPaid) })}
              icon={ReceiptText}
              tone="info"
              isLoading={payrollPeriodsQuery.isLoading || currentPayrollPeriodQuery.isLoading || payrollReportQuery.isLoading}
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
            label={t("dashboard.overtimeTime")}
            value={formatMinutes(stats?.overtime_minutes || 0)}
            description={t("dashboard.overtimeTimeDescription")}
            icon={Clock3}
            tone={(stats?.overtime_minutes || 0) > 0 ? "warning" : "success"}
            isLoading={isStatsLoading}
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
              isLoading={payrollPeriodsQuery.isLoading || currentPayrollPeriodQuery.isLoading}
              isError={payrollPeriodsQuery.isError || currentPayrollPeriodQuery.isError}
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
            <div className="xl:col-span-2">
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
                <SimpleBarChart data={roleDistributionData} heightClassName="h-80 md:h-96" />
              </ChartCard>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
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
          <DashboardSection title={t("dashboard.operationalScorecard")} description={t("dashboard.operationalScorecardDescription")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreCard
              icon={Users}
              title={t("dashboard.workforceCoverage")}
              value={`${formatNumber(activeEmployees)} / ${formatNumber(totalEmployees)}`}
              description={t("dashboard.workforceCoverageDescription")}
              progress={workforceCoveragePercent}
              tone={workforceCoveragePercent >= 80 ? "success" : "warning"}
            />
            <ScoreCard
              icon={ReceiptText}
              title={t("dashboard.payrollReadiness")}
              value={`${formatNumber(finalizedPayrollRows)} / ${formatNumber(payrollRows.length)}`}
              description={t("dashboard.payrollReadinessDescription")}
              progress={payrollReadinessPercent}
              tone={openPayrollDiscrepancies ? "danger" : payrollReadinessPercent >= 80 ? "success" : "warning"}
            />
            <ScoreCard
              icon={Clock3}
              title={t("dashboard.attendanceQuality")}
              value={`${formatNumber(attendanceIssueCount)} ${t("dashboard.issues")}`}
              description={t("dashboard.attendanceQualityDescription")}
              progress={attendanceQualityPercent}
              tone={attendanceIssueCount ? "warning" : "success"}
            />
            <ScoreCard
              icon={CheckCircle2}
              title={t("dashboard.paidTimeShare")}
              value={`${formatNumber(paidTimePercent, true)}%`}
              description={t("dashboard.paidTimeShareDescription")}
              progress={paidTimePercent}
              tone={paidTimePercent >= 80 ? "success" : "info"}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
