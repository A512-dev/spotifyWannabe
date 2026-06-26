import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import type { Notification } from "@/types/domain";

interface NotificationCardProps {
  notification: Notification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-50">{notification.title}</p>
          <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
        </div>
        <Badge tone={notification.readAt ? "neutral" : "info"}>
          {notification.readAt ? "Read" : "New"}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-slate-500">{formatDate(notification.createdAt)}</p>
    </Card>
  );
}

