import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { adminNavigation } from "@/components/layout/navigation";
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="app-shell min-h-screen">
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          items={adminNavigation}
          brandLabel="Dashboard"
        />
      )}
      
      <TopBar sidebarCollapsed={sidebarCollapsed} items={adminNavigation} brandLabel="Dashboard" />
      
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-300',
          isMobile ? 'pl-0' : (sidebarCollapsed ? 'pl-16' : 'pl-64')
        )}
      >
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
