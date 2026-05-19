import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "info" | "danger";
  hint?: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : tone === "info"
          ? "bg-info/10 text-info"
          : tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary";

  return (
    <Card className="group overflow-hidden">
      <CardContent className="relative flex items-start gap-4 p-5">
        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-current/10 transition-transform duration-300 group-hover:scale-105", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <div className="mt-1 overflow-hidden text-wrap break-words font-display text-2xl font-semibold leading-tight sm:text-3xl">
            {value}
          </div>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
