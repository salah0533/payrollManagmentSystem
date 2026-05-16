import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import type { NavigationItem } from "@/components/layout/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/providers/AuthProvider";
import { isAllowedCurrency } from "@/lib/currencies";
import { setDefaultCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { settingsApi } from "@/services/settingsApi";

export function RoleLayout({
  brandLabelKey,
  items,
}: {
  brandLabelKey: string;
  items: NavigationItem[];
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("");
  const isMobile = useIsMobile();
  const { permissions } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const currencyQuery = useQuery({
    queryKey: ["settings", "payroll-currency"],
    queryFn: () => settingsApi.getPayrollCurrency(),
  });

  useEffect(() => {
    if (currencyQuery.data?.default_currency) {
      const currency = isAllowedCurrency(currencyQuery.data.default_currency) ? currencyQuery.data.default_currency : "USD";
      setDefaultCurrency(currency);
      setCurrencyCode(currency);
    }
  }, [currencyQuery.data?.default_currency]);

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
          brandLabel={t(brandLabelKey)}
        />
      ) : null}

      <TopBar sidebarCollapsed={sidebarCollapsed} items={visibleItems} brandLabel={t(brandLabelKey)} />

      <main
        className={cn(
          "min-h-screen pt-16 transition-all duration-300",
          isMobile ? "pl-0 pr-0" : isRtl ? (sidebarCollapsed ? "pr-16 pl-0" : "pr-64 pl-0") : sidebarCollapsed ? "pl-16 pr-0" : "pl-64 pr-0",
        )}
      >
        <div className="app-content" key={currencyCode}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
