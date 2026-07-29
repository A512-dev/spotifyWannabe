from django.urls import include, path
from rest_framework.routers import DefaultRouter

from artists.views import ArtistApplicationViewSet

app_name = "artists"

router = DefaultRouter()
router.register("applications", ArtistApplicationViewSet, basename="application")

urlpatterns = [
    path("", include(router.urls)),
]
