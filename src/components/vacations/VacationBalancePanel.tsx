import { EmptyState } from "@/components/app/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { VacationBalance } from "@/types/domain";
import { useTranslation } from "react-i18next";

export function VacationBalancePanel({
  balance,
  isLoading,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: {
  balance?: VacationBalance;
  isLoading?: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { t } = useTranslation();
  const currentYear = balance?.current_year_balance ?? null;
  const years = (balance?.years || []).slice().sort((left, right) => right.year - left.year);
  const formatSource = (item: VacationBalance["years"][number]) => {
    if (item.entitlement_source === "employee_year") {
      return t("vacationBalance.source.employeeYear");
    }
    if (
      item.entitlement_source === "fallback_previous_employee_year" &&
      item.entitlement_source_year
    ) {
      return t("vacationBalance.source.fromYear", { year: item.entitlement_source_year });
    }
    if (item.entitlement_source === "employee_default") {
      return t("vacationBalance.source.employeeDefault");
    }
    return t("vacationBalance.source.notConfigured");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <EmptyState
            title={t("vacationBalance.loading")}
            description={t("vacationBalance.loadingDescription")}
          />
        ) : !balance ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("vacationBalance.currentYear")}
                </p>
                <p className="mt-2 text-2xl font-semibold">{balance.current_year}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("vacationBalance.available")}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {currentYear?.available_days ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("vacationBalance.consumed")}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {currentYear?.consumed_days ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("vacationBalance.carryover")}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {currentYear?.active_carryover_days ?? 0}
                </p>
              </div>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("annualEntitlements.year")}</TableHead>
                    <TableHead>{t("vacationBalance.entitlement")}</TableHead>
                    <TableHead>{t("vacationBalance.carryover")}</TableHead>
                    <TableHead>{t("vacationBalance.consumed")}</TableHead>
                    <TableHead>{t("vacationBalance.pending")}</TableHead>
                    <TableHead>{t("vacationBalance.available")}</TableHead>
                    <TableHead>{t("vacationBalance.nextCarryover")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((item) => (
                    <TableRow key={item.year}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.year}</p>
                          <p className="text-xs text-muted-foreground">{formatSource(item)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.entitlement_days}</TableCell>
                      <TableCell>
                        <div>
                          <p>{item.active_carryover_days}</p>
                          {item.carryover_expires_on ? (
                            <p className="text-xs text-muted-foreground">
                              {t("vacationBalance.expires", {
                                date: formatDate(item.carryover_expires_on),
                              })}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{item.consumed_days}</TableCell>
                      <TableCell>{item.pending_request_days}</TableCell>
                      <TableCell>{item.available_days}</TableCell>
                      <TableCell>{item.carryover_to_next_year}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
