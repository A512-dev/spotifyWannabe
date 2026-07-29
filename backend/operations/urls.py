from django.urls import include, path
from rest_framework.routers import DefaultRouter

from operations.views import SubscriptionPlanViewSet, SubscriptionPriceChangeViewSet

app_name = "operations"

router = DefaultRouter()
router.register(
    "subscription-prices",
    SubscriptionPlanViewSet,
    basename="subscription-price",
)
router.register(
    "subscription-price-changes",
    SubscriptionPriceChangeViewSet,
    basename="subscription-price-change",
)

urlpatterns = [path("", include(router.urls))]
