from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from common.models import TimestampedModel
from operations.models import SubscriptionPlan


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"
    CANCELED = "canceled", "Canceled"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"
    CANCELED = "canceled", "Canceled"


class UserSubscription(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="user_subscriptions",
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=12,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ["-ends_at"]
        indexes = [models.Index(fields=["user", "status", "-ends_at"], name="subscription_user_status_idx")]

    def __str__(self) -> str:
        return f"{self.user_id}: {self.plan.tier} until {self.ends_at}"


class PaymentTransaction(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )
    months = models.PositiveSmallIntegerField()
    amount_cents = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3)
    status = models.CharField(
        max_length=12,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    gateway = models.CharField(max_length=32, default="local-sandbox")
    authority = models.CharField(max_length=128, blank=True, db_index=True)
    reference_id = models.CharField(max_length=128, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(months__in=[1, 3, 6, 12]),
                name="payment_valid_subscription_months",
            )
        ]
        indexes = [models.Index(fields=["user", "status", "-created_at"], name="payment_user_status_idx")]

    def __str__(self) -> str:
        return f"{self.user_id}: {self.amount_cents} {self.currency} ({self.status})"
