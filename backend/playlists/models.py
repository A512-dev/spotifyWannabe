from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

from common.models import TimestampedModel
from music.models import Track


def playlist_cover_upload_to(instance, filename: str) -> str:
    return f"playlists/{instance.owner_id}/{uuid.uuid4()}-{Path(filename).name}"


class Playlist(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="playlists")
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to=playlist_cover_upload_to, null=True, blank=True)
    is_public = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [models.UniqueConstraint(fields=["owner", "title"], name="unique_owner_playlist_title")]

    def __str__(self) -> str:
        return self.title


class PlaylistItem(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name="items")
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="playlist_items")
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="added_playlist_items")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["playlist", "track"], name="unique_playlist_track"),
            models.UniqueConstraint(fields=["playlist", "sort_order"], name="unique_playlist_sort_order"),
        ]
        indexes = [models.Index(fields=["playlist", "sort_order"], name="playlist_item_order_idx")]


class PlaylistPlayback(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="playlist_playbacks",
    )
    playlist = models.ForeignKey(
        Playlist,
        on_delete=models.CASCADE,
        related_name="playbacks",
    )
    last_played_at = models.DateTimeField(db_index=True)
    play_count = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-last_played_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "playlist"],
                name="unique_user_playlist_playback",
            )
        ]
