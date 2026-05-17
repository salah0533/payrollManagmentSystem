import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { VacationBalancePanel } from "@/components/vacations/VacationBalancePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { vacationApi } from "@/services/vacationApi";
import type { AnnualVacationEntitlement } from "@/types/domain";
import { toast } from "@/hooks/use-toast";

type EditableEntitlementRow = {
  local_id: string;
  year: string;
  allowed_days: string;
  persisted_year?: number;
};

function toEditableRow(item: AnnualVacationEntitlement): EditableEntitlementRow {
  return {
    local_id: `${item.employee_id}-${item.year}`,
    year: String(item.year),
    allowed_days: String(item.allowed_days),
    persisted_year: item.year,
  };
}

export function AnnualVacationEntitlements({
  employeeId,
}: {
  employeeId: number;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<EditableEntitlementRow[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

  const entitlementsQuery = useQuery({
    queryKey: ["annual-vacations", employeeId],
    queryFn: () => vacationApi.listAnnualEntitlements(employeeId),
    enabled: Boolean(employeeId),
  });

  const balanceQuery = useQuery({
    queryKey: ["vacation-balance", "employee-editor", employeeId],
    queryFn: () => vacationApi.getBalance(employeeId),
    enabled: Boolean(employeeId),
  });

  useEffect(() => {
    if (!entitlementsQuery.data) {
      return;
    }
    setRows(entitlementsQuery.data.map(toEditableRow));
  }, [entitlementsQuery.data]);

  const sortedRows = useMemo(
    () =>
      rows.slice().sort((left, right) => {
        const leftYear = Number(left.year);
        const rightYear = Number(right.year);
        if (!Number.isFinite(leftYear) && !Number.isFinite(rightYear)) {
          return 0;
        }
        if (!Number.isFinite(leftYear)) {
          return 1;
        }
        if (!Number.isFinite(rightYear)) {
          return -1;
        }
        return leftYear - rightYear;
      }),
    [rows],
  );

  const refreshLeaveData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["annual-vacations", employeeId] });
    await queryClient.invalidateQueries({ queryKey: ["vacation-balance"] });
  };

  const addRow = () => {
    const highestYear = rows.reduce((maxYear, row) => {
      const parsed = Number(row.year);
      return Number.isFinite(parsed) ? Math.max(maxYear, parsed) : maxYear;
    }, new Date().getFullYear() - 1);

    setRows((current) => [
      ...current,
      {
        local_id: `new-${Date.now()}`,
        year: String(highestYear + 1),
        allowed_days: "",
      },
    ]);
  };

  const updateRow = (localId: string, field: "year" | "allowed_days", value: string) => {
    setRows((current) =>
      current.map((row) => (row.local_id === localId ? { ...row, [field]: value } : row)),
    );
  };

  const saveRow = async (row: EditableEntitlementRow) => {
    const year = Number(row.year);
    const allowedDays = Number(row.allowed_days);

    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      toast({
        title: "Invalid entitlement year",
        description: "Please enter a valid 4-digit year.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isInteger(allowedDays) || allowedDays <= 0) {
      toast({
        title: "Invalid annual days",
        description: "Annual vacation days must be greater than zero.",
        variant: "destructive",
      });
      return;
    }
    if (rows.filter((item) => item.year.trim() === String(year)).length > 1) {
      toast({
        title: "Duplicate year",
        description: "Each employee can only have one annual entitlement row per year.",
        variant: "destructive",
      });
      return;
    }

    setSavingRowId(row.local_id);
    try {
      if (row.persisted_year === undefined) {
        await vacationApi.createAnnualEntitlement({
          emp_id: employeeId,
          year,
          allowed_days: allowedDays,
        });
      } else if (row.persisted_year === year) {
        await vacationApi.updateAnnualEntitlement({
          emp_id: employeeId,
          year,
          allowed_days: allowedDays,
        });
      } else {
        await vacationApi.createAnnualEntitlement({
          emp_id: employeeId,
          year,
          allowed_days: allowedDays,
        });
        await vacationApi.deleteAnnualEntitlement({
          emp_id: employeeId,
          year: row.persisted_year,
        });
      }

      toast({
        title: "Entitlement saved",
        description: `Annual vacation days for ${year} were updated.`,
      });
      await refreshLeaveData();
    } catch (error) {
      toast({
        title: "Unable to save entitlement",
        description: getErrorMessage(error, "Please review the year and allowed days."),
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const deleteRow = async (row: EditableEntitlementRow) => {
    if (row.persisted_year === undefined) {
      setRows((current) => current.filter((item) => item.local_id !== row.local_id));
      return;
    }

    setDeletingRowId(row.local_id);
    try {
      await vacationApi.deleteAnnualEntitlement({
        emp_id: employeeId,
        year: row.persisted_year,
      });
      toast({
        title: "Entitlement deleted",
        description: `The ${row.persisted_year} entitlement row was removed.`,
      });
      await refreshLeaveData();
    } catch (error) {
      toast({
        title: "Unable to delete entitlement",
        description: getErrorMessage(error, "The entitlement row could not be removed."),
        variant: "destructive",
      });
    } finally {
      setDeletingRowId(null);
    }
  };

  return (
    <div className="space-y-4 md:col-span-2">
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">Yearly annual vacation entitlements</p>
            <p className="text-sm text-muted-foreground">
              These rows are the source of truth for this employee&apos;s yearly allowance. If no rows exist yet, the bootstrap default above is used.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add year
          </Button>
        </div>

        <div className="mt-4 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Annual days</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length ? (
                sortedRows.map((row) => (
                  <TableRow key={row.local_id}>
                    <TableCell>
                      <Label className="sr-only" htmlFor={`entitlement-year-${row.local_id}`}>Year</Label>
                      <Input
                        id={`entitlement-year-${row.local_id}`}
                        type="number"
                        min={1900}
                        max={3000}
                        value={row.year}
                        onChange={(event) => updateRow(row.local_id, "year", event.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Label className="sr-only" htmlFor={`entitlement-days-${row.local_id}`}>Annual days</Label>
                      <Input
                        id={`entitlement-days-${row.local_id}`}
                        type="number"
                        min={1}
                        value={row.allowed_days}
                        onChange={(event) => updateRow(row.local_id, "allowed_days", event.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingRowId === row.local_id}
                          onClick={() => saveRow(row)}
                        >
                          {savingRowId === row.local_id ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={deletingRowId === row.local_id}
                          onClick={() => deleteRow(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    {entitlementsQuery.isLoading ? "Loading yearly entitlements..." : "No yearly entitlements configured yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <VacationBalancePanel
        balance={balanceQuery.data}
        isLoading={balanceQuery.isLoading}
        title="Annual vacation balance"
        description="Live balance from the backend after employee-specific entitlement and carryover rules are applied."
        emptyTitle="No balance available"
        emptyDescription="Save an employee and add yearly entitlement rows to see the balance ledger."
      />
    </div>
  );
}
