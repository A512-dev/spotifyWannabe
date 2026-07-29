# Generated for the SoundWave phase-2 artist workflow.

import artists.models
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ArtistApplication",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("stage_name", models.CharField(max_length=120)),
                ("portfolio_description", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("review_note", models.TextField(blank=True)),
                (
                    "applicant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="artist_applications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_artist_applications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ArtistProfile",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("stage_name", models.CharField(max_length=120)),
                ("bio", models.TextField(blank=True)),
                ("genre_tags", models.JSONField(blank=True, default=list)),
                (
                    "profile_image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="artist-profiles/images/",
                    ),
                ),
                (
                    "banner_image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="artist-profiles/banners/",
                    ),
                ),
                ("is_approved", models.BooleanField(db_index=True, default=False)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="artist_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "verified_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="verified_artist_profiles",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["stage_name"],
            },
        ),
        migrations.CreateModel(
            name="ArtistSampleWork",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=180)),
                (
                    "file",
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to=artists.models.artist_sample_upload_to,
                    ),
                ),
                ("external_url", models.URLField(blank=True, max_length=500)),
                (
                    "application",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="samples",
                        to="artists.artistapplication",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="artistapplication",
            constraint=models.UniqueConstraint(
                condition=models.Q(status="pending"),
                fields=("applicant",),
                name="unique_pending_artist_application",
            ),
        ),
        migrations.AddIndex(
            model_name="artistapplication",
            index=models.Index(
                fields=["status", "-created_at"],
                name="artist_app_status_created_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="artistsamplework",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(file__isnull=False) & models.Q(external_url="")
                )
                | (
                    models.Q(file__isnull=True) & ~models.Q(external_url="")
                ),
                name="artist_sample_exactly_one_source",
            ),
        ),
    ]
