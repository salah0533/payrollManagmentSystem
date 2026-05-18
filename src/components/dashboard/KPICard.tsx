import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function KPICard({ title, value, subtitle, icon: Icon, trend, variant = "default", className }: KPICardProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("kpi-card animate-fade-in", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="kpi-value font-bold text-foreground">{value}</p>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          {trend ? (
            <p
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive",
              )}
            >
              {trend.isPositive ? "+" : "-"} {Math.abs(trend.value)}%
              <span className="ml-1 font-normal text-muted-foreground">{t("common.vsLastMonth")}</span>
            </p>
          ) : null}
        </div>
        <div className={cn("rounded-xl p-3", variantStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
