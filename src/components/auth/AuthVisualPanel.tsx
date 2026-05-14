import { BarChart3, CalendarCheck, Clock3, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';

const previewStats = [
  { label: 'Total Employees', value: '248', icon: Users, tone: 'text-info' },
  { label: 'Monthly Payroll', value: '$84.2k', icon: WalletCards, tone: 'text-success' },
  { label: 'Attendance Rate', value: '96%', icon: Clock3, tone: 'text-warning' },
];

const benefits = [
  { icon: ShieldCheck, text: 'Role-based access for Admin, HR, and Employees' },
  { icon: CalendarCheck, text: 'Track payroll, attendance, and leave with clarity' },
  { icon: BarChart3, text: 'Modern workforce analytics for growing teams' },
];

function MiniBar({ height, className }: { height: string; className?: string }) {
  return <div className={cn('w-full rounded-sm bg-sidebar-primary/80', className)} style={{ height }} />;
}

export function AuthVisualPanel() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(hsl(var(--sidebar-foreground)/0.18)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--sidebar-foreground)/0.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-sidebar-accent/80 to-transparent" />

      <div className="relative z-10 p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground shadow-sm">
            P
          </div>
          <div>
            <p className="text-xl font-semibold">PayrollPro</p>
            <p className="text-sm text-sidebar-muted">Secure payroll and HR operations</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-10">
        <div className="max-w-xl">
          <p className="mb-3 text-sm font-medium uppercase text-sidebar-primary">Workforce command center</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Manage payroll, HR, and employees in one secure platform.
          </h1>
          <p className="mt-4 max-w-lg text-base text-sidebar-foreground/75">
            A focused operating space for payroll control, employee records, leave approvals, attendance, and self-service.
          </p>
        </div>

        <div className="mt-8 grid max-w-xl gap-3">
          {benefits.map((benefit) => (
            <div key={benefit.text} className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-4 py-3">
              <benefit.icon className="h-5 w-5 shrink-0 text-sidebar-primary" />
              <span className="text-sm text-sidebar-foreground/85">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 p-10">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/70 p-4 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Payroll overview</p>
              <p className="text-xs text-sidebar-muted">Visual preview only</p>
            </div>
            <div className="rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success">Protected</div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {previewStats.map((stat) => (
              <div key={stat.label} className="rounded-md border border-sidebar-border bg-sidebar/55 p-3">
                <div className={cn('mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent', stat.tone)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="mt-1 text-xs text-sidebar-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-[1.2fr_0.8fr] gap-3">
            <div className="rounded-md border border-sidebar-border bg-sidebar/55 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Payroll trend</p>
                <BarChart3 className="h-4 w-4 text-sidebar-muted" />
              </div>
              <div className="flex h-28 items-end gap-2">
                <MiniBar height="36%" />
                <MiniBar height="54%" className="bg-success/80" />
                <MiniBar height="45%" />
                <MiniBar height="70%" className="bg-warning/80" />
                <MiniBar height="62%" />
                <MiniBar height="84%" className="bg-info/80" />
              </div>
            </div>
            <div className="rounded-md border border-sidebar-border bg-sidebar/55 p-4">
              <p className="text-sm font-medium">Approvals</p>
              <div className="mt-4 space-y-3">
                {['Leave requests', 'Payroll review', 'Attendance fixes'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-sidebar-foreground/75">{item}</span>
                    <span className="rounded-full bg-sidebar-accent px-2 py-1 text-sidebar-foreground">{index + 2}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
