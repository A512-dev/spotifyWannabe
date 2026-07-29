from __future__ import annotations

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from common.permissions import IsAdministrator
from operations.models import SubscriptionPlan, SubscriptionPriceChange
from operations.serializers import (
    SubscriptionPlanSerializer,
    SubscriptionPriceChangeSerializer,
    SubscriptionPriceUpdateSerializer,
)
from operations.services import build_plan_quote, update_subscription_price


class SubscriptionPlanViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = SubscriptionPlan.objects.select_related("updated_by").all()
    serializer_class = SubscriptionPlanSerializer
    lookup_field = "tier"
    pagination_class = None
    http_method_names = ["get", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "partial_update":
            return [IsAdministrator()]
        return [AllowAny()]

    def partial_update(self, request, *args, **kwargs):
        plan = self.get_object()
        input_serializer = SubscriptionPriceUpdateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        updated_plan = update_subscription_price(
            plan=plan,
            monthly_price_cents=input_serializer.validated_data["monthlyPriceCents"],
            administrator=request.user,
        )
        output_serializer = SubscriptionPlanSerializer(
            updated_plan,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="quote")
    def quote(self, request, tier=None):
        plan = self.get_object()
        raw_months = request.query_params.get("months")
        try:
            months = int(raw_months)
        except (TypeError, ValueError):
            raise ValidationError(
                {"months": "Provide a valid billing period in months."}
            )
        return Response(build_plan_quote(plan=plan, months=months))


class SubscriptionPriceChangeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = SubscriptionPriceChange.objects.select_related(
        "plan", "changed_by"
    ).all()
    serializer_class = SubscriptionPriceChangeSerializer
    permission_classes = [IsAdministrator]
    http_method_names = ["get", "head", "options"]
