import { LogOut, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { NavigationItem } from "@/components/layout/navigation";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/providers/AuthProvider";
import { formatRoleLabel, getPrimaryRole } from "@/lib/roles";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TopBarProps {
  sidebarCollapsed: boolean;
  items: NavigationItem[];
  brandLabel: string;
}

function initials(label: string) {
  return label
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TopBar({ sidebarCollapsed, items, brandLabel }: TopBarProps) {
  const isMobile = useIsMobile();
  const { currentUser, homePath, logout } = useAuth();
  const primaryRole = getPrimaryRole(currentUser);
  const displayName = currentUser?.employee?.full_name || currentUser?.username || "User";

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-6',
        isMobile ? 'left-0' : (sidebarCollapsed ? 'left-16' : 'left-64')
      )}
    >
      <div className="flex items-center gap-3">
        <MobileNav items={items} brandLabel={brandLabel} />
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground">{brandLabel}</p>
          <p className="text-xs text-muted-foreground">Role-aware employee operations</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{formatRoleLabel(primaryRole)}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/change-password">
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={currentUser?.employee_id ? "/employee/profile" : homePath}>
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center text-xs font-semibold">
                  @
                </span>
                {currentUser?.employee_id ? "My Profile" : "Home"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
