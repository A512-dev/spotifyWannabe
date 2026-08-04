from __future__ import annotations

from collections import defaultdict
from datetime import date

from django.db import transaction
from django.db.models import Count, QuerySet, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from artists.models import ArtistApplication, ArtistApplicationStatus, ArtistProfile
from reports.models import ArtistRevenueRecord, PaymentStatus
from reports.signals import artist_revenue_record_created, artist_revenue_record_settled
from support.models import Ticket, TicketPriority, TicketStatus


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
) -> ArtistRevenueRecord:
    if not artist.is_approved:
        raise ValidationError({"artistId": "Revenue can only be recorded for approved artists."})
    if period_end < period_start:
        raise ValidationError({"periodEnd": "The reporting period end cannot be before its start."})
    if platform_fee_cents > gross_revenue_cents:
        raise ValidationError({"platformFeeCents": "The platform fee cannot exceed gross revenue."})

    if ArtistRevenueRecord.objects.filter(
        artist=artist,
        period_start=period_start,
        period_end=period_end,
    ).exists():
        raise ValidationError(
            {"period": "A revenue record already exists for this artist and period."}
        )

    record = ArtistRevenueRecord.objects.create(
        artist=artist,
        period_start=period_start,
        period_end=period_end,
        unique_listener_count=unique_listener_count,
        stream_count=stream_count,
        gross_revenue_cents=gross_revenue_cents,
        platform_fee_cents=platform_fee_cents,
        currency=currency,
        calculation_note=calculation_note.strip(),
    )

    transaction.on_commit(
        lambda: artist_revenue_record_created.send(
            sender=ArtistRevenueRecord,
            record_id=record.pk,
            artist_id=artist.pk,
            artist_user_id=artist.user_id,
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
        .select_related("artist", "artist__user", "settled_by")
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
        unique_listeners=Sum("unique_listener_count"),
        streams=Sum("stream_count"),
        pending_payments=Count("id", filter=models_q(payment_status=PaymentStatus.PENDING)),
        settled_payments=Count("id", filter=models_q(payment_status=PaymentStatus.SETTLED)),
    )
    return {
        "periodStart": period_start,
        "periodEnd": period_end,
        "artistId": str(artist.pk),
        "artistName": artist.stage_name,
        "recordCount": queryset.count(),
        "uniqueListeners": totals["unique_listeners"] or 0,
        "streams": totals["streams"] or 0,
        "pendingPayments": totals["pending_payments"] or 0,
        "settledPayments": totals["settled_payments"] or 0,
        "currencyBreakdown": build_currency_breakdown(queryset),
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


def build_admin_overview(*, period_start: date, period_end: date) -> dict:
    queryset = filter_records_for_period(
        ArtistRevenueRecord.objects.all(),
        period_start=period_start,
        period_end=period_end,
    )
    totals = queryset.aggregate(
        unique_listeners=Sum("unique_listener_count"),
        streams=Sum("stream_count"),
        pending_payments=Count("id", filter=models_q(payment_status=PaymentStatus.PENDING)),
        settled_payments=Count("id", filter=models_q(payment_status=PaymentStatus.SETTLED)),
    )
    return {
        "periodStart": period_start,
        "periodEnd": period_end,
        "accounting": {
            "recordCount": queryset.count(),
            "artistCount": queryset.values("artist_id").distinct().count(),
            "uniqueListeners": totals["unique_listeners"] or 0,
            "streams": totals["streams"] or 0,
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
        "support": build_support_overview(),
        "generatedAt": timezone.now(),
    }
