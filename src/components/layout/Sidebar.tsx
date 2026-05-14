import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { roleNavigation } from '@/config/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { primaryRole } = useAuth();
  const navItems = primaryRole ? roleNavigation[primaryRole] : [];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar shadow-2xl shadow-slate-950/20 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-info text-sm font-bold text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20">
            P
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-sidebar-foreground">PayrollPro</p>
              <p className="truncate text-xs capitalize text-sidebar-muted">{primaryRole} portal</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3 pb-36">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <NavLink key={item.to} to={item.to} className={cn('sidebar-link', isActive && 'sidebar-link-active')}>
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="absolute inset-x-3 bottom-4 rounded-lg border border-sidebar-border bg-sidebar-accent/55 p-3 text-sidebar-foreground">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
            Role-secured access
          </div>
          <p className="mt-1 text-xs text-sidebar-muted">Navigation is tailored to your permissions.</p>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-sm hover:bg-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </aside>
  );
}
