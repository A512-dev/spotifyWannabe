import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, NotificationCard, PageHeader } from "@/components/shared";
import { notifications } from "@/data/notifications";

export default function NotificationsPage() {
  return (
    <MainAppLayout>
      <PageHeader
        description="Notification center skeleton for account, artist, billing, and support events."
        title="Notifications"
      />
      <section className="mt-6 space-y-3">
        {/* Developer 1 can add filtering, mark-as-read, and pagination here. */}
        {notifications.length === 0 ? (
          <EmptyState description="Notifications will appear here when available." title="No notifications" />
        ) : (
          notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        )}
      </section>
    </MainAppLayout>
  );
}

