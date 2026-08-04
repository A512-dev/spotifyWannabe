from rest_framework import serializers

from music.models import ReleaseStatus, Track
from music.serializers import TrackSerializer
from playlists.models import Playlist, PlaylistItem, PlaylistPlayback
from playlists.services import enforce_playlist_limit


class PlaylistItemSerializer(serializers.ModelSerializer):
    track = TrackSerializer(read_only=True)
    addedByUserId = serializers.SerializerMethodField()
    addedAt = serializers.DateTimeField(source="created_at", read_only=True)
    sortOrder = serializers.IntegerField(source="sort_order", read_only=True)

    class Meta:
        model = PlaylistItem
        fields = ["id", "track", "addedByUserId", "addedAt", "sortOrder"]

    def get_addedByUserId(self, obj): return str(obj.added_by_id)


class PlaylistSerializer(serializers.ModelSerializer):
    ownerId = serializers.SerializerMethodField()
    coverImageUrl = serializers.SerializerMethodField()
    isPublic = serializers.BooleanField(source="is_public")
    items = serializers.SerializerMethodField()
    itemIds = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Playlist
        fields = [
            "id", "ownerId", "title", "description", "coverImageUrl", "isPublic",
            "items", "itemIds", "createdAt", "updatedAt",
        ]
        read_only_fields = ["ownerId", "coverImageUrl", "items", "itemIds", "createdAt", "updatedAt"]

    def get_ownerId(self, obj): return str(obj.owner_id)

    def get_coverImageUrl(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.cover_image.url) if request else obj.cover_image.url

    def _visible_items(self, obj):
        from music.services import can_access_track

        request = self.context.get("request")
        queryset = obj.items.select_related(
            "track", "track__artist", "track__album", "added_by"
        ).prefetch_related("track__collaborators")
        if request is None or not request.user.is_authenticated:
            return queryset.none()
        return [
            item
            for item in queryset
            if can_access_track(user=request.user, track=item.track)
        ]

    def get_items(self, obj):
        return PlaylistItemSerializer(
            self._visible_items(obj),
            many=True,
            context=self.context,
        ).data

    def get_itemIds(self, obj):
        return [str(item.track_id) for item in self._visible_items(obj)]


class PlaylistWriteSerializer(serializers.ModelSerializer):
    coverImage = serializers.ImageField(source="cover_image", required=False, allow_null=True)
    isPublic = serializers.BooleanField(source="is_public", required=False)

    class Meta:
        model = Playlist
        fields = ["title", "description", "coverImage", "isPublic"]

    def create(self, validated_data):
        user = self.context["request"].user
        enforce_playlist_limit(user=user)
        return Playlist.objects.create(owner=user, **validated_data)

    def to_representation(self, instance):
        return PlaylistSerializer(instance, context=self.context).data


class AddTrackSerializer(serializers.Serializer):
    trackId = serializers.PrimaryKeyRelatedField(source="track", queryset=Track.objects.all())

    def validate_trackId(self, track: Track):
        from music.services import can_access_track

        request = self.context.get("request")
        if request is None or not can_access_track(user=request.user, track=track):
            raise serializers.ValidationError("This track is not available to the current user.")
        return track


class ReorderTracksSerializer(serializers.Serializer):
    trackIds = serializers.ListField(child=serializers.UUIDField(), allow_empty=True)


class PlaylistPlaybackSerializer(serializers.ModelSerializer):
    playlist = PlaylistSerializer(read_only=True)
    lastPlayedAt = serializers.DateTimeField(source="last_played_at", read_only=True)
    playCount = serializers.IntegerField(source="play_count", read_only=True)

    class Meta:
        model = PlaylistPlayback
        fields = ["playlist", "lastPlayedAt", "playCount"]
