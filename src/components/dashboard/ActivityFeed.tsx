import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  title: string;
  description?: string;
  meta?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon?: LucideIcon;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  emptyText?: string;
}

const toneStyles = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

const defaultIcons = {
  default: Clock3,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: AlertCircle,
  info: Clock3,
};

export function ActivityFeed({ items, emptyText = 'Nothing needs attention right now.' }: ActivityFeedProps) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const tone = item.tone ?? 'default';
        const Icon = item.icon ?? defaultIcons[tone];

        return (
          <div key={`${item.title}-${item.meta ?? item.description ?? ''}`} className="flex gap-3 rounded-lg bg-muted/35 p-3">
            <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md', toneStyles[tone])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{item.title}</p>
                {item.meta && <span className="text-xs text-muted-foreground">{item.meta}</span>}
              </div>
              {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
