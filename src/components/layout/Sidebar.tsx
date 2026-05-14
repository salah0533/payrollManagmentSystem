import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NavigationItem } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  items: NavigationItem[];
  brandLabel: string;
}

export function Sidebar({ collapsed, onToggle, items, brandLabel }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[20px_0_70px_-58px_black] transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--sidebar-primary)/0.32),transparent_18rem)]" />
      <div className="relative flex h-20 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary text-sm font-extrabold text-sidebar-primary-foreground shadow-[0_14px_38px_-20px_hsl(var(--sidebar-primary))]">
            PP
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-sidebar-foreground">PayRollPro</p>
              <p className="truncate text-xs font-medium text-sidebar-muted">{brandLabel}</p>
            </div>
          ) : null}
        </div>
      </div>


      <nav className="relative flex flex-col gap-1 p-3">
        {items.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn("sidebar-link", collapsed && "justify-center px-2", isActive && "sidebar-link-active")}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-24 z-50 h-7 w-7 border border-border bg-card shadow-sm hover:bg-accent"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
