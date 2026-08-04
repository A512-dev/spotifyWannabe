from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from common.models import TimestampedModel


class Gender(models.TextChoices):
    FEMALE = "female", "Female"
    MALE = "male", "Male"
    OTHER = "other", "Other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"


class UserProfile(TimestampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=120)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        default=Gender.PREFER_NOT_TO_SAY,
    )
    avatar = models.ImageField(upload_to="users/avatars/", null=True, blank=True)

    class Meta:
        ordering = ["display_name", "user_id"]

    def __str__(self) -> str:
        return self.display_name or self.user.get_username()


class UserPreference(TimestampedModel):
    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        PERSIAN = "fa", "Persian"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences",
    )
    language = models.CharField(
        max_length=2,
        choices=Language.choices,
        default=Language.ENGLISH,
    )
    system_sound_enabled = models.BooleanField(default=True)
    notifications_enabled = models.BooleanField(default=True)
    subscription_notifications = models.BooleanField(default=True)
    followed_artist_notifications = models.BooleanField(default=True)
    support_notifications = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"Preferences for {self.user.get_username()}"


class UserFollow(TimestampedModel):
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following_links",
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="follower_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="unique_user_follow",
            ),
            models.CheckConstraint(
                condition=~Q(follower=F("following")),
                name="user_cannot_follow_self",
            ),
        ]
        indexes = [
            models.Index(fields=["follower", "-created_at"], name="follow_follower_created_idx"),
            models.Index(fields=["following", "-created_at"], name="follow_following_created_idx"),
        ]

    def clean(self) -> None:
        if self.follower_id == self.following_id:
            raise ValidationError("Users cannot follow themselves.")

    def __str__(self) -> str:
        return f"{self.follower_id} follows {self.following_id}"
