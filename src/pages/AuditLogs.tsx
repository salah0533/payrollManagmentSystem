import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatLabel } from "@/lib/format";
import { auditApi } from "@/services/auditApi";
import type { AuditLog } from "@/types/domain";

type AuditPreset =
  | "all"
  | "hr_employee_additions"
  | "employee_records"
  | "user_access"
  | "payroll_activity"
  | "attendance_activity";

const ATTENDANCE_ACTIONS = [
  "attendance_correction",
  "attendance_delete_day",
  "attendance_mark_present",
  "attendance_review_status_updated",
  "attendance_smart_status_correction",
  "auto_attendance_generated",
];

const USER_ACCESS_ACTIONS = [
  "login",
  "user_created",
  "user_updated",
  "user_activated",
  "user_disabled",
  "user_deleted",
  "password_reset",
  "password_changed",
  "role_assigned",
  "role_removed",
];

const AUDIT_DETAIL_PRIORITY = [
  "fullname",
  "full_name",
  "username",
  "position",
  "status",
  "email",
  "phone",
  "hire_date",
  "roles",
  "roles_added",
  "deleted_at",
];

const AUDIT_PRESET_CONFIG: Record<
  AuditPreset,
  { actions?: string[]; entityTypes?: string[]; actorRole?: string | null }
> = {
  all: {},
  hr_employee_additions: {
    actions: ["employee_created"],
    entityTypes: ["Employee"],
    actorRole: "hr",
  },
  employee_records: {
    entityTypes: ["Employee"],
  },
  user_access: {
    actions: USER_ACCESS_ACTIONS,
    entityTypes: ["User"],
  },
  payroll_activity: {
    actions: ["payroll_recalculated"],
    entityTypes: ["EmployeePayroll"],
  },
  attendance_activity: {
    actions: ATTENDANCE_ACTIONS,
  },
};

function normalizeAuditCode(value?: string | null) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export default function AuditLogs() {
  const { t } = useTranslation();
  const [limit, setLimit] = useState("150");
  const [preset, setPreset] = useState<AuditPreset>("hr_employee_additions");
  const [actorRole, setActorRole] = useState("all");
  const [actorUserId, setActorUserId] = useState("all");
  const [search, setSearch] = useState("");

  const parsedLimit = Number(limit) || 150;
  const presetConfig = AUDIT_PRESET_CONFIG[preset];
  const effectiveActorRole =
    actorRole === "all" ? (presetConfig.actorRole ?? null) : actorRole === "system" ? null : actorRole;
  const effectiveActorUserId = actorUserId === "all" ? null : Number(actorUserId);

  const auditQuery = useQuery({
    queryKey: ["audit-logs", parsedLimit, preset, effectiveActorRole, effectiveActorUserId],
    queryFn: () =>
      auditApi.list({
        limit: parsedLimit,
        actions: presetConfig.actions,
        entityTypes: presetConfig.entityTypes,
        actorRole: effectiveActorRole,
        actorUserId: Number.isFinite(effectiveActorUserId) ? effectiveActorUserId : null,
      }),
  });

  const formatAuditCode = (value?: string | null) => {
    if (!value) {
      return t("common.notAvailable");
    }

    const normalized = normalizeAuditCode(value);
    return t(`auditPage.codes.${normalized}`, {
      defaultValue: formatLabel(normalized),
    });
  };

  const formatAuditRole = (role?: string | null) => {
    if (!role) {
      return t("common.notAvailable");
    }

    return t(`role.${role}`, { defaultValue: formatLabel(role) });
  };

  const summarizeValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return t("common.notAvailable");
    }
    if (typeof value === "boolean") {
      return value ? t("common.yes") : t("common.no");
    }
    if (Array.isArray(value)) {
      return value.map((item) => formatLabel(String(item))).join(", ");
    }
    if (typeof value === "object") {
      return t("auditPage.objectChanged");
    }
    return String(value);
  };

  const buildDetailItems = (row: AuditLog) => {
    const details: Array<{ label: string; value: string }> = [];
    if (row.ip_address) {
      details.push({ label: t("auditPage.ipAddress"), value: row.ip_address });
    }

    const oldData: Record<string, unknown> =
      row.old_data_json && typeof row.old_data_json === "object" ? row.old_data_json : {};
    const newData: Record<string, unknown> =
      row.new_data_json && typeof row.new_data_json === "object" ? row.new_data_json : {};
    const orderedKeys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])].sort((left, right) => {
      const leftIndex = AUDIT_DETAIL_PRIORITY.indexOf(left);
      const rightIndex = AUDIT_DETAIL_PRIORITY.indexOf(right);
      const resolvedLeft = leftIndex === -1 ? AUDIT_DETAIL_PRIORITY.length : leftIndex;
      const resolvedRight = rightIndex === -1 ? AUDIT_DETAIL_PRIORITY.length : rightIndex;
      return resolvedLeft - resolvedRight || left.localeCompare(right);
    });

    for (const key of orderedKeys) {
      if (details.length >= 3) {
        break;
      }

      const oldValue = oldData[key];
      const newValue = newData[key];
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      const value = newValue ?? oldValue;
      details.push({
        label: t(`auditPage.fields.${normalizeAuditCode(key)}`, { defaultValue: formatLabel(key) }),
        value: summarizeValue(value),
      });
    }

    if (!details.length && row.user_agent) {
      details.push({ label: t("auditPage.userAgent"), value: row.user_agent });
    }

    return details;
  };

  const actorOptions = useMemo(() => {
    const actorMap = new Map<number, { value: string; label: string }>();
    for (const row of auditQuery.data || []) {
      if (!row.actor) {
        continue;
      }

      const identityBits = [`#${row.actor.id}`];
      if (row.actor.employee_id) {
        identityBits.push(`EMP-${row.actor.employee_id}`);
      }

      actorMap.set(row.actor.id, {
        value: String(row.actor.id),
        label: row.actor.employee_name
          ? `${row.actor.employee_name} (${row.actor.username}) ${identityBits.join(" ")}`
          : `${row.actor.username} ${identityBits.join(" ")}`,
      });
    }

    return [...actorMap.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [auditQuery.data]);

  const filteredRows = useMemo(() => {
    let rows = auditQuery.data || [];

    if (actorRole === "system") {
      rows = rows.filter((row) => !row.actor);
    }

    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = [
        row.id,
        row.user_id,
        row.entity_id,
        row.action,
        row.entity_type,
        row.entity_label,
        row.actor?.id,
        row.actor?.username,
        row.actor?.employee_id,
        row.actor?.employee_name,
        row.actor?.email,
        ...(row.actor?.roles || []),
        row.entity_employee?.id,
        row.entity_employee?.full_name,
        row.entity_employee?.email,
        row.entity_employee?.phone,
        row.entity_employee?.position,
        row.entity_employee?.user_id,
        row.entity_user?.id,
        row.entity_user?.username,
        row.entity_user?.employee_id,
        row.entity_user?.employee_name,
        row.entity_user?.email,
        row.ip_address,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const snapshot = [row.old_data_json, row.new_data_json]
        .filter((value) => value && typeof value === "object")
        .map((value) => JSON.stringify(value).toLowerCase());

      return [...haystack, ...snapshot].some((value) => value.includes(searchTerm));
    });
  }, [actorRole, auditQuery.data, search]);

  const renderActor = (row: AuditLog) => {
    if (!row.actor) {
      return <span className="text-sm text-muted-foreground">{t("auditPage.systemActor")}</span>;
    }

    return (
      <div className="space-y-1">
        <p className="font-medium">{row.actor.employee_name || row.actor.username}</p>
        <p className="text-xs text-muted-foreground">
          {t("labels.userId", { id: row.actor.id })}
          {row.actor.employee_id ? ` | ${t("labels.employeeId", { id: row.actor.employee_id })}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">{row.actor.username}</p>
        {row.actor.email ? <p className="text-xs text-muted-foreground">{row.actor.email}</p> : null}
        {row.actor.roles.length ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {row.actor.roles.map((role) => (
              <Badge key={`${row.id}-${role}`} variant="outline">
                {formatAuditRole(role)}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderTarget = (row: AuditLog) => {
    if (row.entity_employee) {
      return (
        <div className="space-y-1">
          <p className="font-medium">{row.entity_employee.full_name || row.entity_label}</p>
          <p className="text-xs text-muted-foreground">
            {t("labels.employeeId", { id: row.entity_employee.id })}
            {row.entity_employee.user_id ? ` | ${t("labels.userId", { id: row.entity_employee.user_id })}` : ""}
          </p>
          {row.entity_employee.position ? <p className="text-xs text-muted-foreground">{row.entity_employee.position}</p> : null}
          {row.entity_employee.email ? <p className="text-xs text-muted-foreground">{row.entity_employee.email}</p> : null}
          {row.entity_employee.phone ? <p className="text-xs text-muted-foreground">{row.entity_employee.phone}</p> : null}
        </div>
      );
    }

    if (row.entity_user) {
      return (
        <div className="space-y-1">
          <p className="font-medium">{row.entity_user.employee_name || row.entity_user.username}</p>
          <p className="text-xs text-muted-foreground">
            {t("labels.userId", { id: row.entity_user.id })}
            {row.entity_user.employee_id ? ` | ${t("labels.employeeId", { id: row.entity_user.employee_id })}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">{row.entity_user.username}</p>
          {row.entity_user.email ? <p className="text-xs text-muted-foreground">{row.entity_user.email}</p> : null}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="font-medium">{row.entity_label || formatAuditCode(row.entity_type)}</p>
        <p className="text-xs text-muted-foreground">
          {formatAuditCode(row.entity_type)}
          {row.entity_id != null ? ` | #${row.entity_id}` : ""}
        </p>
      </div>
    );
  };

  const hasServerRows = Boolean((auditQuery.data || []).length);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("auditPage.title")}
        description={t("auditPage.description")}
        actions={
          <>
            <Input
              className="w-28"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              type="number"
              min="1"
              max="500"
            />
            <Button variant="outline" onClick={() => auditQuery.refetch()}>
              {t("common.refresh")}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("auditPage.filtersTitle")}</CardTitle>
          <CardDescription>{t("auditPage.filtersDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("auditPage.preset")}</p>
            <Select value={preset} onValueChange={(value) => setPreset(value as AuditPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditPage.presets.all")}</SelectItem>
                <SelectItem value="hr_employee_additions">{t("auditPage.presets.hrEmployeeAdditions")}</SelectItem>
                <SelectItem value="employee_records">{t("auditPage.presets.employeeRecords")}</SelectItem>
                <SelectItem value="user_access">{t("auditPage.presets.userAccess")}</SelectItem>
                <SelectItem value="payroll_activity">{t("auditPage.presets.payrollActivity")}</SelectItem>
                <SelectItem value="attendance_activity">{t("auditPage.presets.attendanceActivity")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("auditPage.actorRole")}</p>
            <Select
              value={actorRole}
              onValueChange={(value) => {
                setActorRole(value);
                if (value === "system") {
                  setActorUserId("all");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditPage.actorRoles.all")}</SelectItem>
                <SelectItem value="admin">{t("auditPage.actorRoles.admin")}</SelectItem>
                <SelectItem value="hr">{t("auditPage.actorRoles.hr")}</SelectItem>
                <SelectItem value="employee">{t("auditPage.actorRoles.employee")}</SelectItem>
                <SelectItem value="system">{t("auditPage.actorRoles.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("auditPage.actor")}</p>
            <Select value={actorUserId} onValueChange={setActorUserId} disabled={actorRole === "system"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditPage.allActors")}</SelectItem>
                {actorOptions.map((actor) => (
                  <SelectItem key={actor.value} value={actor.value}>
                    {actor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.search")}</p>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("auditPage.searchPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("auditPage.recentActivity")}</CardTitle>
          <CardDescription>
            {t("auditPage.showingCount", {
              visible: filteredRows.length,
              total: auditQuery.data?.length || 0,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auditPage.when")}</TableHead>
                  <TableHead>{t("auditPage.action")}</TableHead>
                  <TableHead>{t("auditPage.actor")}</TableHead>
                  <TableHead>{t("auditPage.target")}</TableHead>
                  <TableHead>{t("auditPage.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const detailItems = buildDetailItems(row);
                  return (
                    <TableRow key={row.id} className="align-top">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{formatDateTime(row.created_at)}</p>
                          <p className="text-xs text-muted-foreground">#{row.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <p className="font-medium">{formatAuditCode(row.action)}</p>
                          <Badge variant="outline">{formatAuditCode(row.entity_type)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{renderActor(row)}</TableCell>
                      <TableCell>{renderTarget(row)}</TableCell>
                      <TableCell>
                        {detailItems.length ? (
                          <div className="space-y-2">
                            {detailItems.map((item, index) => (
                              <div key={`${row.id}-detail-${index}`} className="space-y-1">
                                <p className="text-xs font-medium text-foreground">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t("common.notAvailable")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={
                auditQuery.isLoading
                  ? t("auditPage.loading")
                  : hasServerRows
                    ? t("auditPage.noMatchingLogs")
                    : t("auditPage.empty")
              }
              description={
                auditQuery.isLoading
                  ? t("auditPage.emptyDescription")
                  : hasServerRows
                    ? t("auditPage.noMatchingLogsDescription")
                    : t("auditPage.emptyDescription")
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
