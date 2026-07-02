"use client";

import { useEffect, useMemo, useState } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, NotificationCard, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui";
import { notifications } from "@/data/notifications";
import { useAuth } from "@/providers";
import type { Notification } from "@/types/domain";

function sortNotifications(items: Notification[]) {
  return [...items].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setUserNotifications(sortNotifications(notifications.filter((notification) => notification.userId === currentUser.id)));
  }, [currentUser]);

  const unreadCount = useMemo(
    () => userNotifications.filter((notification) => !notification.readAt).length,
    [userNotifications]
  );

  const markAsRead = (notificationId: string) => {
    const readAt = new Date().toISOString();

    setUserNotifications((items) =>
      items.map((notification) =>
        notification.id === notificationId && !notification.readAt
          ? {
              ...notification,
              readAt
            }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    const readAt = new Date().toISOString();

    setUserNotifications((items) =>
      items.map((notification) =>
        notification.readAt
          ? notification
          : {
              ...notification,
              readAt
            }
      )
    );
  };

  const deleteNotification = (notificationId: string) => {
    setUserNotifications((items) => items.filter((notification) => notification.id !== notificationId));
  };

  if (!currentUser) {
    return <MainAppLayout>Loading notifications...</MainAppLayout>;
  }

  return (
    <MainAppLayout>
      <PageHeader
        description="Review role-specific account, artist, billing, and support notifications."
        title="Notifications"
      />
      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            {unreadCount} unread of {userNotifications.length} notifications
          </p>
          <Button disabled={unreadCount === 0} onClick={markAllAsRead} variant="secondary">
            Mark all as read
          </Button>
        </div>
        <div className="space-y-3">
          {userNotifications.length === 0 ? (
            <EmptyState description="Notifications will appear here when available." title="No notifications" />
          ) : (
            userNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onDelete={() => deleteNotification(notification.id)}
                onMarkRead={() => markAsRead(notification.id)}
              />
            ))
          )}
        </div>
      </section>
    </MainAppLayout>
  );
}
