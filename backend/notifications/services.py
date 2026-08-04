from __future__ import annotations

from django.utils import timezone

from notifications.models import Notification, NotificationType


def notification_allowed(*, recipient, type: str) -> bool:
    preferences = getattr(recipient, "preferences", None)
    if preferences is None:
        return True
    if not preferences.notifications_enabled:
        return False
    if type == NotificationType.BILLING:
        return preferences.subscription_notifications
    if type == NotificationType.ARTIST:
        return preferences.followed_artist_notifications
    if type == NotificationType.SUPPORT:
        return preferences.support_notifications
    return True


def create_notification(*, recipient_id, type: str, title: str, message: str, action_href: str = ""):
    from django.contrib.auth import get_user_model

    recipient = get_user_model().objects.filter(pk=recipient_id, is_active=True).first()
    if recipient is None or not notification_allowed(recipient=recipient, type=type):
        return None
    return Notification.objects.create(
        recipient=recipient,
        type=type,
        title=title,
        message=message,
        action_href=action_href,
    )


def mark_all_read(*, user) -> int:
    return Notification.objects.filter(recipient=user, read_at__isnull=True).update(read_at=timezone.now())
