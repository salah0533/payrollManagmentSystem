import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";

import type { NavigationItem } from "@/components/layout/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

export function RoleLayout({
  brandLabel,
  items,
}: {
  brandLabel: string;
  items: NavigationItem[];
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const { permissions } = useAuth();

  const visibleItems = useMemo(
    () => items.filter((item) => !item.requiresPermission || permissions.includes(item.requiresPermission)),
    [items, permissions],
  );

  return (
    <div className="app-shell min-h-screen">
      {!isMobile ? (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
          items={visibleItems}
          brandLabel={brandLabel}
        />
      ) : null}

      <TopBar sidebarCollapsed={sidebarCollapsed} items={visibleItems} brandLabel={brandLabel} />

      <main
        className={cn(
          "min-h-screen pt-16 transition-all duration-300",
          isMobile ? "pl-0" : sidebarCollapsed ? "pl-16" : "pl-64",
        )}
      >
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
