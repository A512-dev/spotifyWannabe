from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from common.models import TimestampedModel


class SubscriptionTier(models.TextChoices):
    BASIC = "basic", "Basic"
    SILVER = "silver", "Silver"
    GOLD = "gold", "Gold"


class PriceCurrency(models.TextChoices):
    USD = "USD", "US Dollar"
    EUR = "EUR", "Euro"
    IRR = "IRR", "Iranian Rial"


class SubscriptionPlan(TimestampedModel):
    tier = models.CharField(
        max_length=12,
        choices=SubscriptionTier.choices,
        unique=True,
        db_index=True,
    )
    monthly_price_cents = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(
        max_length=3,
        choices=PriceCurrency.choices,
        default=PriceCurrency.USD,
    )
    playlist_limit = models.PositiveIntegerField(null=True, blank=True)
    can_upload_profile_image = models.BooleanField(default=False)
    can_download_tracks = models.BooleanField(default=False)
    has_early_access = models.BooleanField(default=False)
    can_view_advanced_stats = models.BooleanField(default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_subscription_plans",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["monthly_price_cents", "tier"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(tier=SubscriptionTier.BASIC, monthly_price_cents=0)
                    | Q(
                        tier__in=[SubscriptionTier.SILVER, SubscriptionTier.GOLD],
                        monthly_price_cents__gt=0,
                    )
                ),
                name="subscription_plan_valid_price",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}

        if self.tier == SubscriptionTier.BASIC:
            if self.monthly_price_cents != 0:
                errors["monthly_price_cents"] = "The Basic plan must remain free."
            if self.playlist_limit != 6:
                errors["playlist_limit"] = "The Basic plan must allow exactly 6 playlists."
            if any(
                [
                    self.can_upload_profile_image,
                    self.can_download_tracks,
                    self.has_early_access,
                    self.can_view_advanced_stats,
                ]
            ):
                errors["tier"] = "The Basic plan cannot include paid features."

        if self.tier == SubscriptionTier.SILVER:
            if self.monthly_price_cents <= 0:
                errors["monthly_price_cents"] = "The Silver plan price must be positive."
            if self.playlist_limit != 100:
                errors["playlist_limit"] = "The Silver plan must allow exactly 100 playlists."
            if not self.can_upload_profile_image or not self.can_download_tracks:
                errors["tier"] = "The Silver plan must include profile images and downloads."
            if self.has_early_access or self.can_view_advanced_stats:
                errors["tier"] = "Early access and advanced statistics are Gold-only features."

        if self.tier == SubscriptionTier.GOLD:
            if self.monthly_price_cents <= 0:
                errors["monthly_price_cents"] = "The Gold plan price must be positive."
            if self.playlist_limit is not None:
                errors["playlist_limit"] = "The Gold plan playlist limit must be unlimited."
            if not all(
                [
                    self.can_upload_profile_image,
                    self.can_download_tracks,
                    self.has_early_access,
                    self.can_view_advanced_stats,
                ]
            ):
                errors["tier"] = "The Gold plan must include every subscription feature."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.get_tier_display()


class SubscriptionPriceChange(TimestampedModel):
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="price_changes",
    )
    old_monthly_price_cents = models.PositiveBigIntegerField()
    new_monthly_price_cents = models.PositiveBigIntegerField()
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="subscription_price_changes",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["plan", "-created_at"], name="price_change_plan_created_idx")
        ]

    def __str__(self) -> str:
        return (
            f"{self.plan.tier}: "
            f"{self.old_monthly_price_cents} -> {self.new_monthly_price_cents}"
        )
