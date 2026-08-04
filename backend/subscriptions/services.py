from __future__ import annotations

from calendar import monthrange
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from operations.models import SubscriptionPlan, SubscriptionTier
from subscriptions.gateways import get_gateway
from subscriptions.models import PaymentStatus, PaymentTransaction, SubscriptionStatus, UserSubscription

ALLOWED_MONTHS = (1, 3, 6, 12)


def add_calendar_months(value: datetime, months: int) -> datetime:
    """Return the same local date/time shifted by whole calendar months."""
    zero_based_month = value.month - 1 + months
    year = value.year + zero_based_month // 12
    month = zero_based_month % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def active_subscription_for(user):
    now = timezone.now()
    UserSubscription.objects.filter(user=user, status=SubscriptionStatus.ACTIVE, ends_at__lte=now).update(
        status=SubscriptionStatus.EXPIRED
    )
    return (
        UserSubscription.objects.select_related("plan")
        .filter(user=user, status=SubscriptionStatus.ACTIVE, ends_at__gt=now)
        .order_by("-ends_at")
        .first()
    )


def get_current_subscription_tier(user) -> str:
    subscription = active_subscription_for(user)
    return subscription.plan.tier if subscription else SubscriptionTier.BASIC


def current_plan_for(user) -> SubscriptionPlan:
    subscription = active_subscription_for(user)
    if subscription:
        return subscription.plan
    return SubscriptionPlan.objects.get(tier=SubscriptionTier.BASIC)


@transaction.atomic
def initiate_payment(*, user, tier: str, months: int, callback_url: str):
    if months not in ALLOWED_MONTHS:
        raise ValidationError({"months": "Choose 1, 3, 6, or 12 months."})
    if tier == SubscriptionTier.BASIC:
        raise ValidationError({"tier": "The Basic plan does not require payment."})
    try:
        plan = SubscriptionPlan.objects.get(tier=tier)
    except SubscriptionPlan.DoesNotExist as exc:
        raise ValidationError({"tier": "Unknown subscription plan."}) from exc

    transaction_record = PaymentTransaction.objects.create(
        user=user,
        plan=plan,
        months=months,
        amount_cents=plan.monthly_price_cents * months,
        currency=plan.currency,
    )
    gateway = get_gateway()
    result = gateway.request(
        transaction_id=transaction_record.pk,
        amount_cents=transaction_record.amount_cents,
        currency=transaction_record.currency,
        description=f"SoundWave {plan.tier} subscription for {months} month(s)",
        callback_url=callback_url,
        email=user.email,
    )
    transaction_record.gateway = gateway.name
    transaction_record.authority = result.authority
    transaction_record.gateway_response = result.raw
    transaction_record.save(update_fields=["gateway", "authority", "gateway_response", "updated_at"])
    return transaction_record, result.payment_url


@transaction.atomic
def verify_payment(*, authority: str, status: str):
    try:
        payment = PaymentTransaction.objects.select_for_update().select_related("plan", "user").get(authority=authority)
    except PaymentTransaction.DoesNotExist as exc:
        raise ValidationError({"authority": "Unknown payment authority."}) from exc

    if payment.status == PaymentStatus.SUCCESS:
        return payment
    gateway = get_gateway() if payment.gateway != "local-sandbox" else __import__(
        "subscriptions.gateways", fromlist=["LocalSandboxGateway"]
    ).LocalSandboxGateway()
    result = gateway.verify(authority=authority, amount_cents=payment.amount_cents, status=status)
    payment.gateway_response = result.raw
    if not result.success:
        payment.status = PaymentStatus.CANCELED if status.upper() != "OK" else PaymentStatus.FAILED
        payment.save(update_fields=["status", "gateway_response", "updated_at"])
        return payment

    payment.status = PaymentStatus.SUCCESS
    payment.reference_id = result.reference_id
    payment.verified_at = timezone.now()
    payment.save(update_fields=["status", "reference_id", "verified_at", "gateway_response", "updated_at"])

    current = active_subscription_for(payment.user)
    starts_at = timezone.now()
    base_time = current.ends_at if current and current.ends_at > starts_at else starts_at
    if current:
        current.status = SubscriptionStatus.CANCELED
        current.save(update_fields=["status", "updated_at"])
    UserSubscription.objects.create(
        user=payment.user,
        plan=payment.plan,
        starts_at=starts_at,
        ends_at=add_calendar_months(base_time, payment.months),
        status=SubscriptionStatus.ACTIVE,
    )
    return payment
