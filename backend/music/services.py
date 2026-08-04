from __future__ import annotations

from collections import defaultdict
from datetime import date

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from music.models import ListeningHistory, ReleaseStatus, StreamEvent, Track
from operations.models import SubscriptionTier
from subscriptions.services import current_plan_for, get_current_subscription_tier

MIN_STREAM_SECONDS = 30
BASIC_DAILY_STREAM_LIMIT = 60
STREAM_REPORT_GRACE_SECONDS = 3


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
    return True


@transaction.atomic
def register_stream(*, user, track: Track, session_id: str, listened_seconds: int):
    if not can_access_track(user=user, track=track):
        raise PermissionDenied("This track is not available for your subscription.")
    if listened_seconds < 0:
        raise ValidationError({"listenedSeconds": "Listened seconds cannot be negative."})

    now = timezone.now()
    today = timezone.localdate()
    tier = get_current_subscription_tier(user)
    existing = StreamEvent.objects.select_for_update().filter(
        track=track,
        listener=user,
        session_id=session_id,
    ).first()
    if existing is None:
        return StreamEvent.objects.create(
            track=track,
            listener=user,
            session_id=session_id,
            listened_seconds=0,
            counted=False,
            streamed_on=today,
        )

    existing_was_counted = bool(existing and existing.counted)
    elapsed_seconds = max(0, int((now - existing.created_at).total_seconds()))
    verified_seconds = min(
        listened_seconds,
        elapsed_seconds + STREAM_REPORT_GRACE_SECONDS,
        track.duration_seconds,
    )
    listened_seconds = max(existing.listened_seconds, verified_seconds)
    will_count = existing_was_counted or listened_seconds >= MIN_STREAM_SECONDS
    if tier == SubscriptionTier.BASIC and will_count and not (existing and existing.counted):
        daily_count = StreamEvent.objects.filter(listener=user, streamed_on=today, counted=True).count()
        if daily_count >= BASIC_DAILY_STREAM_LIMIT:
            raise PermissionDenied("The Basic plan daily stream limit has been reached.")

    existing.listened_seconds = listened_seconds
    existing.counted = will_count
    existing.streamed_on = today
    existing.save(
        update_fields=["listened_seconds", "counted", "streamed_on", "updated_at"]
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
    return existing


def recommend_tracks(*, user, visible_tracks, limit: int = 10) -> list[dict]:
    """Return deterministic content-based recommendations from listening history.

    Artist affinity is weighted more heavily than genre affinity. Popularity is
    only used as a deterministic tie-breaker and as a cold-start fallback.
    """
    history_rows = list(
        ListeningHistory.objects.filter(listener=user)
        .values("track_id", "track__artist_id", "track__genre_id")
        .annotate(weight=Sum("play_count"))
    )
    played_ids = {row["track_id"] for row in history_rows}
    artist_weights: dict[object, int] = defaultdict(int)
    genre_weights: dict[object, int] = defaultdict(int)
    for row in history_rows:
        weight = int(row["weight"] or 0)
        artist_weights[row["track__artist_id"]] += weight
        if row["track__genre_id"] is not None:
            genre_weights[row["track__genre_id"]] += weight

    candidates = list(
        visible_tracks.exclude(pk__in=played_ids)
        .select_related("artist", "album", "genre")[: max(limit * 20, 100)]
    )
    ranked = []
    for track in candidates:
        artist_score = artist_weights.get(track.artist_id, 0) * 5
        genre_score = genre_weights.get(track.genre_id, 0) * 3 if track.genre_id else 0
        affinity_score = artist_score + genre_score
        popularity = int(getattr(track, "play_count", 0) or 0)
        if artist_score:
            reason = f"Because you listen to {track.artist.stage_name}"
        elif genre_score and track.genre:
            reason = f"Because you listen to {track.genre.name}"
        else:
            reason = "Popular with SoundWave listeners"
        ranked.append((affinity_score, popularity, track.release_date, track.title, track, reason))

    ranked.sort(key=lambda row: (-row[0], -row[1], -row[2].toordinal(), row[3].lower()))
    return [
        {"track": row[4], "reason": row[5]}
        for row in ranked[:limit]
    ]


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
