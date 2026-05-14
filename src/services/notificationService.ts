import { apiClient } from '@/services/apiClient';
import type { NotificationListRead } from '@/types/api';

export const notificationService = {
  mine: (limit = 5) => apiClient.get<NotificationListRead>('/me/notifications', { limit, offset: 0 }),
  unreadCount: () => apiClient.get<{ unread_count: number }>('/me/notifications/unread-count'),
  markRead: (notificationId: string) => apiClient.post(`/me/notifications/${notificationId}/read`),
  markAllRead: () => apiClient.post('/me/notifications/read-all'),
};
