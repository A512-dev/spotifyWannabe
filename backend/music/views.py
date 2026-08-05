from __future__ import annotations

import mimetypes
import re
from datetime import date
from urllib.parse import quote, urlencode

from django.http import HttpResponse, StreamingHttpResponse
from django.urls import reverse
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from music.models import Album, Genre, ListeningHistory, ReleaseStatus, Track
from music.permissions import IsOwnerArtistOrReadOnly
from music.serializers import (
    AlbumReleaseCreateSerializer, AlbumSerializer, AlbumWriteSerializer, GenreSerializer, ListeningHistorySerializer,
    StreamCreateSerializer, StreamEventSerializer, TrackSerializer, TrackWriteSerializer,
)
from music.services import (
    can_access_track,
    create_audio_access_token,
    ensure_playback_available,
    recommend_tracks,
    register_stream,
    resolve_audio_access_token,
    track_statistics,
)
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
        if self.action == "create_release":
            return AlbumReleaseCreateSerializer
        return AlbumWriteSerializer if self.action in {"create", "update", "partial_update"} else AlbumSerializer

    @action(detail=False, methods=["post"], url_path="release")
    def create_release(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        album = serializer.save()
        return Response(
            AlbumSerializer(album, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


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

    def perform_destroy(self, instance):
        if (
            instance.album_id
            and instance.album.status == ReleaseStatus.PUBLISHED
            and instance.album.tracks.count() <= 2
        ):
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"album": "Draft the album before reducing it below two tracks."}
            )
        instance.delete()

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
        token = create_audio_access_token(user=request.user, track=track, purpose="download")
        path = reverse("music:track-audio-file", kwargs={"pk": track.pk})
        return Response({"downloadUrl": request.build_absolute_uri(f"{path}?{urlencode({'token': token})}")})

    @action(detail=True, methods=["get"], url_path="playback")
    def playback(self, request, pk=None):
        track = self.get_object()
        ensure_playback_available(user=request.user, track=track)
        token = create_audio_access_token(user=request.user, track=track, purpose="playback")
        path = reverse("music:track-audio-file", kwargs={"pk": track.pk})
        return Response({"streamUrl": request.build_absolute_uri(f"{path}?{urlencode({'token': token})}")})


class TrackAudioFileView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def _chunks(file_object, remaining: int, chunk_size: int = 64 * 1024):
        try:
            while remaining > 0:
                data = file_object.read(min(chunk_size, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data
        finally:
            file_object.close()

    def get(self, request, pk):
        user, track, purpose = resolve_audio_access_token(request.query_params.get("token", ""))
        if str(track.pk) != str(pk):
            return Response(
                {"error": {"message": "This audio access link does not match the requested track."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        if purpose == "playback":
            ensure_playback_available(user=user, track=track)
        else:
            tier = get_current_subscription_tier(user)
            if tier not in {SubscriptionTier.SILVER, SubscriptionTier.GOLD}:
                return Response(
                    {"error": {"message": "Downloads require Silver or Gold access."}},
                    status=status.HTTP_403_FORBIDDEN,
                )

        file_size = track.audio_file.size
        start, end = 0, max(file_size - 1, 0)
        response_status = status.HTTP_200_OK
        range_header = request.headers.get("Range", "")
        if range_header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
            if match is None or (not match.group(1) and not match.group(2)):
                response = HttpResponse(status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
                response["Content-Range"] = f"bytes */{file_size}"
                return response
            if match.group(1):
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else end
            else:
                suffix_length = int(match.group(2))
                start = max(file_size - suffix_length, 0)
            if start >= file_size or end < start:
                response = HttpResponse(status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
                response["Content-Range"] = f"bytes */{file_size}"
                return response
            end = min(end, file_size - 1)
            response_status = status.HTTP_206_PARTIAL_CONTENT

        file_object = track.audio_file.open("rb")
        file_object.seek(start)
        content_length = end - start + 1
        content_type = mimetypes.guess_type(track.audio_file.name)[0] or "application/octet-stream"
        response = StreamingHttpResponse(
            self._chunks(file_object, content_length),
            status=response_status,
            content_type=content_type,
        )
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = str(content_length)
        if response_status == status.HTTP_206_PARTIAL_CONTENT:
            response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        disposition = "attachment" if purpose == "download" else "inline"
        filename = track.audio_file.name.rsplit("/", 1)[-1]
        response["Content-Disposition"] = f"{disposition}; filename*=UTF-8''{quote(filename)}"
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


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
