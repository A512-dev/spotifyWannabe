from rest_framework import serializers

from operations.serializers import SubscriptionPlanSerializer
from subscriptions.models import PaymentTransaction, UserSubscription
from subscriptions.services import ALLOWED_MONTHS


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    startsAt = serializers.DateTimeField(source="starts_at", read_only=True)
    endsAt = serializers.DateTimeField(source="ends_at", read_only=True)

    class Meta:
        model = UserSubscription
        fields = ["id", "plan", "startsAt", "endsAt", "status"]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    userId = serializers.SerializerMethodField()
    tier = serializers.CharField(source="plan.tier", read_only=True)
    amountCents = serializers.IntegerField(source="amount_cents", read_only=True)
    referenceId = serializers.CharField(source="reference_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    verifiedAt = serializers.DateTimeField(source="verified_at", read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            "id", "userId", "tier", "months", "amountCents", "currency", "status",
            "gateway", "referenceId", "createdAt", "verifiedAt",
        ]

    def get_userId(self, obj) -> str:
        return str(obj.user_id)


class PaymentInitiateSerializer(serializers.Serializer):
    tier = serializers.ChoiceField(choices=["silver", "gold"])
    months = serializers.ChoiceField(choices=ALLOWED_MONTHS)
    callbackUrl = serializers.URLField()
