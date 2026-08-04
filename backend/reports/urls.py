from django.urls import include, path
from rest_framework.routers import DefaultRouter

from reports.views import (
    AdminOverviewView,
    ArtistOverviewView,
    ArtistRevenueRecordViewSet,
    SupportOverviewView,
)

app_name = "reports"

router = DefaultRouter()
router.register("artist-revenue", ArtistRevenueRecordViewSet, basename="artist-revenue")

urlpatterns = [
    path("", include(router.urls)),
    path("artist/overview/", ArtistOverviewView.as_view(), name="artist-overview"),
    path("support/overview/", SupportOverviewView.as_view(), name="support-overview"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
]
