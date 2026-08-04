from __future__ import annotations

from pathlib import Path

from rest_framework import serializers

from artists.models import ArtistProfile
from music.models import Album, Genre, ListeningHistory, StreamEvent, Track
from music.services import track_statistics

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg"}
MAX_AUDIO_SIZE = 200 * 1024 * 1024


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name", "slug"]


class TrackSerializer(serializers.ModelSerializer):
    artistId = serializers.SerializerMethodField()
    artistName = serializers.CharField(source="artist.stage_name", read_only=True)
    albumId = serializers.SerializerMethodField(required=False, allow_null=True, default=None)
    albumTitle = serializers.CharField(source="album.title", read_only=True, allow_null=True)
    durationSeconds = serializers.IntegerField(source="duration_seconds")
    audioUrl = serializers.SerializerMethodField()
    coverImageUrl = serializers.SerializerMethodField()
    releaseDate = serializers.DateField(source="release_date")
    trackNumber = serializers.IntegerField(source="track_number")
    isEarlyAccess = serializers.BooleanField(source="is_early_access")
    collaboratorIds = serializers.PrimaryKeyRelatedField(
        source="collaborators",
        queryset=ArtistProfile.objects.filter(is_approved=True),
        many=True,
        required=False,
    )
    genreId = serializers.PrimaryKeyRelatedField(source="genre", queryset=Genre.objects.all(), allow_null=True, required=False)
    playCount = serializers.SerializerMethodField()
    uniqueListeners = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = [
            "id", "title", "artistId", "artistName", "albumId", "albumTitle",
            "durationSeconds", "audioUrl", "coverImageUrl", "lyrics", "genreId",
            "releaseDate", "trackNumber", "explicit", "status", "isEarlyAccess",
            "collaboratorIds", "playCount", "uniqueListeners",
        ]
        read_only_fields = ["artistId", "artistName", "audioUrl", "coverImageUrl", "playCount", "uniqueListeners"]

    def get_artistId(self, obj) -> str:
        return str(obj.artist_id)

    def get_albumId(self, obj) -> str | None:
        return str(obj.album_id) if obj.album_id else None

    def _url(self, file_field):
        if not file_field:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file_field.url) if request else file_field.url

    def get_audioUrl(self, obj):
        return self._url(obj.audio_file)

    def get_coverImageUrl(self, obj):
        return self._url(obj.cover_image or (obj.album.cover_image if obj.album else None))

    def _may_view_stats(self, obj) -> bool:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        current_profile = getattr(request.user, "artist_profile", None)
        if current_profile and current_profile.pk == obj.artist_id:
            return True
        from operations.models import SubscriptionTier
        from subscriptions.services import get_current_subscription_tier

        return get_current_subscription_tier(request.user) == SubscriptionTier.GOLD

    def get_playCount(self, obj) -> int | None:
        if not self._may_view_stats(obj):
            return None
        annotated = getattr(obj, "play_count", None)
        return int(annotated) if annotated is not None else track_statistics(obj)["streamCount"]

    def get_uniqueListeners(self, obj) -> int | None:
        if not self._may_view_stats(obj):
            return None
        return track_statistics(obj)["uniqueListeners"]


class TrackWriteSerializer(serializers.ModelSerializer):
    audioFile = serializers.FileField(source="audio_file", required=False)
    coverImage = serializers.ImageField(source="cover_image", required=False, allow_null=True)
    durationSeconds = serializers.IntegerField(source="duration_seconds", min_value=1)
    releaseDate = serializers.DateField(source="release_date")
    trackNumber = serializers.IntegerField(source="track_number", min_value=1, required=False)
    isEarlyAccess = serializers.BooleanField(source="is_early_access", required=False)
    albumId = serializers.PrimaryKeyRelatedField(source="album", queryset=Album.objects.all(), allow_null=True, required=False, default=None)
    genreId = serializers.PrimaryKeyRelatedField(source="genre", queryset=Genre.objects.all(), allow_null=True, required=False)
    collaboratorIds = serializers.PrimaryKeyRelatedField(
        source="collaborators", queryset=ArtistProfile.objects.filter(is_approved=True), many=True, required=False
    )

    class Meta:
        model = Track
        fields = [
            "title", "audioFile", "coverImage", "durationSeconds", "lyrics", "albumId",
            "genreId", "releaseDate", "trackNumber", "explicit", "status", "isEarlyAccess", "collaboratorIds",
        ]

    def validate_audioFile(self, audio_file):
        suffix = Path(audio_file.name).suffix.lower()
        if suffix not in ALLOWED_AUDIO_EXTENSIONS:
            raise serializers.ValidationError("Supported formats are MP3, WAV, FLAC, M4A, and OGG.")
        if audio_file.size > MAX_AUDIO_SIZE:
            raise serializers.ValidationError("Audio files must be 200 MB or smaller.")
        return audio_file

    def validate(self, attrs):
        request = self.context["request"]
        profile = getattr(request.user, "artist_profile", None)
        album = attrs.get("album", getattr(self.instance, "album", None))
        if album and not request.user.is_superuser and album.artist_id != profile.pk:
            raise serializers.ValidationError({"albumId": "You may only add tracks to your own albums."})
        if self.instance is None and "audio_file" not in attrs:
            raise serializers.ValidationError({"audioFile": "An audio file is required."})
        return attrs

    def create(self, validated_data):
        collaborators = validated_data.pop("collaborators", [])
        request = self.context["request"]
        track = Track.objects.create(artist=request.user.artist_profile, **validated_data)
        track.collaborators.set(collaborators)
        return track

    def update(self, instance, validated_data):
        collaborators = validated_data.pop("collaborators", None)
        instance = super().update(instance, validated_data)
        if collaborators is not None:
            instance.collaborators.set(collaborators)
        return instance

    def to_representation(self, instance):
        return TrackSerializer(instance, context=self.context).data


class AlbumSerializer(serializers.ModelSerializer):
    artistId = serializers.SerializerMethodField()
    artistName = serializers.CharField(source="artist.stage_name", read_only=True)
    coverImageUrl = serializers.SerializerMethodField()
    releaseDate = serializers.DateField(source="release_date")
    isEarlyAccess = serializers.BooleanField(source="is_early_access")
    genreId = serializers.PrimaryKeyRelatedField(source="genre", queryset=Genre.objects.all(), allow_null=True, required=False)
    tracks = serializers.SerializerMethodField()
    trackIds = serializers.SerializerMethodField()
    listenerCount = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "id", "title", "artistId", "artistName", "coverImageUrl", "releaseDate",
            "genreId", "status", "isEarlyAccess", "tracks", "trackIds", "listenerCount",
        ]
        read_only_fields = ["artistId", "artistName", "coverImageUrl", "tracks", "trackIds"]

    def get_artistId(self, obj) -> str:
        return str(obj.artist_id)

    def get_coverImageUrl(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.cover_image.url) if request else obj.cover_image.url

    def _visible_tracks(self, obj):
        from music.services import can_access_track

        request = self.context.get("request")
        queryset = obj.tracks.select_related("artist", "album", "genre").prefetch_related(
            "collaborators"
        )
        if request is None or not request.user.is_authenticated:
            return queryset.none()
        return [track for track in queryset if can_access_track(user=request.user, track=track)]

    def get_tracks(self, obj):
        return TrackSerializer(
            self._visible_tracks(obj),
            many=True,
            context=self.context,
        ).data

    def get_trackIds(self, obj) -> list[str]:
        return [str(track.pk) for track in self._visible_tracks(obj)]

    def get_listenerCount(self, obj) -> int | None:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None
        current_profile = getattr(request.user, "artist_profile", None)
        from operations.models import SubscriptionTier
        from subscriptions.services import get_current_subscription_tier

        may_view = (
            request.user.is_superuser
            or (current_profile and current_profile.pk == obj.artist_id)
            or get_current_subscription_tier(request.user) == SubscriptionTier.GOLD
        )
        if not may_view:
            return None
        annotated = getattr(obj, "listener_count", None)
        if annotated is not None:
            return int(annotated)
        return obj.tracks.filter(stream_events__counted=True).values(
            "stream_events__listener_id"
        ).distinct().count()


class AlbumWriteSerializer(serializers.ModelSerializer):
    coverImage = serializers.ImageField(source="cover_image", required=False, allow_null=True)
    releaseDate = serializers.DateField(source="release_date")
    isEarlyAccess = serializers.BooleanField(source="is_early_access", required=False)
    genreId = serializers.PrimaryKeyRelatedField(source="genre", queryset=Genre.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Album
        fields = ["title", "coverImage", "releaseDate", "genreId", "status", "isEarlyAccess"]

    def create(self, validated_data):
        return Album.objects.create(artist=self.context["request"].user.artist_profile, **validated_data)

    def to_representation(self, instance):
        return AlbumSerializer(instance, context=self.context).data


class StreamCreateSerializer(serializers.Serializer):
    sessionId = serializers.CharField(max_length=100)
    listenedSeconds = serializers.IntegerField(min_value=0)


class StreamEventSerializer(serializers.ModelSerializer):
    trackId = serializers.SerializerMethodField()
    listenerId = serializers.SerializerMethodField()
    sessionId = serializers.CharField(source="session_id", read_only=True)
    listenedSeconds = serializers.IntegerField(source="listened_seconds", read_only=True)
    streamedOn = serializers.DateField(source="streamed_on", read_only=True)

    class Meta:
        model = StreamEvent
        fields = ["id", "trackId", "listenerId", "sessionId", "listenedSeconds", "counted", "streamedOn"]

    def get_trackId(self, obj): return str(obj.track_id)
    def get_listenerId(self, obj): return str(obj.listener_id)


class ListeningHistorySerializer(serializers.ModelSerializer):
    track = TrackSerializer(read_only=True)
    lastPlayedAt = serializers.DateTimeField(source="last_played_at", read_only=True)
    playCount = serializers.IntegerField(source="play_count", read_only=True)

    class Meta:
        model = ListeningHistory
        fields = ["track", "lastPlayedAt", "playCount"]
