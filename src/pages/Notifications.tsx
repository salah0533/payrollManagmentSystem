import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatLabel } from "@/lib/format";
import { hasPermission } from "@/lib/roles";
import { notificationPriorities, notificationTypes, roleCodes } from "@/lib/workflow";
import { employeeApi } from "@/services/employeeApi";
import { notificationApi } from "@/services/notificationApi";
import { userApi } from "@/services/userApi";
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
  const [recipientSearch, setRecipientSearch] = useState("");
  const [composer, setComposer] = useState({
    title: "",
    message: "",
    notification_type: "general",
    priority: "normal",
    recipient_mode: "users" as "users" | "all" | "role",
    selected_user_ids: [] as number[],
    role_code: "",
  });

  const canReadAll = hasPermission(currentUser, "notifications.read_all");
  const canSend = hasPermission(currentUser, "notifications.send");
  const isAdmin = Boolean(currentUser?.roles.includes("admin"));

  const recipientEmployeesQuery = useQuery({
    queryKey: ["notification-recipients", "employees"],
    queryFn: () => employeeApi.list(),
    enabled: canSend,
  });

  const recipientUsersQuery = useQuery({
    queryKey: ["notification-recipients", "users"],
    queryFn: () => userApi.list(),
    enabled: canSend && isAdmin,
  });

  const recipientRolesQuery = useQuery({
    queryKey: ["notification-recipients", "roles"],
    queryFn: () => userApi.listRoles(),
    enabled: canSend && isAdmin,
  });

  const availableRecipientUsers = useMemo(() => {
    const options = new Map<number, { id: number; label: string; detail: string }>();
    const usersById = new Map((recipientUsersQuery.data || []).map((user) => [user.id, user]));

    for (const employee of recipientEmployeesQuery.data || []) {
      if (!employee.user_id) {
        continue;
      }

      const linkedUser = usersById.get(employee.user_id);
      const detail = [
        linkedUser?.username,
        employee.email || linkedUser?.email || undefined,
        linkedUser?.roles.map((role) => role.code).join(", ") || undefined,
      ]
        .filter(Boolean)
        .join(" / ");

      options.set(employee.user_id, {
        id: employee.user_id,
        label: employee.full_name,
        detail,
      });
      usersById.delete(employee.user_id);
    }

    for (const user of usersById.values()) {
      options.set(user.id, {
        id: user.id,
        label: user.username,
        detail: [user.email || undefined, user.roles.map((role) => role.code).join(", ") || undefined]
          .filter(Boolean)
          .join(" / "),
      });
    }

    return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [recipientEmployeesQuery.data, recipientUsersQuery.data]);

  const filteredRecipientUsers = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    if (!query) {
      return availableRecipientUsers;
    }

    return availableRecipientUsers.filter((user) =>
      `${user.label} ${user.detail}`.toLowerCase().includes(query),
    );
  }, [availableRecipientUsers, recipientSearch]);

  const selectedRecipientUsers = useMemo(
    () => availableRecipientUsers.filter((user) => composer.selected_user_ids.includes(user.id)),
    [availableRecipientUsers, composer.selected_user_ids],
  );

  const availableRoles = useMemo(() => {
    const roles = recipientRolesQuery.data?.length
      ? recipientRolesQuery.data.map((role) => ({
          code: role.code,
          label: role.name,
        }))
      : roleCodes.map((code) => ({
          code,
          label: formatLabel(code),
        }));

    return [...roles].sort((left, right) => left.label.localeCompare(right.label));
  }, [recipientRolesQuery.data]);

  const selectedRole = availableRoles.find((role) => role.code === composer.role_code);
  const allRecipientUserIds = useMemo(
    () => availableRecipientUsers.map((user) => user.id),
    [availableRecipientUsers],
  );
  const canSubmitNotification = Boolean(
    composer.title.trim() &&
      composer.message.trim() &&
      notificationTypes.includes(composer.notification_type as never) &&
      notificationPriorities.includes(composer.priority as never) &&
      (
        (composer.recipient_mode === "all" && allRecipientUserIds.length > 0) ||
        (composer.recipient_mode === "users" && composer.selected_user_ids.length > 0) ||
        (composer.recipient_mode === "role" && Boolean(composer.role_code))
      ),
  );

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
        user_ids:
          composer.recipient_mode === "all"
            ? allRecipientUserIds
            : composer.recipient_mode === "users"
              ? composer.selected_user_ids
              : [],
        role_codes: composer.recipient_mode === "role" && composer.role_code ? [composer.role_code] : [],
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
        recipient_mode: "users",
        selected_user_ids: [],
        role_code: "",
      });
      setRecipientSearch("");
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

      <Card className="filter-card">
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
              <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All notification types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All notification types</SelectItem>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter || "all"} onValueChange={(value) => setPriorityFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {notificationPriorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {formatLabel(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              This uses `/notifications` with named users, all visible users, or a role target.
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
                <Select value={composer.notification_type} onValueChange={(notification_type) => setComposer((value) => ({ ...value, notification_type }))}>
                  <SelectTrigger id="notificationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notificationPriority">Priority</Label>
                <Select value={composer.priority} onValueChange={(priority) => setComposer((value) => ({ ...value, priority }))}>
                  <SelectTrigger id="notificationPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationPriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {formatLabel(priority)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationRecipientMode">Recipients</Label>
                <Select
                  value={composer.recipient_mode}
                  onValueChange={(recipient_mode) =>
                    setComposer((value) => ({
                      ...value,
                      recipient_mode: recipient_mode as "users" | "all" | "role",
                    }))
                  }
                >
                  <SelectTrigger id="notificationRecipientMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">Select users</SelectItem>
                    <SelectItem value="all">Send to all users</SelectItem>
                    <SelectItem value="role">Send by role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {composer.recipient_mode === "users" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="notificationUsers">Users</Label>
                  <span className="text-xs text-muted-foreground">{composer.selected_user_ids.length} selected</span>
                </div>
                <Input
                  id="notificationUsers"
                  placeholder="Search by name, username, or email"
                  value={recipientSearch}
                  onChange={(event) => setRecipientSearch(event.target.value)}
                />
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                  {recipientEmployeesQuery.isLoading || recipientUsersQuery.isLoading ? (
                    <p className="p-3 text-sm text-muted-foreground">Loading recipients...</p>
                  ) : filteredRecipientUsers.length ? (
                    filteredRecipientUsers.map((user) => (
                      <label key={user.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                        <Checkbox
                          checked={composer.selected_user_ids.includes(user.id)}
                          onCheckedChange={(checked) =>
                            setComposer((value) => ({
                              ...value,
                              selected_user_ids: checked === true
                                ? [...value.selected_user_ids, user.id]
                                : value.selected_user_ids.filter((id) => id !== user.id),
                            }))
                          }
                        />
                        <div className="min-w-0">
                          <p className="font-medium">{user.label}</p>
                          <p className="text-xs text-muted-foreground">{user.detail || `User #${user.id}`}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">No users matched the current search.</p>
                  )}
                </div>
              </div>
            ) : null}
            {composer.recipient_mode === "all" ? (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                {allRecipientUserIds.length
                  ? `This notification will be sent to all visible users (${allRecipientUserIds.length} recipients).`
                  : "No recipients are available yet for the send-to-all option."}
              </div>
            ) : null}
            {composer.recipient_mode === "role" ? (
              <div className="space-y-2">
                <Label htmlFor="notificationRole">Role</Label>
                <Select
                  value={composer.role_code || "none"}
                  onValueChange={(role_code) =>
                    setComposer((value) => ({
                      ...value,
                      role_code: role_code === "none" ? "" : role_code,
                    }))
                  }
                >
                  <SelectTrigger id="notificationRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select role</SelectItem>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Preview before send</p>
                  <p className="text-sm text-muted-foreground">{composer.title || "Notification title"} / {formatLabel(composer.notification_type)} / {formatLabel(composer.priority)}</p>
                </div>
                <StatusBadge status={composer.priority} />
              </div>
              <p className="text-sm text-muted-foreground">{composer.message || "Notification message preview will appear here."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {composer.recipient_mode === "users"
                  ? selectedRecipientUsers.map((user) => (
                      <Badge key={`user-${user.id}`} variant="secondary">
                        {user.label}
                      </Badge>
                    ))
                  : null}
                {composer.recipient_mode === "all" && allRecipientUserIds.length ? (
                  <Badge variant="secondary">All users ({allRecipientUserIds.length})</Badge>
                ) : null}
                {composer.recipient_mode === "role" && selectedRole ? (
                  <Badge variant="outline">{selectedRole.label}</Badge>
                ) : null}
                {composer.recipient_mode === "users" && !selectedRecipientUsers.length ? (
                  <span className="text-xs text-muted-foreground">Select at least one user.</span>
                ) : null}
                {composer.recipient_mode === "role" && !selectedRole ? (
                  <span className="text-xs text-muted-foreground">Select a role to target.</span>
                ) : null}
              </div>
            </div>
            <Button onClick={() => sendNotification.mutate()} disabled={sendNotification.isPending || !canSubmitNotification}>
              {sendNotification.isPending ? "Sending..." : "Send notification"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
