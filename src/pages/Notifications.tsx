import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatLabel } from "@/lib/format";
import { hasPermission } from "@/lib/roles";
import { notificationApi } from "@/services/notificationApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { currentUser, refreshUnreadNotificationCount } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [composer, setComposer] = useState({
    title: "",
    message: "",
    notification_type: "general",
    priority: "normal",
    user_ids: "",
    role_codes: "",
  });

  const canReadAll = hasPermission(currentUser, "notifications.read_all");
  const canSend = hasPermission(currentUser, "notifications.send");

  const myNotificationsQuery = useQuery({
    queryKey: ["my-notifications", unreadOnly, showArchived, includeExpired, offset],
    queryFn: () =>
      notificationApi.listMine({
        unread_only: unreadOnly,
        archived: showArchived,
        include_expired: includeExpired,
        limit: 20,
        offset,
      }),
  });

  const systemNotificationsQuery = useQuery({
    queryKey: ["admin-notifications", typeFilter, priorityFilter],
    queryFn: () =>
      notificationApi.listAll({
        notification_type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        limit: 20,
        offset: 0,
      }),
    enabled: canReadAll,
  });

  const refreshMine = async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    await refreshUnreadNotificationCount();
  };

  const markAsRead = useMutation({
    mutationFn: (notificationId: string) => notificationApi.markAsRead(notificationId),
    onSuccess: async () => {
      await refreshMine();
    },
  });

  const archiveNotification = useMutation({
    mutationFn: (notificationId: string) => notificationApi.archive(notificationId),
    onSuccess: async () => {
      await refreshMine();
    },
  });

  const sendNotification = useMutation({
    mutationFn: () =>
      notificationApi.send({
        notification_type: composer.notification_type,
        title: composer.title,
        message: composer.message,
        user_ids: composer.user_ids
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value)),
        role_codes: composer.role_codes
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        priority: composer.priority,
      }),
    onSuccess: async () => {
      toast({
        title: "Notification sent",
        description: "The backend accepted the notification dispatch request.",
      });
      setComposer({
        title: "",
        message: "",
        notification_type: "general",
        priority: "normal",
        user_ids: "",
        role_codes: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to send notification",
        description: getErrorMessage(error, "Please review the request details."),
        variant: "destructive",
      });
    },
  });

  const myNotifications = myNotificationsQuery.data?.items || [];
  const systemNotifications = systemNotificationsQuery.data?.items || [];
  const hasMoreMine = useMemo(() => {
    const total = myNotificationsQuery.data?.total || 0;
    return offset + 20 < total;
  }, [myNotificationsQuery.data?.total, offset]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        description="Bell count, dropdown previews, mark-as-read, archive, and pagination all use the backend notification APIs."
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              await notificationApi.markAllAsRead();
              await refreshMine();
            }}
          >
            Mark all as read
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>My notifications</CardTitle>
          <CardDescription>Loaded from `/me/notifications` with unread, archived, expired, limit, and offset filters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Unread only
              <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Show archived
              <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Include expired
              <Switch checked={includeExpired} onCheckedChange={setIncludeExpired} />
            </label>
          </div>

          {myNotifications.length ? (
            <div className="space-y-3">
              {myNotifications.map((notification) => (
                <div key={notification.notification_id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.is_read ? <span className="h-2 w-2 rounded-full bg-info" /> : null}
                        <StatusBadge status={notification.priority} />
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatLabel(notification.notification_type)}</span>
                        <span>{formatDateTime(notification.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!notification.is_read ? (
                        <Button size="sm" variant="outline" onClick={() => markAsRead.mutate(notification.notification_id)}>
                          Mark read
                        </Button>
                      ) : null}
                      {!notification.is_archived ? (
                        <Button size="sm" variant="outline" onClick={() => archiveNotification.mutate(notification.notification_id)}>
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={myNotificationsQuery.isLoading ? "Loading notifications..." : "No notifications found"}
              description="Archived items are hidden by default unless you enable the archived filter."
            />
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}-{Math.min(offset + 20, myNotificationsQuery.data?.total || 0)} of {myNotificationsQuery.data?.total || 0}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - 20))}>
                Previous
              </Button>
              <Button variant="outline" disabled={!hasMoreMine} onClick={() => setOffset((value) => value + 20)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {canReadAll ? (
        <Card>
          <CardHeader>
            <CardTitle>System notifications</CardTitle>
            <CardDescription>Admin-level backend notification listing from `/notifications`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Filter by notification type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} />
              <Input placeholder="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} />
            </div>
            {systemNotifications.length ? (
              <div className="space-y-3">
                {systemNotifications.map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          <StatusBadge status={notification.priority} />
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatLabel(notification.notification_type)}</p>
                        <p>{formatDateTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={systemNotificationsQuery.isLoading ? "Loading system notifications..." : "No system notifications found"}
                description="This section appears only when the backend grants `notifications.read_all`."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {canSend ? (
        <Card>
          <CardHeader>
            <CardTitle>Send notification</CardTitle>
            <CardDescription>
              This uses `/notifications`. Because the backend does not expose a role catalog endpoint, role codes and user ids are manual inputs here.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notificationTitle">Title</Label>
                <Input
                  id="notificationTitle"
                  value={composer.title}
                  onChange={(event) => setComposer((value) => ({ ...value, title: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationType">Type</Label>
                <Input
                  id="notificationType"
                  value={composer.notification_type}
                  onChange={(event) => setComposer((value) => ({ ...value, notification_type: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notificationMessage">Message</Label>
              <Textarea
                id="notificationMessage"
                value={composer.message}
                onChange={(event) => setComposer((value) => ({ ...value, message: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="notificationPriority">Priority</Label>
                <Input
                  id="notificationPriority"
                  value={composer.priority}
                  onChange={(event) => setComposer((value) => ({ ...value, priority: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationUsers">User ids</Label>
                <Input
                  id="notificationUsers"
                  placeholder="1,2,3"
                  value={composer.user_ids}
                  onChange={(event) => setComposer((value) => ({ ...value, user_ids: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationRoles">Role codes</Label>
                <Input
                  id="notificationRoles"
                  placeholder="hr,employee"
                  value={composer.role_codes}
                  onChange={(event) => setComposer((value) => ({ ...value, role_codes: event.target.value }))}
                />
              </div>
            </div>
            <Button onClick={() => sendNotification.mutate()} disabled={sendNotification.isPending}>
              {sendNotification.isPending ? "Sending..." : "Send notification"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
