from django.urls import include, path
from rest_framework.routers import DefaultRouter

from music.views import AlbumViewSet, GenreViewSet, HomeViewSet, ListeningHistoryViewSet, TrackViewSet

app_name = "music"
router = DefaultRouter()
router.register("genres", GenreViewSet, basename="genre")
router.register("albums", AlbumViewSet, basename="album")
router.register("tracks", TrackViewSet, basename="track")
router.register("history", ListeningHistoryViewSet, basename="history")
router.register("home", HomeViewSet, basename="home")
urlpatterns = [path("", include(router.urls))]
