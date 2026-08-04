from django.urls import include, path
from rest_framework.routers import DefaultRouter

from playlists.views import PlaylistViewSet

app_name = "playlists"
router = DefaultRouter()
router.register("", PlaylistViewSet, basename="playlist")
urlpatterns = [path("", include(router.urls))]
