import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/lib/format";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "14px",
  boxShadow: "0 18px 42px -28px hsl(var(--foreground) / 0.65)",
};

export type DonutDatum = {
  name: string;
  value: number;
  color: string;
};

export type AttendanceTrendDatum = {
  date: string;
  label: string;
  present: number;
  late: number;
  absent: number;
  incomplete: number;
};

export type PayrollStatusDatum = {
  status: string;
  count: number;
  amount: number;
  color: string;
};

export type SimpleBarDatum = {
  name: string;
  value: number;
  color: string;
};

export function EmployeeStatusDonut({
  active,
  inactive,
}: {
  active: number;
  inactive: number;
}) {
  const { t } = useTranslation();
  const total = active + inactive;
  const data: DonutDatum[] = [
    { name: t("charts.activeEmployees"), value: active, color: "hsl(var(--chart-1))" },
    { name: t("charts.inactiveEmployees"), value: inactive, color: "hsl(var(--chart-4))" },
  ].filter((item) => item.value > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.78fr] lg:items-center">
      <div className="relative h-64 min-h-64">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-semibold">{formatNumber(total)}</span>
          <span className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("charts.employees")}
          </span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={74}
              outerRadius={104}
              paddingAngle={4}
              cornerRadius={9}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-[1rem] border border-border/70 bg-muted/20 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate text-sm text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-display text-2xl font-semibold">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceTrendChart({ data }: { data: AttendanceTrendDatum[] }) {
  const { t } = useTranslation();

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="attendancePresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.34} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="attendanceLate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.26} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) => [formatNumber(value), t(`charts.series.${name}`, { defaultValue: name })]}
            labelFormatter={(label) => t("charts.dateLabel", { date: label })}
            contentStyle={tooltipStyle}
          />
          <Legend formatter={(value) => t(`charts.series.${value}`, { defaultValue: value })} />
          <Area type="monotone" dataKey="present" stroke="hsl(var(--chart-1))" fill="url(#attendancePresent)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="late" stroke="hsl(var(--chart-2))" fill="url(#attendanceLate)" strokeWidth={2} />
          <Area type="monotone" dataKey="absent" stroke="hsl(var(--chart-4))" fill="transparent" strokeWidth={2} />
          <Area type="monotone" dataKey="incomplete" stroke="hsl(var(--chart-3))" fill="transparent" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PayrollStatusChart({ data }: { data: PayrollStatusDatum[] }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "amount") {
                  return [formatCurrency(value), t("charts.series.amount")];
                }
                return [formatNumber(value), t("charts.series.count")];
              }}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="count" radius={[10, 10, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.status} className="rounded-[1rem] border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-sm font-medium">{item.status}</span>
              </div>
              <span className="text-sm font-semibold">{formatNumber(item.count)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleBarChart({ data }: { data: SimpleBarDatum[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
