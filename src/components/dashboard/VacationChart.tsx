import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";

export function VacationChart({
  totalEmployees = 0,
  employeesOnVacation = 0,
}: {
  totalEmployees?: number;
  employeesOnVacation?: number;
}) {
  const { t } = useTranslation();
  const available = Math.max(totalEmployees - employeesOnVacation, 0);
  const vacationPercent = totalEmployees > 0 ? (employeesOnVacation / totalEmployees) * 100 : 0;
  const chartData = [
    { status: t("charts.available"), employees: available, fill: "hsl(var(--chart-1))" },
    { status: t("charts.onLeave"), employees: employeesOnVacation, fill: "hsl(var(--chart-2))" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t("charts.vacationImpact")}</CardTitle>
        <CardDescription>{t("charts.vacationImpactDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 rounded-2xl bg-accent/45 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">{t("charts.onVacation")}</p>
              <p className="mt-1 font-display text-4xl font-semibold">{employeesOnVacation}</p>
            </div>
            <p className="rounded-full bg-card/70 px-3 py-1 text-sm font-semibold text-primary">
              {formatNumber(vacationPercent, true)}%
            </p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent) / 0.35)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                }}
              />
              <Bar dataKey="employees" radius={[12, 12, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
