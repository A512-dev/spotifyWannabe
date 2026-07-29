from __future__ import annotations

from django.db.models.signals import post_migrate
from django.dispatch import receiver

from operations.models import PriceCurrency, SubscriptionPlan, SubscriptionTier


DEFAULT_PLANS = (
    {
        "tier": SubscriptionTier.BASIC,
        "monthly_price_cents": 0,
        "currency": PriceCurrency.USD,
        "playlist_limit": 6,
        "can_upload_profile_image": False,
        "can_download_tracks": False,
        "has_early_access": False,
        "can_view_advanced_stats": False,
    },
    {
        "tier": SubscriptionTier.SILVER,
        "monthly_price_cents": 699,
        "currency": PriceCurrency.USD,
        "playlist_limit": 100,
        "can_upload_profile_image": True,
        "can_download_tracks": True,
        "has_early_access": False,
        "can_view_advanced_stats": False,
    },
    {
        "tier": SubscriptionTier.GOLD,
        "monthly_price_cents": 1199,
        "currency": PriceCurrency.USD,
        "playlist_limit": None,
        "can_upload_profile_image": True,
        "can_download_tracks": True,
        "has_early_access": True,
        "can_view_advanced_stats": True,
    },
)


@receiver(post_migrate)
def create_default_subscription_plans(sender, **kwargs) -> None:
    if sender.name != "operations":
        return

    for plan_data in DEFAULT_PLANS:
        tier = plan_data["tier"]
        SubscriptionPlan.objects.get_or_create(tier=tier, defaults=plan_data)
