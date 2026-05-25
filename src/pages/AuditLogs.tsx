import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatLabel } from "@/lib/format";
import { auditApi } from "@/services/auditApi";
import { useTranslation } from "react-i18next";

export default function AuditLogs() {
  const { t } = useTranslation();
  const [limit, setLimit] = useState("100");
  const parsedLimit = Number(limit) || 100;

  const auditQuery = useQuery({
    queryKey: ["audit-logs", parsedLimit],
    queryFn: () => auditApi.list(parsedLimit),
  });

  const formatAuditCode = (value?: string | null) => {
    if (!value) {
      return t("common.notAvailable");
    }

    const normalized = String(value)
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();

    return t(`auditPage.codes.${normalized}`, {
      defaultValue: formatLabel(normalized),
    });
  };

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
          <CardTitle>{t("auditPage.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {auditQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auditPage.when")}</TableHead>
                  <TableHead>{t("auditPage.action")}</TableHead>
                  <TableHead>{t("auditPage.entity")}</TableHead>
                  <TableHead>{t("auditPage.user")}</TableHead>
                  <TableHead>{t("auditPage.entityId")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{formatAuditCode(row.action)}</TableCell>
                    <TableCell>{formatAuditCode(row.entity_type)}</TableCell>
                    <TableCell>{row.user_id != null ? t("labels.userId", { id: row.user_id }) : t("common.notAvailable")}</TableCell>
                    <TableCell>{row.entity_id != null ? row.entity_id : t("common.notAvailable")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={auditQuery.isLoading ? t("auditPage.loading") : t("auditPage.empty")}
              description={t("auditPage.emptyDescription")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
