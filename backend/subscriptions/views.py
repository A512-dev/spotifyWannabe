from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.models import PaymentTransaction
from subscriptions.serializers import PaymentInitiateSerializer, PaymentTransactionSerializer, UserSubscriptionSerializer
from subscriptions.services import active_subscription_for, initiate_payment, verify_payment


class CurrentSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription = active_subscription_for(request.user)
        if subscription is None:
            return Response({"subscription": None, "tier": "basic"})
        return Response({"subscription": UserSubscriptionSerializer(subscription).data, "tier": subscription.plan.tier})


class PaymentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return PaymentTransaction.objects.filter(user=self.request.user).select_related("plan")

    @action(detail=False, methods=["post"], url_path="initiate")
    def initiate(self, request):
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment, payment_url = initiate_payment(
            user=request.user,
            tier=serializer.validated_data["tier"],
            months=int(serializer.validated_data["months"]),
            callback_url=serializer.validated_data["callbackUrl"],
        )
        return Response(
            {"payment": PaymentTransactionSerializer(payment).data, "paymentUrl": payment_url},
            status=status.HTTP_201_CREATED,
        )


class PaymentCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        payment = verify_payment(
            authority=request.query_params.get("Authority", ""),
            status=request.query_params.get("Status", ""),
        )
        return Response(PaymentTransactionSerializer(payment).data)
