from django.db.models import F, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from playlists.models import Playlist, PlaylistPlayback
from playlists.permissions import IsPlaylistOwnerOrPublicReadOnly
from playlists.serializers import AddTrackSerializer, PlaylistItemSerializer, PlaylistSerializer, PlaylistWriteSerializer, ReorderTracksSerializer
from playlists.services import add_track, remove_track, reorder_tracks


class PlaylistViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsPlaylistOwnerOrPublicReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = Playlist.objects.select_related("owner").prefetch_related(
            "items", "items__track", "items__track__artist", "items__track__album"
        ).filter(Q(owner=self.request.user) | Q(is_public=True)).distinct()
        owner = self.request.query_params.get("owner")
        if owner == "me":
            queryset = queryset.filter(owner=self.request.user)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset

    def get_serializer_class(self):
        return PlaylistWriteSerializer if self.action in {"create", "update", "partial_update"} else PlaylistSerializer

    @action(detail=True, methods=["post"], url_path="tracks")
    def add_track(self, request, pk=None):
        playlist = self.get_object()
        serializer = AddTrackSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        item, created = add_track(user=request.user, playlist=playlist, track=serializer.validated_data["track"])
        return Response(
            PlaylistItemSerializer(item, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path=r"tracks/(?P<track_id>[^/.]+)")
    def remove_track(self, request, pk=None, track_id=None):
        playlist = self.get_object()
        remove_track(user=request.user, playlist=playlist, track_id=track_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="reorder")
    def reorder(self, request, pk=None):
        playlist = self.get_object()
        serializer = ReorderTracksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reorder_tracks(
            user=request.user,
            playlist=playlist,
            track_ids=[str(value) for value in serializer.validated_data["trackIds"]],
        )
        playlist.refresh_from_db()
        return Response(PlaylistSerializer(playlist, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="played")
    def played(self, request, pk=None):
        playlist = self.get_object()
        playback, created = PlaylistPlayback.objects.get_or_create(
            user=request.user,
            playlist=playlist,
            defaults={"last_played_at": timezone.now(), "play_count": 1},
        )
        if not created:
            PlaylistPlayback.objects.filter(pk=playback.pk).update(
                last_played_at=timezone.now(),
                play_count=F("play_count") + 1,
            )
        return Response({"recorded": True}, status=status.HTTP_200_OK)
