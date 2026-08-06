from __future__ import annotations

from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import PermissionDenied, ValidationError

from operations.models import SubscriptionTier
from playlists.models import Playlist, PlaylistItem
from subscriptions.services import current_plan_for


def ensure_playlist_owner(*, user, playlist: Playlist) -> None:
    if not user.is_superuser and playlist.owner_id != user.pk:
        raise PermissionDenied("You may only modify your own playlists.")


def enforce_playlist_limit(*, user) -> None:
    plan = current_plan_for(user)

    if (
        plan.playlist_limit is not None
        and Playlist.objects.filter(owner=user).count()
        >= plan.playlist_limit
    ):
        raise ValidationError(
            {
                "playlist": (
                    f"The {plan.get_tier_display()} plan allows at most "
                    f"{plan.playlist_limit} playlists."
                )
            }
        )


@transaction.atomic
def add_track(*, user, playlist: Playlist, track):
    ensure_playlist_owner(user=user, playlist=playlist)
    existing = PlaylistItem.objects.filter(playlist=playlist, track=track).first()
    if existing:
        return existing, False
    max_order = playlist.items.aggregate(max_order=Max("sort_order"))["max_order"]
    item = PlaylistItem.objects.create(
        playlist=playlist,
        track=track,
        added_by=user,
        sort_order=0 if max_order is None else max_order + 1,
    )
    return item, True


@transaction.atomic
def remove_track(*, user, playlist: Playlist, track_id):
    ensure_playlist_owner(user=user, playlist=playlist)
    deleted, _ = PlaylistItem.objects.filter(playlist=playlist, track_id=track_id).delete()
    if not deleted:
        raise ValidationError({"trackId": "This track is not in the playlist."})
    for index, item in enumerate(playlist.items.order_by("sort_order", "created_at")):
        if item.sort_order != index:
            PlaylistItem.objects.filter(pk=item.pk).update(sort_order=index)


@transaction.atomic
def reorder_tracks(*, user, playlist: Playlist, track_ids: list[str]):
    ensure_playlist_owner(user=user, playlist=playlist)
    current_ids = [str(value) for value in playlist.items.values_list("track_id", flat=True)]
    if sorted(current_ids) != sorted(track_ids) or len(current_ids) != len(track_ids):
        raise ValidationError({"trackIds": "Provide every playlist track exactly once."})
    # Offset first to avoid the unique (playlist, sort_order) constraint during reordering.
    PlaylistItem.objects.filter(playlist=playlist).update(sort_order=models_f("sort_order") + 100000)
    for index, track_id in enumerate(track_ids):
        PlaylistItem.objects.filter(playlist=playlist, track_id=track_id).update(sort_order=index)


def models_f(field_name: str):
    from django.db.models import F
    return F(field_name)
