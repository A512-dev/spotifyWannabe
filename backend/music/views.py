from __future__ import annotations

from datetime import date

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from music.models import Album, Genre, ListeningHistory, ReleaseStatus, Track
from music.permissions import IsOwnerArtistOrReadOnly
from music.serializers import (
    AlbumSerializer, AlbumWriteSerializer, GenreSerializer, ListeningHistorySerializer,
    StreamCreateSerializer, StreamEventSerializer, TrackSerializer, TrackWriteSerializer,
)
from music.services import can_access_track, recommend_tracks, register_stream, track_statistics
from operations.models import SubscriptionTier
from subscriptions.services import get_current_subscription_tier


class GenreViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class AlbumViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerArtistOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = Album.objects.select_related("artist", "genre").prefetch_related("tracks", "tracks__artist").annotate(
            listener_count=Count("tracks__stream_events__listener", filter=Q(tracks__stream_events__counted=True), distinct=True)
        )
        if self.action in {"update", "partial_update", "destroy"}:
            return queryset
        tier = get_current_subscription_tier(self.request.user)
        profile = getattr(self.request.user, "artist_profile", None)
        today = timezone.localdate()
        public_filter = Q(status=ReleaseStatus.PUBLISHED, release_date__lte=today)
        if tier == SubscriptionTier.GOLD:
            public_filter |= Q(
                status=ReleaseStatus.PUBLISHED,
                release_date__gt=today,
                is_early_access=True,
            )
        if profile:
            public_filter |= Q(artist=profile)
        queryset = queryset.filter(public_filter).distinct()
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(artist__stage_name__icontains=search))
        ordering = self.request.query_params.get("ordering", "-release_date")
        if ordering in {"release_date", "-release_date", "title", "-title", "listener_count", "-listener_count"}:
            queryset = queryset.order_by(ordering)
        return queryset

    def get_serializer_class(self):
        return AlbumWriteSerializer if self.action in {"create", "update", "partial_update"} else AlbumSerializer


class TrackViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerArtistOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = Track.objects.select_related("artist", "album", "genre").prefetch_related("collaborators").annotate(
            play_count=Count("stream_events", filter=Q(stream_events__counted=True))
        )
        if self.action in {"update", "partial_update", "destroy"}:
            return queryset
        tier = get_current_subscription_tier(self.request.user)
        profile = getattr(self.request.user, "artist_profile", None)
        today = timezone.localdate()
        visible = Q(status=ReleaseStatus.PUBLISHED, release_date__lte=today)
        if tier == SubscriptionTier.GOLD:
            visible |= Q(
                status=ReleaseStatus.PUBLISHED,
                release_date__gt=today,
                is_early_access=True,
            )
        if profile:
            visible |= Q(artist=profile)
        queryset = queryset.filter(visible).distinct()
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(artist__stage_name__icontains=search) | Q(album__title__icontains=search)
            )
        genre = self.request.query_params.get("genre")
        if genre:
            queryset = queryset.filter(genre__slug=genre)
        ordering = self.request.query_params.get("ordering", "-release_date")
        if ordering in {"release_date", "-release_date", "play_count", "-play_count", "title", "-title"}:
            queryset = queryset.order_by(ordering)
        return queryset

    def get_serializer_class(self):
        return TrackWriteSerializer if self.action in {"create", "update", "partial_update"} else TrackSerializer

    @action(detail=True, methods=["post"], url_path="stream", permission_classes=[IsAuthenticated])
    def stream(self, request, pk=None):
        track = self.get_object()
        input_serializer = StreamCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        event = register_stream(
            user=request.user,
            track=track,
            session_id=input_serializer.validated_data["sessionId"],
            listened_seconds=input_serializer.validated_data["listenedSeconds"],
        )
        return Response(StreamEventSerializer(event).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        track = self.get_object()
        tier = get_current_subscription_tier(request.user)
        profile = getattr(request.user, "artist_profile", None)
        if tier != SubscriptionTier.GOLD and not request.user.is_superuser and (not profile or profile.pk != track.artist_id):
            return Response({"error": {"message": "Advanced statistics require Gold access."}}, status=status.HTTP_403_FORBIDDEN)
        return Response(track_statistics(track))

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        track = self.get_object()
        plan_tier = get_current_subscription_tier(request.user)
        if plan_tier not in {SubscriptionTier.SILVER, SubscriptionTier.GOLD}:
            return Response({"error": {"message": "Downloads require Silver or Gold access."}}, status=status.HTTP_403_FORBIDDEN)
        return Response({"downloadUrl": request.build_absolute_uri(track.audio_file.url)})


class ListeningHistoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ListeningHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ListeningHistory.objects.filter(listener=self.request.user).select_related("track", "track__artist", "track__album")


class HomeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        tracks = TrackViewSet()
        tracks.request = request
        tracks.action = "list"
        visible_tracks = tracks.get_queryset()
        latest = visible_tracks.order_by("-release_date")[:10]
        trending = visible_tracks.order_by("-play_count")[:10]
        recent_history = ListeningHistory.objects.filter(listener=request.user).select_related("track", "track__artist")[:10]
        early_access = visible_tracks.filter(
            is_early_access=True,
            release_date__gt=timezone.localdate(),
        ).order_by("release_date")[:10]
        recommendations = recommend_tracks(
            user=request.user,
            visible_tracks=visible_tracks,
            limit=10,
        )
        from playlists.models import PlaylistPlayback
        from playlists.serializers import PlaylistPlaybackSerializer
        recent_playlists = PlaylistPlayback.objects.filter(user=request.user).select_related(
            "playlist", "playlist__owner"
        ).prefetch_related(
            "playlist__items",
            "playlist__items__track",
            "playlist__items__track__artist",
            "playlist__items__track__album",
        )[:6]
        return Response({
            "latestTracks": TrackSerializer(latest, many=True, context={"request": request}).data,
            "trendingTracks": TrackSerializer(trending, many=True, context={"request": request}).data,
            "earlyAccessTracks": TrackSerializer(early_access, many=True, context={"request": request}).data,
            "recommendedTracks": [
                {
                    "track": TrackSerializer(
                        recommendation["track"],
                        context={"request": request},
                    ).data,
                    "reason": recommendation["reason"],
                }
                for recommendation in recommendations
            ],
            "recentlyPlayed": ListeningHistorySerializer(recent_history, many=True, context={"request": request}).data,
            "recentlyPlayedPlaylists": PlaylistPlaybackSerializer(
                recent_playlists, many=True, context={"request": request}
            ).data,
        })
