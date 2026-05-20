import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardTone = "default" | "success" | "warning" | "info" | "danger";

const toneClasses: Record<DashboardTone, string> = {
  default: "bg-primary/10 text-primary ring-primary/15",
  success: "bg-success/10 text-success ring-success/15",
  warning: "bg-warning/15 text-warning ring-warning/20",
  info: "bg-info/10 text-info ring-info/15",
  danger: "bg-destructive/10 text-destructive ring-destructive/15",
};

export function DashboardHero({
  kicker,
  title,
  description,
  meta,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  meta?: Array<{ label: string; value: string }>;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(220_39%_14%))] p-5 text-primary-foreground shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.9)] sm:p-6 lg:p-7">
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">{kicker}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-primary-foreground/78 sm:text-base">
            {description}
          </p>
          {meta?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {meta.map((item) => (
                <span
                  key={`${item.label}-${item.value}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90"
                >
                  <span className="text-primary-foreground/55">{item.label}</span>
                  {item.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {children ? <div className="min-w-0 lg:min-w-[17rem]">{children}</div> : null}
      </div>
    </section>
  );
}

export function DashboardSection({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function DashboardStatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  footer,
  isLoading = false,
}: {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon: LucideIcon;
  tone?: DashboardTone;
  footer?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_72px_-42px_hsl(var(--foreground)/0.82)]">
      <CardContent className="flex min-h-[9.5rem] flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <div className="mt-2 break-words font-display text-3xl font-semibold leading-none text-foreground">
              {isLoading ? <Skeleton className="h-9 w-24" /> : value}
            </div>
          </div>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105",
              toneClasses[tone],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4 min-h-5">
          {isLoading ? (
            <Skeleton className="h-4 w-36" />
          ) : footer ? (
            footer
          ) : description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardQuickAction({
  to,
  icon: Icon,
  label,
  description,
  tone = "default",
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  description: string;
  tone?: DashboardTone;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[7.25rem] items-start gap-4 rounded-[1.15rem] border border-white/70 bg-card/85 p-4 shadow-[0_16px_48px_-42px_hsl(var(--foreground)/0.8)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
          toneClasses[tone],
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 font-semibold text-foreground">
          <span>{label}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

export function ChartCard({
  title,
  description,
  children,
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  errorTitle,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  errorTitle: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <DashboardLoadingBlock />
        ) : isError ? (
          <DashboardErrorState title={errorTitle} />
        ) : isEmpty ? (
          <DashboardEmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardLoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-44 w-full rounded-[1rem]" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-[1rem]" />
        ))}
      </div>
    </div>
  );
}

export function DashboardEmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.15rem] border border-dashed border-primary/25 bg-muted/25 text-center",
        compact ? "px-4 py-5" : "px-6 py-9",
      )}
    >
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-primary/35" />
      <p className="font-semibold text-foreground">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function DashboardErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-[1.15rem] border border-destructive/20 bg-destructive/5 px-5 py-5 text-sm text-destructive">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{title}</p>
          {description ? <p className="mt-1 text-destructive/75">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function InsightRow({
  icon: Icon,
  title,
  description,
  meta,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  tone?: DashboardTone;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1rem] border border-border/70 bg-card/50 p-3.5">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset", toneClasses[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-foreground">{title}</p>
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
        {description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
