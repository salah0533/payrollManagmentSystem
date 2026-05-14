import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardRole = 'admin' | 'hr' | 'employee';

interface HeaderMetric {
  label: string;
  value: string | number;
}

interface DashboardHeaderProps {
  role: DashboardRole;
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  metrics?: HeaderMetric[];
  children?: ReactNode;
}

const roleStyles: Record<DashboardRole, string> = {
  admin:
    'from-slate-950 via-slate-800 to-blue-700 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950',
  hr:
    'from-emerald-950 via-teal-800 to-cyan-700 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950',
  employee:
    'from-indigo-950 via-blue-800 to-emerald-700 dark:from-indigo-950 dark:via-blue-950 dark:to-emerald-950',
};

export function DashboardHeader({
  role,
  eyebrow,
  title,
  description,
  icon: Icon,
  metrics,
  children,
}: DashboardHeaderProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br p-5 text-white shadow-xl shadow-slate-950/10 md:p-6',
        roleStyles[role],
      )}
    >
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_24%),radial-gradient(circle_at_85%_25%,white_0,transparent_18%),linear-gradient(135deg,transparent_0,white_1px,transparent_1px)] [background-size:auto,auto,28px_28px]" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase text-white/80 ring-1 ring-white/20">
              {eyebrow}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">{description}</p>
        </div>

        {children && <div className="flex flex-wrap gap-2 lg:justify-end">{children}</div>}
      </div>

      {metrics?.length ? (
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-xs text-white/65">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
