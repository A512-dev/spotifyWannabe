from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from common.models import TimestampedModel


class ArtistApplicationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


def artist_sample_upload_to(instance: "ArtistSampleWork", filename: str) -> str:
    safe_name = Path(filename).name
    return f"artist-applications/{instance.application_id}/{uuid.uuid4()}-{safe_name}"


class ArtistApplication(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artist_applications",
    )
    stage_name = models.CharField(max_length=120)
    portfolio_description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=ArtistApplicationStatus.choices,
        default=ArtistApplicationStatus.PENDING,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reviewed_artist_applications",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["applicant"],
                condition=Q(status=ArtistApplicationStatus.PENDING),
                name="unique_pending_artist_application",
            )
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="artist_app_status_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.stage_name} ({self.get_status_display()})"


class ArtistSampleWork(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        ArtistApplication,
        on_delete=models.CASCADE,
        related_name="samples",
    )
    title = models.CharField(max_length=180)
    file = models.FileField(upload_to=artist_sample_upload_to, null=True, blank=True)
    external_url = models.URLField(max_length=500, blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(Q(file__isnull=False) & Q(external_url=""))
                | (Q(file__isnull=True) & ~Q(external_url="")),
                name="artist_sample_exactly_one_source",
            )
        ]

    def clean(self) -> None:
        has_file = bool(self.file)
        has_url = bool(self.external_url)
        if has_file == has_url:
            raise ValidationError("A sample work must contain exactly one file or external URL.")

    def __str__(self) -> str:
        return self.title


class ArtistProfile(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artist_profile",
    )
    stage_name = models.CharField(max_length=120)
    bio = models.TextField(blank=True)
    genre_tags = models.JSONField(default=list, blank=True)
    profile_image = models.ImageField(
        upload_to="artist-profiles/images/",
        null=True,
        blank=True,
    )
    banner_image = models.ImageField(
        upload_to="artist-profiles/banners/",
        null=True,
        blank=True,
    )
    is_approved = models.BooleanField(default=False, db_index=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="verified_artist_profiles",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["stage_name"]

    def __str__(self) -> str:
        return self.stage_name
