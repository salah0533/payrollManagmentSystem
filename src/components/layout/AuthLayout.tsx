import { Outlet } from 'react-router-dom';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <AuthVisualPanel />
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent))_0%,transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,hsl(var(--sidebar-accent))_0%,transparent_48%)]" />
          <div className="absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:36px_36px]" />
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">P</div>
            <div>
              <p className="text-lg font-semibold">PayrollPro</p>
              <p className="text-xs text-muted-foreground">Secure payroll and HR operations</p>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
