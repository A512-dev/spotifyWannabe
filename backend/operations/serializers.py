from __future__ import annotations

from rest_framework import serializers

from operations.models import SubscriptionPlan, SubscriptionPriceChange, SubscriptionTier
from operations.services import ALLOWED_BILLING_MONTHS


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    monthlyPriceCents = serializers.IntegerField(source="monthly_price_cents", read_only=True)
    playlistLimit = serializers.IntegerField(source="playlist_limit", read_only=True, allow_null=True)
    canUploadProfileImage = serializers.BooleanField(
        source="can_upload_profile_image", read_only=True
    )
    canDownloadTracks = serializers.BooleanField(source="can_download_tracks", read_only=True)
    hasEarlyAccess = serializers.BooleanField(source="has_early_access", read_only=True)
    canViewAdvancedStats = serializers.BooleanField(
        source="can_view_advanced_stats", read_only=True
    )
    periodPrices = serializers.SerializerMethodField()
    updatedByUserId = serializers.SerializerMethodField()
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            "tier",
            "monthlyPriceCents",
            "currency",
            "playlistLimit",
            "canUploadProfileImage",
            "canDownloadTracks",
            "hasEarlyAccess",
            "canViewAdvancedStats",
            "periodPrices",
            "updatedByUserId",
            "updatedAt",
        ]

    def get_periodPrices(self, obj: SubscriptionPlan) -> dict[str, int]:
        return {
            str(months): obj.monthly_price_cents * months
            for months in ALLOWED_BILLING_MONTHS
        }

    def get_updatedByUserId(self, obj: SubscriptionPlan) -> str | None:
        return str(obj.updated_by_id) if obj.updated_by_id is not None else None


class SubscriptionPriceUpdateSerializer(serializers.Serializer):
    monthlyPriceCents = serializers.IntegerField(min_value=1)


class SubscriptionPriceChangeSerializer(serializers.ModelSerializer):
    tier = serializers.CharField(source="plan.tier", read_only=True)
    oldMonthlyPriceCents = serializers.IntegerField(
        source="old_monthly_price_cents", read_only=True
    )
    newMonthlyPriceCents = serializers.IntegerField(
        source="new_monthly_price_cents", read_only=True
    )
    changedByUserId = serializers.SerializerMethodField()
    changedAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = SubscriptionPriceChange
        fields = [
            "id",
            "tier",
            "oldMonthlyPriceCents",
            "newMonthlyPriceCents",
            "changedByUserId",
            "changedAt",
        ]

    def get_changedByUserId(self, obj: SubscriptionPriceChange) -> str:
        return str(obj.changed_by_id)
