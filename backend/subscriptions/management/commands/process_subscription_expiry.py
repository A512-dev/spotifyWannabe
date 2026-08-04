from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification, NotificationType
from notifications.services import create_notification
from subscriptions.models import SubscriptionStatus, UserSubscription


class Command(BaseCommand):
    help = "Expire ended subscriptions and notify users whose subscription ends within seven days."

    def handle(self, *args, **options):
        now = timezone.now()
        expired = UserSubscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            ends_at__lte=now,
        ).update(status=SubscriptionStatus.EXPIRED)

        warning_end = now + timedelta(days=7)
        expiring = UserSubscription.objects.select_related("user", "plan").filter(
            status=SubscriptionStatus.ACTIVE,
            ends_at__gt=now,
            ends_at__lte=warning_end,
        )
        notified = 0
        for subscription in expiring:
            already_sent = Notification.objects.filter(
                recipient=subscription.user,
                type=NotificationType.BILLING,
                title="Subscription expiring soon",
                created_at__date=timezone.localdate(),
            ).exists()
            if already_sent:
                continue
            notification = create_notification(
                recipient_id=subscription.user_id,
                type=NotificationType.BILLING,
                title="Subscription expiring soon",
                message=(
                    f"Your {subscription.plan.get_tier_display()} subscription ends on "
                    f"{subscription.ends_at.date().isoformat()}."
                ),
                action_href="/settings",
            )
            if notification:
                notified += 1

        self.stdout.write(
            self.style.SUCCESS(f"Expired {expired} subscriptions and sent {notified} warnings.")
        )
