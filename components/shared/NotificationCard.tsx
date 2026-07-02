import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/domain";

interface NotificationCardProps {
  notification: Notification;
  onDelete?: () => void;
  onMarkRead?: () => void;
}

export function NotificationCard({ notification, onDelete, onMarkRead }: NotificationCardProps) {
  const isUnread = !notification.readAt;

  return (
    <Card className={cn("transition", isUnread && "border-sky-500/50 bg-sky-500/10")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          {isUnread ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400" /> : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-50">{notification.title}</p>
              <Badge>{notification.type}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
          </div>
        </div>
        <Badge tone={notification.readAt ? "neutral" : "info"}>
          {notification.readAt ? "Read" : "New"}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-slate-500">{formatDate(notification.createdAt)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {notification.actionHref ? (
          <Link
            className="inline-flex h-8 items-center justify-center rounded-md bg-surface-700 px-3 text-sm font-medium text-slate-50 transition hover:bg-surface-600"
            href={notification.actionHref}
          >
            Open
          </Link>
        ) : null}
        {onMarkRead ? (
          <Button disabled={!isUnread} onClick={onMarkRead} size="sm" variant="secondary">
            Mark as read
          </Button>
        ) : null}
        {onDelete ? (
          <Button onClick={onDelete} size="sm" variant="danger">
            Delete
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
