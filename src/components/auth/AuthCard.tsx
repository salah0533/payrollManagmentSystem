import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
}

export function AuthCard({ icon: Icon, eyebrow = 'PayrollPro', title, description, children, footer, centered }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-md border border-border bg-card/95 p-6 shadow-lg shadow-primary/5 backdrop-blur">
      <div className={cn('mb-6', centered && 'text-center')}>
        <div className={cn('mb-4 flex items-center gap-3', centered && 'justify-center')}>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn(centered && 'hidden')}>
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            <p className="text-xs text-muted-foreground">Workforce management</p>
          </div>
        </div>
        {centered && <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
