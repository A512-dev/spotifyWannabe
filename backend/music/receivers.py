from __future__ import annotations

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from music.models import ReleaseStatus, Track
from music.signals import track_published


@receiver(pre_save, sender=Track)
def remember_previous_track_status(sender, instance: Track, **kwargs) -> None:
    if not instance.pk:
        instance._previous_status = None
        return
    instance._previous_status = (
        Track.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    )


@receiver(post_save, sender=Track)
def publish_track_event(sender, instance: Track, created: bool, **kwargs) -> None:
    previous_status = getattr(instance, "_previous_status", None)
    became_published = instance.status == ReleaseStatus.PUBLISHED and (
        created or previous_status != ReleaseStatus.PUBLISHED
    )
    if became_published:
        track_published.send(
            sender=Track,
            track_id=str(instance.pk),
            artist_user_id=instance.artist.user_id,
            artist_name=instance.artist.stage_name,
            track_title=instance.title,
        )
