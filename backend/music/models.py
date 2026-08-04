from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from artists.models import ArtistProfile
from common.models import TimestampedModel


class ReleaseStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"


class Genre(TimestampedModel):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


def album_cover_upload_to(instance, filename: str) -> str:
    return f"music/albums/{instance.artist_id}/{uuid.uuid4()}-{Path(filename).name}"


def track_audio_upload_to(instance, filename: str) -> str:
    return f"music/tracks/{instance.artist_id}/audio/{uuid.uuid4()}-{Path(filename).name}"


def track_cover_upload_to(instance, filename: str) -> str:
    return f"music/tracks/{instance.artist_id}/covers/{uuid.uuid4()}-{Path(filename).name}"


class Album(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artist = models.ForeignKey(ArtistProfile, on_delete=models.CASCADE, related_name="albums")
    title = models.CharField(max_length=180)
    cover_image = models.ImageField(upload_to=album_cover_upload_to, null=True, blank=True)
    release_date = models.DateField()
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, related_name="albums", null=True, blank=True)
    status = models.CharField(max_length=12, choices=ReleaseStatus.choices, default=ReleaseStatus.DRAFT, db_index=True)
    is_early_access = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-release_date", "title"]
        constraints = [
            models.UniqueConstraint(fields=["artist", "title", "release_date"], name="unique_artist_album_release")
        ]
        indexes = [models.Index(fields=["status", "-release_date"], name="album_status_release_idx")]

    def __str__(self) -> str:
        return self.title


class Track(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artist = models.ForeignKey(ArtistProfile, on_delete=models.CASCADE, related_name="tracks")
    album = models.ForeignKey(Album, on_delete=models.CASCADE, related_name="tracks", null=True, blank=True)
    title = models.CharField(max_length=180)
    audio_file = models.FileField(upload_to=track_audio_upload_to)
    cover_image = models.ImageField(upload_to=track_cover_upload_to, null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    lyrics = models.TextField(blank=True)
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, related_name="tracks", null=True, blank=True)
    release_date = models.DateField()
    track_number = models.PositiveSmallIntegerField(default=1)
    explicit = models.BooleanField(default=False)
    status = models.CharField(max_length=12, choices=ReleaseStatus.choices, default=ReleaseStatus.DRAFT, db_index=True)
    is_early_access = models.BooleanField(default=False, db_index=True)
    collaborators = models.ManyToManyField(ArtistProfile, related_name="collaborative_tracks", blank=True)

    class Meta:
        ordering = ["album_id", "track_number", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["album", "track_number"],
                condition=Q(album__isnull=False),
                name="unique_album_track_number",
            )
        ]
        indexes = [
            models.Index(fields=["status", "-release_date"], name="track_status_release_idx"),
            models.Index(fields=["artist", "-release_date"], name="track_artist_release_idx"),
        ]

    def clean(self) -> None:
        if self.album_id and self.album.artist_id != self.artist_id:
            raise ValidationError({"album": "The track and album must have the same primary artist."})
        if self.duration_seconds <= 0:
            raise ValidationError({"duration_seconds": "Track duration must be positive."})

    def __str__(self) -> str:
        return self.title


class StreamEvent(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="stream_events")
    listener = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stream_events")
    session_id = models.CharField(max_length=100)
    listened_seconds = models.PositiveIntegerField(default=0)
    counted = models.BooleanField(default=False, db_index=True)
    streamed_on = models.DateField(db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["track", "listener", "session_id"], name="unique_track_listener_session")
        ]
        indexes = [
            models.Index(fields=["listener", "streamed_on", "counted"], name="stream_listener_day_idx"),
            models.Index(fields=["track", "streamed_on", "counted"], name="stream_track_day_idx"),
        ]


class ListeningHistory(TimestampedModel):
    listener = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listening_history")
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="history_entries")
    last_played_at = models.DateTimeField()
    play_count = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-last_played_at"]
        constraints = [models.UniqueConstraint(fields=["listener", "track"], name="unique_listener_track_history")]
