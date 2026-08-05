from __future__ import annotations

from pathlib import Path

from django.db import transaction
from rest_framework import serializers

from artists.models import ArtistProfile
from music.models import Album, Genre, ListeningHistory, StreamEvent, Track
from music.services import track_statistics

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg"}
MAX_AUDIO_SIZE = 200 * 1024 * 1024
ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/flac",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/x-m4a",
    "audio/x-wav",
}


def validate_audio_upload(audio_file):
    suffix = Path(audio_file.name).suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise serializers.ValidationError("Supported formats are MP3, WAV, FLAC, M4A, and OGG.")
    if audio_file.size > MAX_AUDIO_SIZE:
        raise serializers.ValidationError("Audio files must be 200 MB or smaller.")
    content_type = (getattr(audio_file, "content_type", "") or "").lower()
    if content_type and content_type not in ALLOWED_AUDIO_CONTENT_TYPES:
        raise serializers.ValidationError("The uploaded file does not have an audio content type.")

    position = audio_file.tell() if hasattr(audio_file, "tell") else 0
    header = audio_file.read(12)
    if hasattr(audio_file, "seek"):
        audio_file.seek(position)
    signatures = {
        ".mp3": header.startswith(b"ID3") or (len(header) >= 2 and header[0] == 0xFF and header[1] & 0xE0 == 0xE0),
        ".wav": header.startswith(b"RIFF") and header[8:12] == b"WAVE",
        ".flac": header.startswith(b"fLaC"),
        ".ogg": header.startswith(b"OggS"),
        ".m4a": len(header) >= 8 and header[4:8] == b"ftyp",
    }
    if not signatures.get(suffix, False):
        raise serializers.ValidationError("The file header does not match its audio extension.")
    return audio_file


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
        # Audio files are never exposed as public media URLs. The player asks
        # the protected playback action for a short-lived signed stream URL.
        return None

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
    clearCollaborators = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Track
        fields = [
            "title", "audioFile", "coverImage", "durationSeconds", "lyrics", "albumId",
            "genreId", "releaseDate", "trackNumber", "explicit", "status", "isEarlyAccess", "collaboratorIds", "clearCollaborators",
        ]

    def validate_audioFile(self, audio_file):
        return validate_audio_upload(audio_file)

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
        validated_data.pop("clearCollaborators", None)
        collaborators = validated_data.pop("collaborators", [])
        request = self.context["request"]
        track = Track.objects.create(artist=request.user.artist_profile, **validated_data)
        track.collaborators.set(collaborators)
        return track

    def update(self, instance, validated_data):
        clear_collaborators = validated_data.pop("clearCollaborators", False)
        collaborators = validated_data.pop("collaborators", None)
        instance = super().update(instance, validated_data)
        if clear_collaborators:
            instance.collaborators.clear()
        elif collaborators is not None:
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

    def validate(self, attrs):
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        if self.instance is None and status_value == "published":
            raise serializers.ValidationError(
                {"status": "Use the atomic album release endpoint to publish an album with at least two tracks."}
            )
        if self.instance is not None and status_value == "published" and self.instance.tracks.count() < 2:
            raise serializers.ValidationError(
                {"status": "A published album must contain at least two tracks."}
            )
        return attrs

    def create(self, validated_data):
        return Album.objects.create(artist=self.context["request"].user.artist_profile, **validated_data)

    def to_representation(self, instance):
        return AlbumSerializer(instance, context=self.context).data


class RepeatedListField(serializers.ListField):
    def get_value(self, dictionary):
        if hasattr(dictionary, "getlist"):
            values = dictionary.getlist(self.field_name)
            if values:
                return values
        return super().get_value(dictionary)


class AlbumReleaseCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180)
    coverImage = serializers.ImageField(source="cover_image", required=False, allow_null=True)
    releaseDate = serializers.DateField(source="release_date")
    genreId = serializers.PrimaryKeyRelatedField(
        source="genre", queryset=Genre.objects.all(), allow_null=True, required=False
    )
    status = serializers.ChoiceField(choices=["draft", "published"])
    isEarlyAccess = serializers.BooleanField(source="is_early_access", required=False, default=False)
    explicit = serializers.BooleanField(required=False, default=False)
    collaboratorIds = RepeatedListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=ArtistProfile.objects.filter(is_approved=True)
        ),
        required=False,
        default=list,
    )
    trackTitles = RepeatedListField(child=serializers.CharField(max_length=180))
    trackLyrics = RepeatedListField(
        child=serializers.CharField(allow_blank=True, required=False),
        required=False,
        default=list,
    )
    trackDurations = RepeatedListField(child=serializers.IntegerField(min_value=1))
    trackFiles = RepeatedListField(child=serializers.FileField())

    def validate_trackFiles(self, files):
        for audio_file in files:
            validate_audio_upload(audio_file)
        return files

    def validate(self, attrs):
        titles = attrs["trackTitles"]
        files = attrs["trackFiles"]
        durations = attrs["trackDurations"]
        lyrics = attrs.get("trackLyrics", [])
        if len(titles) < 2:
            raise serializers.ValidationError(
                {"trackTitles": "An album must contain at least two tracks."}
            )
        if not (len(titles) == len(files) == len(durations)):
            raise serializers.ValidationError(
                {"tracks": "Every album track needs one title, file, and duration."}
            )
        if lyrics and len(lyrics) != len(titles):
            raise serializers.ValidationError(
                {"trackLyrics": "Provide one lyrics value (blank is allowed) per track."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        titles = validated_data.pop("trackTitles")
        files = validated_data.pop("trackFiles")
        durations = validated_data.pop("trackDurations")
        lyrics = validated_data.pop("trackLyrics", [""] * len(titles))
        collaborators = validated_data.pop("collaboratorIds", [])
        cover_image = validated_data.pop("cover_image", None)
        genre = validated_data.pop("genre", None)
        is_early_access = validated_data.pop("is_early_access", False)
        explicit = validated_data.pop("explicit", False)
        album = Album.objects.create(
            artist=request.user.artist_profile,
            cover_image=cover_image,
            genre=genre,
            is_early_access=is_early_access,
            **validated_data,
        )
        for index, (title, audio_file, duration) in enumerate(
            zip(titles, files, durations, strict=True), start=1
        ):
            track = Track.objects.create(
                artist=request.user.artist_profile,
                album=album,
                title=title,
                audio_file=audio_file,
                duration_seconds=duration,
                lyrics=lyrics[index - 1] if lyrics else "",
                genre=genre,
                release_date=album.release_date,
                track_number=index,
                explicit=explicit,
                status=album.status,
                is_early_access=is_early_access,
            )
            track.collaborators.set(collaborators)
        return album

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
