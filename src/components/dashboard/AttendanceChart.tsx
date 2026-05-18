import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AttendanceChart({ attendancePercent = 0 }: { attendancePercent?: number }) {
  const { t } = useTranslation();
  const safePercent = Math.max(0, Math.min(100, Number(attendancePercent) || 0));
  const chartData = [{ name: t("nav.attendance"), value: safePercent, fill: "hsl(var(--chart-1))" }];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t("charts.attendanceHealth")}</CardTitle>
        <CardDescription>{t("charts.attendanceHealthDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-64">
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-7">
            <span className="font-display text-5xl font-semibold">{safePercent.toFixed(1)}%</span>
            <span className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("charts.today")}</span>
          </div>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={chartData} startAngle={210} endAngle={-30} innerRadius="76%" outerRadius="100%" barSize={18}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={999} fill="hsl(var(--chart-1))" />
          </RadialBarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
