from __future__ import annotations

from datetime import date

from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from music.models import ListeningHistory, ReleaseStatus, StreamEvent, Track
from operations.models import SubscriptionTier
from subscriptions.services import current_plan_for, get_current_subscription_tier

MIN_STREAM_SECONDS = 30
BASIC_DAILY_STREAM_LIMIT = 60


def can_access_track(*, user, track: Track) -> bool:
    artist_profile = getattr(user, "artist_profile", None)
    owns_track = bool(artist_profile and artist_profile.pk == track.artist_id)
    if user.is_superuser or owns_track:
        return True
    if track.status != ReleaseStatus.PUBLISHED:
        return False
    if track.release_date > date.today():
        return bool(
            track.is_early_access
            and get_current_subscription_tier(user) == SubscriptionTier.GOLD
        )
    if track.is_early_access:
        return get_current_subscription_tier(user) == SubscriptionTier.GOLD
    return True


@transaction.atomic
def register_stream(*, user, track: Track, session_id: str, listened_seconds: int):
    if not can_access_track(user=user, track=track):
        raise PermissionDenied("This track is not available for your subscription.")
    if listened_seconds < 0:
        raise ValidationError({"listenedSeconds": "Listened seconds cannot be negative."})

    today = timezone.localdate()
    tier = get_current_subscription_tier(user)
    existing = StreamEvent.objects.filter(track=track, listener=user, session_id=session_id).first()
    existing_was_counted = bool(existing and existing.counted)
    will_count = existing_was_counted or listened_seconds >= MIN_STREAM_SECONDS
    listened_seconds = max(listened_seconds, existing.listened_seconds if existing else 0)
    if tier == SubscriptionTier.BASIC and will_count and not (existing and existing.counted):
        daily_count = StreamEvent.objects.filter(listener=user, streamed_on=today, counted=True).count()
        if daily_count >= BASIC_DAILY_STREAM_LIMIT:
            raise PermissionDenied("The Basic plan daily stream limit has been reached.")

    event, _ = StreamEvent.objects.update_or_create(
        track=track,
        listener=user,
        session_id=session_id,
        defaults={
            "listened_seconds": listened_seconds,
            "counted": will_count,
            "streamed_on": today,
        },
    )
    if will_count and not existing_was_counted:
        history, created = ListeningHistory.objects.get_or_create(
            listener=user,
            track=track,
            defaults={"last_played_at": timezone.now(), "play_count": 1},
        )
        if not created:
            ListeningHistory.objects.filter(pk=history.pk).update(
                last_played_at=timezone.now(), play_count=F("play_count") + 1
            )
    return event


def track_statistics(track: Track) -> dict:
    counted = track.stream_events.filter(counted=True)
    return {
        "streamCount": counted.count(),
        "uniqueListeners": counted.values("listener_id").distinct().count(),
    }


def ensure_track_owner(*, user, track: Track) -> None:
    profile = getattr(user, "artist_profile", None)
    if not user.is_superuser and (not profile or profile.pk != track.artist_id):
        raise PermissionDenied("Artists may only manage their own releases.")
