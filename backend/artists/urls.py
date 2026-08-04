from django.urls import include, path
from rest_framework.routers import DefaultRouter

from artists.views import ArtistApplicationViewSet, ArtistProfileViewSet

app_name = "artists"

router = DefaultRouter()
router.register("applications", ArtistApplicationViewSet, basename="application")
router.register("profiles", ArtistProfileViewSet, basename="profile")

urlpatterns = [
    path("", include(router.urls)),
]
