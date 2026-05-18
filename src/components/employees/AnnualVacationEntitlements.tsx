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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        title: t("annualEntitlements.invalidYear"),
        description: t("annualEntitlements.invalidYearDescription"),
        variant: "destructive",
      });
      return;
    }
    if (!Number.isInteger(allowedDays) || allowedDays <= 0) {
      toast({
        title: t("annualEntitlements.invalidDays"),
        description: t("annualEntitlements.invalidDaysDescription"),
        variant: "destructive",
      });
      return;
    }
    if (rows.filter((item) => item.year.trim() === String(year)).length > 1) {
      toast({
        title: t("annualEntitlements.duplicateYear"),
        description: t("annualEntitlements.duplicateYearDescription"),
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
        title: t("annualEntitlements.saveSuccess"),
        description: t("annualEntitlements.saveSuccessDescription", { year }),
      });
      await refreshLeaveData();
    } catch (error) {
      toast({
        title: t("annualEntitlements.saveError"),
        description: getErrorMessage(error, t("annualEntitlements.saveErrorDescription")),
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
        title: t("annualEntitlements.deleteSuccess"),
        description: t("annualEntitlements.deleteSuccessDescription", { year: row.persisted_year }),
      });
      await refreshLeaveData();
    } catch (error) {
      toast({
        title: t("annualEntitlements.deleteError"),
        description: getErrorMessage(error, t("annualEntitlements.deleteErrorDescription")),
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
            <p className="font-medium">{t("annualEntitlements.title")}</p>
            <p className="text-sm text-muted-foreground">
              {t("annualEntitlements.description")}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" />
            {t("annualEntitlements.addYear")}
          </Button>
        </div>

        <div className="mt-4 overflow-auto">
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>{t("annualEntitlements.year")}</TableHead>
                  <TableHead>{t("annualEntitlements.annualDays")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length ? (
                sortedRows.map((row) => (
                  <TableRow key={row.local_id}>
                    <TableCell>
                      <Label className="sr-only" htmlFor={`entitlement-year-${row.local_id}`}>{t("annualEntitlements.year")}</Label>
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
                      <Label className="sr-only" htmlFor={`entitlement-days-${row.local_id}`}>{t("annualEntitlements.annualDays")}</Label>
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
                          {savingRowId === row.local_id ? t("common.saving") : t("common.save")}
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
                    {entitlementsQuery.isLoading ? t("annualEntitlements.loading") : t("annualEntitlements.empty")}
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
        title={t("vacationsPage.annualBalanceTitle")}
        description={t("annualEntitlements.balanceDescription")}
        emptyTitle={t("vacationsPage.noBalance")}
        emptyDescription={t("annualEntitlements.balanceEmptyDescription")}
      />
    </div>
  );
}
