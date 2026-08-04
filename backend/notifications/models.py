from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from common.models import TimestampedModel


class NotificationType(models.TextChoices):
    SYSTEM = "system", "System"
    ARTIST = "artist", "Artist"
    BILLING = "billing", "Billing"
    SUPPORT = "support", "Support"
    PLAYLIST = "playlist", "Playlist"


class Notification(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=16, choices=NotificationType.choices)
    title = models.CharField(max_length=160)
    message = models.TextField()
    action_href = models.CharField(max_length=500, blank=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "read_at", "-created_at"], name="notif_recipient_read_idx")
        ]

    def __str__(self) -> str:
        return f"{self.recipient_id}: {self.title}"
