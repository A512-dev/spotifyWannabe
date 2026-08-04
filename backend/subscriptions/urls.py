from django.urls import include, path
from rest_framework.routers import DefaultRouter

from subscriptions.views import CurrentSubscriptionView, PaymentCallbackView, PaymentViewSet

app_name = "subscriptions"
router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")
urlpatterns = [
    path("current/", CurrentSubscriptionView.as_view(), name="current"),
    path("payments/callback/", PaymentCallbackView.as_view(), name="payment-callback"),
    path("", include(router.urls)),
]
