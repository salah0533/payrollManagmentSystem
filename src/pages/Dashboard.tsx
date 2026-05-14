import { Bell, Clock3, Landmark, Users } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { adminDashboardFocus, hrDashboardFocus } from "@/components/layout/navigation";
import { dashboardApi } from "@/services/dashboardApi";
import { notificationApi } from "@/services/notificationApi";
import { vacationApi } from "@/services/vacationApi";

export default function Dashboard({ role }: { role: "admin" | "hr" }) {
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

  const stats = statsQuery.data;
  const focusItems = role === "admin" ? adminDashboardFocus : hrDashboardFocus;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={role === "admin" ? "Admin Dashboard" : "HR Dashboard"}
        description={
          role === "admin"
            ? "A full system dashboard for user access, payroll oversight, employee operations, and audit review."
            : "An operational dashboard focused on employee records, attendance, payroll review, and leave handling."
        }
      />

      <QuickActions role={role} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total employees" value={stats?.total_emps ?? 0} icon={Users} />
        <MetricCard label="Active employees" value={stats?.total_active_emps ?? 0} icon={Users} tone="success" />
        <MetricCard
          label="Attendance rate"
          value={`${Number(stats?.total_att_percent || 0).toFixed(1)}%`}
          icon={Clock3}
          tone="info"
        />
        <MetricCard label="Employees on vacation" value={stats?.total_vacation ?? 0} icon={Landmark} tone="warning" />
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
            <CardTitle>Operational focus</CardTitle>
            <CardDescription>Role-based quick direction for today.</CardDescription>
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
            <CardTitle>Current vacations</CardTitle>
            <CardDescription>Live leave records from `/vacation/current`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentVacationsQuery.data?.length ? (
              currentVacationsQuery.data.slice(0, 5).map((vacation) => (
                <div key={vacation.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">Employee #{vacation.employee_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {vacation.start_date} to {vacation.end_date}
                    </p>
                  </div>
                  <StatusBadge status={String(vacation.vacation_status)} />
                </div>
              ))
            ) : (
              <EmptyState
                title={currentVacationsQuery.isLoading ? "Loading current vacations..." : "No active vacations"}
                description="Approved leave for the current date range will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
          <CardDescription>Unread and recent personal notifications from the `/me` notification feed.</CardDescription>
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
              title={notificationsQuery.isLoading ? "Loading notifications..." : "No recent notifications"}
              description="Personal backend notifications will appear here after login."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
