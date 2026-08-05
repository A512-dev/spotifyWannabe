from __future__ import annotations

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from artists.models import ArtistProfile
from common.models import TimestampedModel


class RevenueCurrency(models.TextChoices):
    USD = "USD", "US Dollar"
    EUR = "EUR", "Euro"
    IRR = "IRR", "Iranian Rial"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SETTLED = "settled", "Settled"


class ArtistRevenueRecord(TimestampedModel):
    """A backend-computed accounting row for one artist and reporting period."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.PROTECT,
        related_name="revenue_records",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    unique_listener_count = models.PositiveBigIntegerField(default=0)
    stream_count = models.PositiveBigIntegerField(default=0)
    gross_revenue_cents = models.PositiveBigIntegerField(default=0)
    platform_fee_cents = models.PositiveBigIntegerField(default=0)
    net_revenue_cents = models.PositiveBigIntegerField(default=0, editable=False)
    currency = models.CharField(
        max_length=3,
        choices=RevenueCurrency.choices,
        default=RevenueCurrency.USD,
    )
    payment_status = models.CharField(
        max_length=12,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    settled_at = models.DateTimeField(null=True, blank=True)
    settled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="settled_artist_revenue_records",
        null=True,
        blank=True,
    )
    calculation_note = models.TextField(blank=True)
    track_breakdown = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-period_start", "artist__stage_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["artist", "period_start", "period_end"],
                name="unique_artist_revenue_period",
            ),
            models.CheckConstraint(
                condition=Q(period_end__gte=F("period_start")),
                name="artist_revenue_valid_period",
            ),
            models.CheckConstraint(
                condition=Q(platform_fee_cents__lte=F("gross_revenue_cents")),
                name="artist_revenue_fee_not_above_gross",
            ),
        ]
        indexes = [
            models.Index(
                fields=["payment_status", "-period_start"],
                name="revenue_status_period_idx",
            ),
            models.Index(
                fields=["artist", "-period_start"],
                name="revenue_artist_period_idx",
            ),
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.period_end and self.period_start and self.period_end < self.period_start:
            errors["period_end"] = "The reporting period end cannot be before its start."
        if self.platform_fee_cents > self.gross_revenue_cents:
            errors["platform_fee_cents"] = "The platform fee cannot exceed gross revenue."
        if self.payment_status == PaymentStatus.SETTLED:
            if self.settled_at is None:
                errors["settled_at"] = "A settled record must include the settlement time."
            if self.settled_by_id is None:
                errors["settled_by"] = "A settled record must include the administrator."
        elif self.settled_at is not None or self.settled_by_id is not None:
            errors["payment_status"] = "Pending records cannot contain settlement metadata."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        if self.platform_fee_cents > self.gross_revenue_cents:
            raise ValidationError(
                {"platform_fee_cents": "The platform fee cannot exceed gross revenue."}
            )
        self.net_revenue_cents = self.gross_revenue_cents - self.platform_fee_cents
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.artist.stage_name}: {self.period_start} to {self.period_end}"
