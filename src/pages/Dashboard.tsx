import { AlertTriangle, Bell, Clock3, Landmark, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { PageHeader } from "@/components/app/PageHeader";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { PayrollChart } from "@/components/dashboard/PayrollChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { VacationChart } from "@/components/dashboard/VacationChart";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatMinutes, formatNumber } from "@/lib/format";
import { adminDashboardFocus, hrDashboardFocus } from "@/components/layout/navigation";
import { dashboardApi } from "@/services/dashboardApi";
import { notificationApi } from "@/services/notificationApi";
import { payrollApi } from "@/services/payrollApi";
import { vacationApi } from "@/services/vacationApi";
import { useTranslation } from "react-i18next";

export default function Dashboard({ role }: { role: "admin" | "hr" }) {
  const { t } = useTranslation();
  const statsQuery = useQuery({
    queryKey: ["dashboard", role, "stats"],
    queryFn: () => dashboardApi.getStats(),
  });

  const notificationsQuery = useQuery({
    queryKey: ["dashboard", role, "notifications"],
    queryFn: () =>
      notificationApi.listMine({
        unread_only: false,
        archived: false,
        include_expired: false,
        limit: 5,
        offset: 0,
      }),
  });

  const currentVacationsQuery = useQuery({
    queryKey: ["dashboard", role, "current-vacations"],
    queryFn: () => vacationApi.listCurrent(),
  });

  const payrollPeriodsQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-periods"],
    queryFn: () => payrollApi.listPeriods(),
  });

  const currentPayrollPeriod = payrollPeriodsQuery.data?.[0];

  const payrollDiscrepanciesQuery = useQuery({
    queryKey: ["dashboard", role, "payroll-discrepancies", currentPayrollPeriod?.id],
    queryFn: () => payrollApi.getDiscrepancies(currentPayrollPeriod?.id as number),
    enabled: Boolean(currentPayrollPeriod?.id),
  });

  const stats = statsQuery.data;
  const focusItems = role === "admin" ? adminDashboardFocus : hrDashboardFocus;
  const openPayrollDiscrepancies = (payrollDiscrepanciesQuery.data || []).filter((item) => item.status !== "resolved").length;
  const pendingNotifications = notificationsQuery.data?.unread_count ?? notificationsQuery.data?.items.filter((item) => !item.is_read).length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={role === "admin" ? t("dashboard.adminTitle") : t("dashboard.hrTitle")}
        description={
          role === "admin"
            ? t("dashboard.adminDescription")
            : t("dashboard.hrDescription")
        }
      />

      <QuickActions role={role} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("dashboard.totalEmployees")} value={stats?.total_emps ?? 0} icon={Users} />
        <MetricCard label={t("dashboard.activeEmployees")} value={stats?.total_active_emps ?? 0} icon={Users} tone="success" />
        <MetricCard
          label={t("dashboard.attendanceRate")}
          value={`${formatNumber(stats?.total_att_percent || 0, true)}%`}
          icon={Clock3}
          tone="info"
        />
        <MetricCard label={t("dashboard.employeesOnVacation")} value={stats?.total_vacation ?? 0} icon={Landmark} tone="warning" />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("dashboard.actionRequired")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.actionRequiredDescription")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("dashboard.attendanceReview")} value={stats?.needs_review_days ?? 0} icon={ShieldCheck} tone="warning" hint={t("dashboard.attendanceReviewHint")} />
          <MetricCard label={t("dashboard.incompleteDays")} value={stats?.incomplete_days ?? 0} icon={AlertTriangle} tone="danger" hint={t("dashboard.incompleteDaysHint")} />
          <MetricCard label={t("dashboard.payrollIssues")} value={openPayrollDiscrepancies} icon={ReceiptText} tone={openPayrollDiscrepancies ? "danger" : "success"} hint={currentPayrollPeriod?.name || t("paymentsPage.selectPeriod")} />
          <MetricCard label={t("dashboard.unreadNotices")} value={pendingNotifications} icon={Bell} tone={pendingNotifications ? "warning" : "success"} hint={t("dashboard.unreadNoticesHint")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("dashboard.todayMonthPresent")} value={stats?.present_days ?? 0} icon={Clock3} tone="success" />
        <MetricCard label={t("dashboard.lateDays")} value={stats?.late_days ?? 0} icon={Clock3} tone="warning" />
        <MetricCard label={t("dashboard.absentDays")} value={stats?.absent_days ?? 0} icon={AlertTriangle} tone="danger" />
        <MetricCard label={t("dashboard.paidUnpaidTime")} value={`${formatMinutes(stats?.total_paid_minutes || 0)} / ${formatMinutes(stats?.total_unpaid_minutes || 0)}`} icon={ReceiptText} tone="info" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <PayrollChart activeEmployees={stats?.total_active_emps ?? 0} totalEmployees={stats?.total_emps ?? 0} />
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
          <AttendanceChart attendancePercent={Number(stats?.total_att_percent || 0)} />
          <VacationChart totalEmployees={stats?.total_emps ?? 0} employeesOnVacation={stats?.total_vacation ?? 0} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.operationalFocus")}</CardTitle>
            <CardDescription>
              {t("dashboard.operationalFocusDescription", {
                total: formatCurrency(
                  currentPayrollPeriod?.payrolls?.reduce(
                    (sum, row) => sum + Number(row.total_amount || 0),
                    0,
                  ) || 0,
                ),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {focusItems.map((item) => (
              <div key={item} className="rounded-lg border border-border p-4 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.currentVacations")}</CardTitle>
            <CardDescription>{t("dashboard.currentVacationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentVacationsQuery.data?.length ? (
              currentVacationsQuery.data.slice(0, 5).map((vacation) => (
                <div key={vacation.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">
                      {t("labels.employeeId", { id: vacation.employee_id })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("labels.range", {
                        start: vacation.start_date,
                        end: vacation.end_date,
                      })}
                    </p>
                  </div>
                  <StatusBadge status={String(vacation.vacation_status)} />
                </div>
              ))
            ) : (
              <EmptyState
                title={
                  currentVacationsQuery.isLoading
                    ? t("dashboard.loadingCurrentVacations")
                    : t("dashboard.noActiveVacations")
                }
                description={t("dashboard.noActiveVacationsDescription")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentNotifications")}</CardTitle>
          <CardDescription>{t("dashboard.recentNotificationsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsQuery.data?.items.length ? (
            notificationsQuery.data.items.map((notification) => (
              <div key={notification.notification_id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{notification.title}</p>
                    {!notification.is_read ? <span className="h-2 w-2 rounded-full bg-info" /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <div className="space-y-2 text-right">
                  <StatusBadge status={notification.priority} />
                  <p className="text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title={
                notificationsQuery.isLoading
                  ? t("notificationsPage.loadingNotifications")
                  : t("dashboard.noRecentNotifications")
              }
              description={t("dashboard.noRecentNotificationsDescription")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
