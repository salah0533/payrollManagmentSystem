import { Bell, LogOut, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome, userDisplayName, userInitials } from '@/lib/auth';
import { notificationService } from '@/services/notificationService';

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export function TopBar({ sidebarCollapsed }: TopBarProps) {
  const isMobile = useIsMobile();
  const { user, primaryRole, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.unreadCount,
    enabled: Boolean(user),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: () => notificationService.mine(5),
    enabled: Boolean(user),
  });

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-card/85 px-4 shadow-sm backdrop-blur-xl md:px-6',
        isMobile ? 'left-0' : sidebarCollapsed ? 'left-16' : 'left-64',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <MobileNav />
        <div className="relative hidden sm:block sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search workspace..." className="border-border/60 bg-muted/50 pl-10 focus-visible:ring-1" />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setTheme(nextTheme)} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {Boolean(unread?.unread_count) && (
                <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs">
                  {unread?.unread_count}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications?.items?.length ? (
              notifications.items.map((item) => (
                <DropdownMenuItem key={item.notification_id} className="flex flex-col items-start gap-1 p-3">
                  <span className="font-medium">{item.title}</span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{item.message}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-sm text-primary-foreground">{userInitials(user)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="max-w-40 truncate text-sm font-medium">{userDisplayName(user)}</p>
                <p className="text-xs capitalize text-muted-foreground">{primaryRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={primaryRole === 'employee' ? '/employee/profile' : getRoleHome(primaryRole)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            {primaryRole === 'admin' && (
              <DropdownMenuItem asChild>
                <Link to="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
