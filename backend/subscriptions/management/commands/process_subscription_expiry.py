from django.core.management.base import BaseCommand
from subscriptions.services import process_subscription_lifecycle


class Command(BaseCommand):
    help = "Expire ended subscriptions and notify users whose subscription ends within seven days."

    def handle(self, *args, **options):
        expired, notified = process_subscription_lifecycle()
        self.stdout.write(
            self.style.SUCCESS(f"Expired {expired} subscriptions and sent {notified} warnings.")
        )
