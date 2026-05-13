import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { auditApi } from "@/services/auditApi";

export default function AuditLogs() {
  const [limit, setLimit] = useState("100");
  const parsedLimit = Number(limit) || 100;

  const auditQuery = useQuery({
    queryKey: ["audit-logs", parsedLimit],
    queryFn: () => auditApi.list(parsedLimit),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Recent backend audit records for system actions, approvals, and changes."
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
              Refresh
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {auditQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.entity_type}</TableCell>
                    <TableCell>{row.user_id ?? "-"}</TableCell>
                    <TableCell>{row.entity_id ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={auditQuery.isLoading ? "Loading audit logs..." : "No audit logs found"}
              description="If this endpoint is enabled, the latest backend audit entries will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
