from django.urls import include, path
from rest_framework.routers import DefaultRouter

from support.views import TicketViewSet

app_name = "support"

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")

urlpatterns = [
    path("", include(router.urls)),
]
