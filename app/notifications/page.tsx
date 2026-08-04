"use client";

import { useEffect, useMemo, useState } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, NotificationCard, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui";
import { notificationApi } from "@/features/account/notifications";
import type { Notification } from "@/types/domain";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await notificationApi.list();
      setNotifications(response.results);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);

  const markRead = async (id: string) => {
    const updated = await notificationApi.markRead(id);
    setNotifications((items) => items.map((item) => item.id === id ? updated : item));
  };

  const remove = async (id: string) => {
    await notificationApi.remove(id);
    setNotifications((items) => items.filter((item) => item.id !== id));
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    await load();
  };

  return (
    <MainAppLayout>
      <PageHeader
        actions={<Button disabled={unreadCount === 0} onClick={() => void markAllRead()}>Mark all as read</Button>}
        description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
        title="Notifications"
      />
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-400">Loading notifications...</p> : null}
      {!loading && notifications.length === 0 ? (
        <div className="mt-6"><EmptyState description="New releases, account decisions, billing updates, and ticket activity will appear here." title="No notifications" /></div>
      ) : (
        <div className="mt-6 grid gap-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onDelete={() => void remove(notification.id)}
              onMarkRead={() => void markRead(notification.id)}
            />
          ))}
        </div>
      )}
    </MainAppLayout>
  );
}
