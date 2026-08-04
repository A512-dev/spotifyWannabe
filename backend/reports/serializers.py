from __future__ import annotations

from rest_framework import serializers

from artists.models import ArtistProfile
from reports.models import ArtistRevenueRecord
from reports.services import create_artist_revenue_record


class ArtistRevenueRecordSerializer(serializers.ModelSerializer):
    artistId = serializers.SerializerMethodField()
    artistUserId = serializers.SerializerMethodField()
    artistName = serializers.CharField(source="artist.stage_name", read_only=True)
    periodStart = serializers.DateField(source="period_start", read_only=True)
    periodEnd = serializers.DateField(source="period_end", read_only=True)
    uniqueListeners = serializers.IntegerField(source="unique_listener_count", read_only=True)
    streamCount = serializers.IntegerField(source="stream_count", read_only=True)
    grossRevenueCents = serializers.IntegerField(source="gross_revenue_cents", read_only=True)
    platformFeeCents = serializers.IntegerField(source="platform_fee_cents", read_only=True)
    netRevenueCents = serializers.IntegerField(source="net_revenue_cents", read_only=True)
    paymentStatus = serializers.CharField(source="payment_status", read_only=True)
    settledAt = serializers.DateTimeField(source="settled_at", read_only=True)
    settledByUserId = serializers.SerializerMethodField()
    calculationNote = serializers.CharField(source="calculation_note", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ArtistRevenueRecord
        fields = [
            "id",
            "artistId",
            "artistUserId",
            "artistName",
            "periodStart",
            "periodEnd",
            "uniqueListeners",
            "streamCount",
            "grossRevenueCents",
            "platformFeeCents",
            "netRevenueCents",
            "currency",
            "paymentStatus",
            "settledAt",
            "settledByUserId",
            "calculationNote",
            "createdAt",
            "updatedAt",
        ]

    def get_artistId(self, obj: ArtistRevenueRecord) -> str:
        return str(obj.artist_id)

    def get_artistUserId(self, obj: ArtistRevenueRecord) -> str:
        return str(obj.artist.user_id)

    def get_settledByUserId(self, obj: ArtistRevenueRecord) -> str | None:
        return str(obj.settled_by_id) if obj.settled_by_id is not None else None


class ArtistRevenueRecordCreateSerializer(serializers.Serializer):
    artistId = serializers.PrimaryKeyRelatedField(
        source="artist",
        queryset=ArtistProfile.objects.filter(is_approved=True),
    )
    periodStart = serializers.DateField(source="period_start")
    periodEnd = serializers.DateField(source="period_end")
    uniqueListeners = serializers.IntegerField(source="unique_listener_count", min_value=0)
    streamCount = serializers.IntegerField(source="stream_count", min_value=0)
    grossRevenueCents = serializers.IntegerField(source="gross_revenue_cents", min_value=0)
    platformFeeCents = serializers.IntegerField(source="platform_fee_cents", min_value=0)
    currency = serializers.ChoiceField(choices=["USD", "EUR", "IRR"])
    calculationNote = serializers.CharField(
        source="calculation_note",
        required=False,
        allow_blank=True,
        default="",
    )

    def validate(self, attrs):
        if attrs["period_end"] < attrs["period_start"]:
            raise serializers.ValidationError(
                {"periodEnd": "The reporting period end cannot be before its start."}
            )
        if attrs["platform_fee_cents"] > attrs["gross_revenue_cents"]:
            raise serializers.ValidationError(
                {"platformFeeCents": "The platform fee cannot exceed gross revenue."}
            )
        if ArtistRevenueRecord.objects.filter(
            artist=attrs["artist"],
            period_start=attrs["period_start"],
            period_end=attrs["period_end"],
        ).exists():
            raise serializers.ValidationError(
                {"period": "A revenue record already exists for this artist and period."}
            )
        return attrs

    def create(self, validated_data):
        return create_artist_revenue_record(**validated_data)

    def to_representation(self, instance):
        return ArtistRevenueRecordSerializer(instance, context=self.context).data


class ArtistRevenueGenerateSerializer(serializers.Serializer):
    artistId = serializers.PrimaryKeyRelatedField(
        source="artist", queryset=ArtistProfile.objects.filter(is_approved=True)
    )
    periodStart = serializers.DateField(source="period_start")
    periodEnd = serializers.DateField(source="period_end")
    currency = serializers.ChoiceField(choices=["USD", "EUR", "IRR"])
    perStreamCents = serializers.IntegerField(source="per_stream_cents", min_value=0)
    perUniqueListenerCents = serializers.IntegerField(
        source="per_unique_listener_cents", min_value=0
    )
    platformFeePercent = serializers.IntegerField(
        source="platform_fee_percent", min_value=0, max_value=100
    )

    def validate(self, attrs):
        if attrs["period_end"] < attrs["period_start"]:
            raise serializers.ValidationError(
                {"periodEnd": "The reporting period end cannot be before its start."}
            )
        return attrs

    def create(self, validated_data):
        from reports.services import generate_artist_revenue_record_from_streams
        return generate_artist_revenue_record_from_streams(**validated_data)

    def to_representation(self, instance):
        return ArtistRevenueRecordSerializer(instance, context=self.context).data
