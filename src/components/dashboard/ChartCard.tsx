import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, badge, children, footer, className }: ChartCardProps) {
  return (
    <section className={cn('dashboard-card flex min-h-[320px] flex-col p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      {footer && <div className="mt-4 border-t border-border/70 pt-3 text-sm text-muted-foreground">{footer}</div>}
    </section>
  );
}
