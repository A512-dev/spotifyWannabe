from __future__ import annotations

from datetime import date

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdministrator, IsApprovedArtist, IsSupportOrAdministrator, user_in_group
from reports.models import ArtistRevenueRecord, PaymentStatus, RevenueCurrency
from reports.permissions import CanViewOperationalReports
from reports.serializers import (
    ArtistRevenueRecordCreateSerializer,
    ArtistRevenueRecordSerializer,
)
from reports.services import (
    build_admin_overview,
    build_artist_overview,
    build_support_overview,
    settle_artist_revenue_record,
)


def parse_period(request) -> tuple[date, date]:
    today = timezone.localdate()
    default_start = today.replace(day=1)
    raw_start = request.query_params.get("periodStart")
    raw_end = request.query_params.get("periodEnd")
    period_start = parse_date(raw_start) if raw_start else default_start
    period_end = parse_date(raw_end) if raw_end else today

    if period_start is None:
        raise ValidationError({"periodStart": "Use ISO date format YYYY-MM-DD."})
    if period_end is None:
        raise ValidationError({"periodEnd": "Use ISO date format YYYY-MM-DD."})
    if period_end < period_start:
        raise ValidationError({"periodEnd": "The period end cannot be before its start."})
    return period_start, period_end


class ArtistRevenueRecordViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["artist__stage_name", "artist__user__email", "artist__user__username"]
    ordering_fields = [
        "period_start",
        "period_end",
        "stream_count",
        "unique_listener_count",
        "net_revenue_cents",
        "payment_status",
    ]
    ordering = ["-period_start", "artist__stage_name"]

    def get_permissions(self):
        if self.action in {"create", "settle"}:
            return [IsAdministrator()]
        return [CanViewOperationalReports()]

    def get_serializer_class(self):
        if self.action == "create":
            return ArtistRevenueRecordCreateSerializer
        return ArtistRevenueRecordSerializer

    def get_queryset(self):
        queryset = ArtistRevenueRecord.objects.select_related(
            "artist",
            "artist__user",
            "settled_by",
        )
        user = self.request.user
        if not (user.is_superuser or user_in_group(user, "support")):
            artist_profile = getattr(user, "artist_profile", None)
            if artist_profile is None or not artist_profile.is_approved:
                return queryset.none()
            queryset = queryset.filter(artist=artist_profile)

        payment_status = self.request.query_params.get("paymentStatus")
        if payment_status in PaymentStatus.values:
            queryset = queryset.filter(payment_status=payment_status)

        currency = self.request.query_params.get("currency")
        if currency in RevenueCurrency.values:
            queryset = queryset.filter(currency=currency)

        artist_id = self.request.query_params.get("artistId")
        if artist_id and (user.is_superuser or user_in_group(user, "support")):
            queryset = queryset.filter(artist_id=artist_id)

        raw_start = self.request.query_params.get("periodStart")
        raw_end = self.request.query_params.get("periodEnd")
        if raw_start:
            period_start = parse_date(raw_start)
            if period_start is None:
                raise ValidationError({"periodStart": "Use ISO date format YYYY-MM-DD."})
            queryset = queryset.filter(period_end__gte=period_start)
        if raw_end:
            period_end = parse_date(raw_end)
            if period_end is None:
                raise ValidationError({"periodEnd": "Use ISO date format YYYY-MM-DD."})
            queryset = queryset.filter(period_start__lte=period_end)

        return queryset

    @action(detail=True, methods=["post"], url_path="settle")
    def settle(self, request, pk=None):
        record = self.get_object()
        settled_record = settle_artist_revenue_record(
            record=record,
            administrator=request.user,
        )
        serializer = ArtistRevenueRecordSerializer(
            settled_record,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class ArtistOverviewView(APIView):
    permission_classes = [IsApprovedArtist]

    def get(self, request):
        period_start, period_end = parse_period(request)
        data = build_artist_overview(
            artist=request.user.artist_profile,
            period_start=period_start,
            period_end=period_end,
        )
        return Response(data)


class SupportOverviewView(APIView):
    permission_classes = [IsSupportOrAdministrator]

    def get(self, request):
        return Response(build_support_overview())


class AdminOverviewView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        period_start, period_end = parse_period(request)
        return Response(
            build_admin_overview(
                period_start=period_start,
                period_end=period_end,
            )
        )
