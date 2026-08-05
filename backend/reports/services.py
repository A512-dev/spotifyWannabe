from __future__ import annotations

from collections import defaultdict
from datetime import date

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import CharField, Count, OuterRef, QuerySet, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from artists.models import ArtistApplication, ArtistApplicationStatus, ArtistProfile
from operations.models import SubscriptionTier
from reports.models import ArtistRevenueRecord, PaymentStatus
from reports.signals import artist_revenue_record_created, artist_revenue_record_settled
from subscriptions.models import (
    PaymentStatus as SubscriptionPaymentStatus,
    PaymentTransaction,
    SubscriptionStatus,
    UserSubscription,
)
from support.models import Ticket, TicketPriority, TicketStatus

User = get_user_model()


def filter_records_for_period(
    queryset: QuerySet[ArtistRevenueRecord],
    *,
    period_start: date,
    period_end: date,
) -> QuerySet[ArtistRevenueRecord]:
    return queryset.filter(
        period_start__lte=period_end,
        period_end__gte=period_start,
    )


@transaction.atomic
def create_artist_revenue_record(
    *,
    artist: ArtistProfile,
    period_start: date,
    period_end: date,
    unique_listener_count: int,
    stream_count: int,
    gross_revenue_cents: int,
    platform_fee_cents: int,
    currency: str,
    calculation_note: str = "",
    track_breakdown: list[dict] | None = None,
) -> ArtistRevenueRecord:
    locked_artist = ArtistProfile.objects.select_for_update().get(pk=artist.pk)
    if not locked_artist.is_approved:
        raise ValidationError({"artistId": "Revenue can only be recorded for approved artists."})
    if period_end < period_start:
        raise ValidationError({"periodEnd": "The reporting period end cannot be before its start."})
    if platform_fee_cents > gross_revenue_cents:
        raise ValidationError({"platformFeeCents": "The platform fee cannot exceed gross revenue."})

    if ArtistRevenueRecord.objects.filter(
        artist=locked_artist,
        period_start__lte=period_end,
        period_end__gte=period_start,
    ).exists():
        raise ValidationError(
            {"period": "This period overlaps an existing revenue record for the artist."}
        )

    record = ArtistRevenueRecord.objects.create(
        artist=locked_artist,
        period_start=period_start,
        period_end=period_end,
        unique_listener_count=unique_listener_count,
        stream_count=stream_count,
        gross_revenue_cents=gross_revenue_cents,
        platform_fee_cents=platform_fee_cents,
        currency=currency,
        calculation_note=calculation_note.strip(),
        track_breakdown=track_breakdown or [],
    )

    transaction.on_commit(
        lambda: artist_revenue_record_created.send(
            sender=ArtistRevenueRecord,
            record_id=record.pk,
            artist_id=locked_artist.pk,
            artist_user_id=locked_artist.user_id,
        )
    )
    return record


@transaction.atomic
def settle_artist_revenue_record(
    *,
    record: ArtistRevenueRecord,
    administrator,
) -> ArtistRevenueRecord:
    if not administrator.is_authenticated or not administrator.is_superuser:
        raise PermissionDenied("Only the administrator can confirm artist settlements.")

    locked_record = (
        ArtistRevenueRecord.objects.select_for_update()
        .select_related("artist", "artist__user")
        .get(pk=record.pk)
    )
    if locked_record.payment_status == PaymentStatus.SETTLED:
        raise ValidationError({"paymentStatus": "This revenue record is already settled."})

    locked_record.payment_status = PaymentStatus.SETTLED
    locked_record.settled_at = timezone.now()
    locked_record.settled_by = administrator
    locked_record.save(
        update_fields=[
            "payment_status",
            "settled_at",
            "settled_by",
            "net_revenue_cents",
            "updated_at",
        ]
    )

    transaction.on_commit(
        lambda: artist_revenue_record_settled.send(
            sender=ArtistRevenueRecord,
            record_id=locked_record.pk,
            artist_id=locked_record.artist_id,
            artist_user_id=locked_record.artist.user_id,
            administrator_id=administrator.pk,
        )
    )
    return locked_record


def build_currency_breakdown(queryset: QuerySet[ArtistRevenueRecord]) -> list[dict]:
    rows = (
        queryset.values("currency")
        .annotate(
            gross_revenue_cents=Sum("gross_revenue_cents"),
            platform_fee_cents=Sum("platform_fee_cents"),
            artist_payout_cents=Sum("net_revenue_cents"),
        )
        .order_by("currency")
    )
    return [
        {
            "currency": row["currency"],
            "grossRevenueCents": row["gross_revenue_cents"] or 0,
            "platformFeeCents": row["platform_fee_cents"] or 0,
            "artistPayoutCents": row["artist_payout_cents"] or 0,
        }
        for row in rows
    ]


def build_artist_overview(
    *,
    artist: ArtistProfile,
    period_start: date,
    period_end: date,
) -> dict:
    queryset = filter_records_for_period(
        ArtistRevenueRecord.objects.filter(artist=artist),
        period_start=period_start,
        period_end=period_end,
    )
    totals = queryset.aggregate(
        pending_payments=Count("id", filter=models_q(payment_status=PaymentStatus.PENDING)),
        settled_payments=Count("id", filter=models_q(payment_status=PaymentStatus.SETTLED)),
    )
    from music.models import StreamEvent

    live_events = StreamEvent.objects.filter(
        track__artist=artist,
        counted=True,
        streamed_on__range=(period_start, period_end),
    )
    unique_listeners = live_events.values("listener_id").distinct().count()
    track_revenue: dict[tuple[str, str], dict] = {}
    for record in queryset:
        for row in record.track_breakdown:
            key = (str(row.get("trackId")), record.currency)
            aggregate = track_revenue.setdefault(
                key,
                {
                    "trackId": str(row.get("trackId")),
                    "trackTitle": row.get("trackTitle", "Track"),
                    "currency": record.currency,
                    "streamCount": 0,
                    "uniqueListeners": 0,
                    "netRevenueCents": 0,
                },
            )
            aggregate["streamCount"] += int(row.get("streamCount", 0))
            aggregate["uniqueListeners"] += int(row.get("uniqueListeners", 0))
            aggregate["netRevenueCents"] += int(row.get("netRevenueCents", 0))
    return {
        "periodStart": period_start,
        "periodEnd": period_end,
        "artistId": str(artist.pk),
        "artistName": artist.stage_name,
        "recordCount": queryset.count(),
        "uniqueListeners": unique_listeners,
        "streams": live_events.count(),
        "pendingPayments": totals["pending_payments"] or 0,
        "settledPayments": totals["settled_payments"] or 0,
        "currencyBreakdown": build_currency_breakdown(queryset),
        "trackRevenueBreakdown": list(track_revenue.values()),
        "generatedAt": timezone.now(),
    }



def generate_artist_revenue_record_from_streams(
    *,
    artist: ArtistProfile,
    period_start: date,
    period_end: date,
    currency: str,
    per_stream_cents: int,
    per_unique_listener_cents: int,
    platform_fee_percent: int,
) -> ArtistRevenueRecord:
    """Aggregate real StreamEvent rows into one monthly accounting record.

    The project statement does not provide the promised numeric reward formula, so the
    rates are explicit administrator inputs/configuration rather than hidden frontend math.
    """
    from music.models import StreamEvent

    if period_end < period_start:
        raise ValidationError({"periodEnd": "The reporting period end cannot be before its start."})
    if min(per_stream_cents, per_unique_listener_cents) < 0:
        raise ValidationError({"rates": "Revenue rates cannot be negative."})
    if platform_fee_percent < 0 or platform_fee_percent > 100:
        raise ValidationError({"platformFeePercent": "Use a percentage between 0 and 100."})

    events = StreamEvent.objects.filter(
        track__artist=artist,
        counted=True,
        streamed_on__range=(period_start, period_end),
    )
    stream_count = events.count()
    unique_listener_count = events.values("listener_id").distinct().count()
    gross_revenue_cents = (
        stream_count * per_stream_cents
        + unique_listener_count * per_unique_listener_cents
    )
    platform_fee_cents = gross_revenue_cents * platform_fee_percent // 100
    track_breakdown = []
    for row in events.values("track_id", "track__title").annotate(
        stream_count=Count("id"),
        unique_listener_count=Count("listener_id", distinct=True),
    ).order_by("track_id"):
        track_gross = (
            row["stream_count"] * per_stream_cents
            + row["unique_listener_count"] * per_unique_listener_cents
        )
        track_fee = track_gross * platform_fee_percent // 100
        track_breakdown.append(
            {
                "trackId": str(row["track_id"]),
                "trackTitle": row["track__title"],
                "streamCount": row["stream_count"],
                "uniqueListeners": row["unique_listener_count"],
                "grossRevenueCents": track_gross,
                "platformFeeCents": track_fee,
                "netRevenueCents": track_gross - track_fee,
            }
        )
    allocated_fee = sum(row["platformFeeCents"] for row in track_breakdown)
    if track_breakdown and allocated_fee != platform_fee_cents:
        adjustment = platform_fee_cents - allocated_fee
        track_breakdown[0]["platformFeeCents"] += adjustment
        track_breakdown[0]["netRevenueCents"] -= adjustment
    return create_artist_revenue_record(
        artist=artist,
        period_start=period_start,
        period_end=period_end,
        unique_listener_count=unique_listener_count,
        stream_count=stream_count,
        gross_revenue_cents=gross_revenue_cents,
        platform_fee_cents=platform_fee_cents,
        currency=currency,
        calculation_note=(
            f"Backend aggregation: {per_stream_cents} cents/stream, "
            f"{per_unique_listener_cents} cents/unique listener, "
            f"{platform_fee_percent}% platform fee."
        ),
        track_breakdown=track_breakdown,
    )

def models_q(**kwargs):
    """Local import helper keeps report aggregation declarations compact."""
    from django.db.models import Q

    return Q(**kwargs)


def build_support_overview() -> dict:
    ticket_counts = {choice: 0 for choice in TicketStatus.values}
    for row in Ticket.objects.values("status").annotate(total=Count("id")):
        ticket_counts[row["status"]] = row["total"]

    approval_counts = {choice: 0 for choice in ArtistApplicationStatus.values}
    for row in ArtistApplication.objects.values("status").annotate(total=Count("id")):
        approval_counts[row["status"]] = row["total"]

    return {
        "tickets": ticket_counts,
        "artistApplications": approval_counts,
        "urgentOpenTickets": Ticket.objects.filter(
            priority=TicketPriority.URGENT,
            status__in=[TicketStatus.OPEN, TicketStatus.WAITING_FOR_USER],
        ).count(),
        "unassignedOpenTickets": Ticket.objects.filter(
            assigned_to__isnull=True,
            status__in=[TicketStatus.OPEN, TicketStatus.WAITING_FOR_USER],
        ).count(),
        "generatedAt": timezone.now(),
    }


def build_subscription_distribution() -> dict[str, int]:
    """Aggregate current listener subscription tiers entirely in the backend."""
    now = timezone.now()
    current_tier = UserSubscription.objects.filter(
        user_id=OuterRef("pk"),
        status=SubscriptionStatus.ACTIVE,
        starts_at__lte=now,
        ends_at__gt=now,
    ).order_by("-ends_at").values("plan__tier")[:1]
    eligible_users = (
        User.objects.filter(is_active=True, is_superuser=False)
        .exclude(groups__name="support")
        .annotate(
            current_subscription_tier=Coalesce(
                Subquery(current_tier, output_field=CharField()),
                Value(SubscriptionTier.BASIC),
            )
        )
    )
    distribution = {tier: 0 for tier in SubscriptionTier.values}
    for row in eligible_users.values("current_subscription_tier").annotate(total=Count("id")):
        tier = row["current_subscription_tier"]
        if tier in distribution:
            distribution[tier] = row["total"]
    distribution["total"] = sum(distribution.values())
    return distribution


def build_subscription_sales(*, period_start: date, period_end: date) -> dict:
    queryset = PaymentTransaction.objects.filter(
        status=SubscriptionPaymentStatus.SUCCESS,
        verified_at__date__range=(period_start, period_end),
    )
    currency_rows = (
        queryset.values("currency")
        .annotate(revenue_cents=Sum("amount_cents"), transaction_count=Count("id"))
        .order_by("currency")
    )
    tier_rows = (
        queryset.values("plan__tier")
        .annotate(revenue_cents=Sum("amount_cents"), transaction_count=Count("id"))
        .order_by("plan__tier")
    )
    return {
        "transactionCount": queryset.count(),
        "currencyBreakdown": [
            {
                "currency": row["currency"],
                "revenueCents": row["revenue_cents"] or 0,
                "transactionCount": row["transaction_count"],
            }
            for row in currency_rows
        ],
        "tierBreakdown": [
            {
                "tier": row["plan__tier"],
                "revenueCents": row["revenue_cents"] or 0,
                "transactionCount": row["transaction_count"],
            }
            for row in tier_rows
        ],
    }


def build_admin_overview(*, period_start: date, period_end: date) -> dict:
    queryset = filter_records_for_period(
        ArtistRevenueRecord.objects.all(),
        period_start=period_start,
        period_end=period_end,
    )
    totals = queryset.aggregate(
        pending_payments=Count("id", filter=models_q(payment_status=PaymentStatus.PENDING)),
        settled_payments=Count("id", filter=models_q(payment_status=PaymentStatus.SETTLED)),
    )
    from music.models import StreamEvent

    live_events = StreamEvent.objects.filter(
        counted=True,
        streamed_on__range=(period_start, period_end),
    )
    unique_listeners = live_events.values("listener_id").distinct().count()
    return {
        "periodStart": period_start,
        "periodEnd": period_end,
        "accounting": {
            "recordCount": queryset.count(),
            "artistCount": queryset.values("artist_id").distinct().count(),
            "uniqueListeners": unique_listeners,
            "streams": live_events.count(),
            "pendingPayments": totals["pending_payments"] or 0,
            "settledPayments": totals["settled_payments"] or 0,
            "currencyBreakdown": build_currency_breakdown(queryset),
        },
        "artists": {
            "approved": ArtistProfile.objects.filter(is_approved=True).count(),
            "pendingApplications": ArtistApplication.objects.filter(
                status=ArtistApplicationStatus.PENDING
            ).count(),
        },
        "subscriptions": {
            "distribution": build_subscription_distribution(),
            "sales": build_subscription_sales(
                period_start=period_start,
                period_end=period_end,
            ),
        },
        "support": build_support_overview(),
        "generatedAt": timezone.now(),
    }
