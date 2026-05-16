import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Bell, Check, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime, formatLabel } from "@/lib/format";
import { notificationApi } from "@/services/notificationApi";
import { useAuth } from "@/providers/AuthProvider";
import { hasPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

function priorityClass(priority: string) {
  if (priority === "high") return "bg-destructive/10 text-destructive";
  if (priority === "low") return "bg-muted text-muted-foreground";
  return "bg-info/10 text-info";
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { currentUser, notificationsPath, refreshUnreadNotificationCount, unreadNotificationCount } = useAuth();
  const { t } = useTranslation();

  const canReadNotifications = hasPermission(currentUser, "notifications.read_own");

  const previewQuery = useQuery({
    queryKey: ["my-notifications", "preview"],
    queryFn: () =>
      notificationApi.listMine({
        unread_only: false,
        archived: false,
        include_expired: false,
        limit: 5,
        offset: 0,
      }),
    enabled: canReadNotifications,
  });

  if (!canReadNotifications) {
    return null;
  }

  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["my-notifications", "preview"] });
    await refreshUnreadNotificationCount();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadNotificationCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={async () => {
              await notificationApi.markAllAsRead();
              await refreshNotifications();
            }}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {t("notificationsBell.markAllRead")}
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[360px] overflow-y-auto">
          {previewQuery.isLoading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">{t("notificationsBell.loading")}</div>
          ) : previewQuery.data?.items.length ? (
            previewQuery.data.items.map((notification) => (
              <div key={notification.notification_id} className="border-b border-border px-4 py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      {!notification.is_read ? <span className="h-2 w-2 rounded-full bg-info" /> : null}
                    </div>
                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                          priorityClass(notification.priority),
                        )}
                      >
                        {formatLabel(notification.priority)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(notification.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!notification.is_read ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={async () => {
                          await notificationApi.markAsRead(notification.notification_id);
                          await refreshNotifications();
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        await notificationApi.archive(notification.notification_id);
                        await refreshNotifications();
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">{t("notificationsBell.empty")}</div>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-3">
          <Button asChild variant="outline" className="w-full">
            <Link to={notificationsPath}>{t("notificationsBell.open")}</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
