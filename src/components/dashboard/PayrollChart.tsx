import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PayrollChart({
  activeEmployees = 0,
  totalEmployees = 0,
}: {
  activeEmployees?: number;
  totalEmployees?: number;
}) {
  const inactiveEmployees = Math.max(totalEmployees - activeEmployees, 0);
  const data = [
    { name: "Active", value: activeEmployees, color: "hsl(var(--chart-1))" },
    { name: "Inactive", value: inactiveEmployees, color: "hsl(var(--muted-foreground) / 0.35)" },
  ].filter((item) => item.value > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Workforce Status</CardTitle>
        <CardDescription>Active versus inactive employees from live stats.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div className="relative h-64">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-semibold">{totalEmployees}</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Employees</span>
            </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: "No employees", value: 1, color: "hsl(var(--muted))" }]}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={102}
              paddingAngle={4}
              cornerRadius={10}
              dataKey="value"
            >
              {(data.length ? data : [{ name: "No employees", value: 1, color: "hsl(var(--muted))" }]).map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "16px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {[
              { label: "Active employees", value: activeEmployees, color: "bg-chart-1" },
              { label: "Inactive employees", value: inactiveEmployees, color: "bg-muted-foreground/35" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 p-4">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-display text-2xl font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
      </div>
      </CardContent>
    </Card>
  );
}
