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
        "fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/60 bg-card/70 px-4 shadow-[0_18px_60px_-52px_hsl(var(--foreground)/0.8)] backdrop-blur-xl md:px-7",
        isMobile ? "left-0" : sidebarCollapsed ? "left-16" : "left-64",
      )}
    >
      <div className="flex items-center gap-3">
        <MobileNav items={items} brandLabel={brandLabel} />
        <div className="hidden sm:block">
          <p className="font-display text-base font-semibold text-foreground">{brandLabel}</p>
          <p className="text-xs font-medium text-muted-foreground">Role-aware employee operations</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-11 items-center gap-2 rounded-full border border-border/70 bg-card/50 px-2 pr-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">{initials(displayName)}</AvatarFallback>
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
