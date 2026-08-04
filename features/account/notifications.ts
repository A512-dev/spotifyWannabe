import { apiRequest, type PaginatedResponse } from "@/lib/api";
import type { Notification } from "@/types/domain";

export const notificationApi = {
  list(unreadOnly = false) {
    return apiRequest<PaginatedResponse<Notification>>(`/notifications/${unreadOnly ? "?unread=true" : ""}`);
  },
  markRead(id: string) {
    return apiRequest<Notification>(`/notifications/${id}/read/`, { method: "POST" });
  },
  markAllRead() {
    return apiRequest<{ updated: number }>("/notifications/read-all/", { method: "POST" });
  },
  remove(id: string) {
    return apiRequest<void>(`/notifications/${id}/`, { method: "DELETE" });
  }
};
