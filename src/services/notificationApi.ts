import { apiRequest, buildQueryString } from "@/lib/api-client";
import type {
  AdminNotificationList,
  NotificationActionResult,
  NotificationDispatchPayload,
  NotificationUnreadCount,
  UserNotification,
  UserNotificationList,
} from "@/types/domain";

export const notificationApi = {
  listMine(params: {
    unread_only?: boolean;
    archived?: boolean;
    include_expired?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return apiRequest<UserNotificationList>(`/me/notifications${buildQueryString(params)}`);
  },
  getUnreadCount(accessToken?: string) {
    return apiRequest<NotificationUnreadCount>("/me/notifications/unread-count", {
      accessToken,
    });
  },
  markAsRead(notificationId: string) {
    return apiRequest<UserNotification>(`/me/notifications/${notificationId}/read`, {
      method: "POST",
    });
  },
  markAllAsRead() {
    return apiRequest<NotificationActionResult>("/me/notifications/read-all", {
      method: "POST",
    });
  },
  archive(notificationId: string) {
    return apiRequest<UserNotification>(`/me/notifications/${notificationId}/archive`, {
      method: "POST",
    });
  },
  listAll(params: {
    notification_type?: string;
    priority?: string;
    user_id?: number;
    limit?: number;
    offset?: number;
  }) {
    return apiRequest<AdminNotificationList>(`/notifications/${buildQueryString(params)}`);
  },
  send(payload: NotificationDispatchPayload) {
    return apiRequest<unknown>("/notifications/", {
      method: "POST",
      body: payload,
    });
  },
};
