import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: string;
    positive?: boolean;
  };
  progress?: number;
}

const toneStyles = {
  default: {
    icon: 'bg-primary/10 text-primary',
    ring: 'bg-primary',
    glow: 'from-primary/12 to-transparent',
  },
  success: {
    icon: 'bg-success/10 text-success',
    ring: 'bg-success',
    glow: 'from-success/12 to-transparent',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    ring: 'bg-warning',
    glow: 'from-warning/14 to-transparent',
  },
  danger: {
    icon: 'bg-destructive/10 text-destructive',
    ring: 'bg-destructive',
    glow: 'from-destructive/12 to-transparent',
  },
  info: {
    icon: 'bg-info/10 text-info',
    ring: 'bg-info',
    glow: 'from-info/12 to-transparent',
  },
};

export function StatCard({ title, value, description, icon: Icon, tone = 'default', trend, progress }: StatCardProps) {
  const safeProgress = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-0 transition-opacity group-hover:opacity-100', toneStyles[tone].glow)} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-foreground">{value}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.positive === false ? 'text-destructive' : 'text-success')}>
              {trend.positive === false ? 'Down' : 'Up'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/10', toneStyles[tone].icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {safeProgress !== undefined && (
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full transition-all duration-500', toneStyles[tone].ring)} style={{ width: `${safeProgress}%` }} />
        </div>
      )}
    </div>
  );
}
