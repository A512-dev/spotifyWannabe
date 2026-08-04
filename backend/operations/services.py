from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from operations.models import SubscriptionPlan, SubscriptionPriceChange, SubscriptionTier

ALLOWED_BILLING_MONTHS = (1, 3, 6, 12)


@transaction.atomic
def update_subscription_price(*, plan: SubscriptionPlan, monthly_price_cents: int, administrator):
    if not administrator.is_authenticated or not administrator.is_superuser:
        raise PermissionDenied("Only the administrator can update subscription prices.")

    locked_plan = SubscriptionPlan.objects.select_for_update().get(pk=plan.pk)
    if locked_plan.tier == SubscriptionTier.BASIC:
        raise ValidationError({"tier": "The Basic plan price cannot be changed."})

    old_price = locked_plan.monthly_price_cents
    if old_price == monthly_price_cents:
        return locked_plan

    locked_plan.monthly_price_cents = monthly_price_cents
    locked_plan.updated_by = administrator
    try:
        locked_plan.save(
            update_fields=["monthly_price_cents", "updated_by", "updated_at"]
        )
    except DjangoValidationError as exc:
        raise ValidationError(exc.message_dict) from exc

    SubscriptionPriceChange.objects.create(
        plan=locked_plan,
        old_monthly_price_cents=old_price,
        new_monthly_price_cents=monthly_price_cents,
        changed_by=administrator,
    )
    return locked_plan


def build_plan_quote(*, plan: SubscriptionPlan, months: int) -> dict:
    if months not in ALLOWED_BILLING_MONTHS:
        raise ValidationError(
            {"months": "The billing period must be one of 1, 3, 6, or 12 months."}
        )
    return {
        "tier": plan.tier,
        "months": months,
        "monthlyPriceCents": plan.monthly_price_cents,
        "totalPriceCents": plan.monthly_price_cents * months,
        "currency": plan.currency,
    }
