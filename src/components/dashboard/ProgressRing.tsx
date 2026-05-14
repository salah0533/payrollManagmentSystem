import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  label: string;
  description?: string;
  size?: number;
  tone?: 'primary' | 'success' | 'warning' | 'info';
  className?: string;
}

const toneColors = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
};

export function ProgressRing({
  value,
  label,
  description,
  size = 156,
  tone = 'primary',
  className,
}: ProgressRingProps) {
  const normalized = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={toneColors[tone]}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-foreground">{Math.round(normalized)}%</span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      </div>
      {description && <p className="mt-3 max-w-48 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
