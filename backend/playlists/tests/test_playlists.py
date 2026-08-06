from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from artists.models import ArtistProfile
from music.models import Track
from operations.models import SubscriptionPlan
from playlists.models import Playlist, PlaylistItem
from subscriptions.models import UserSubscription

User = get_user_model()


class PlaylistApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", email="owner@example.com")
        self.other = User.objects.create_user(username="other", email="other@example.com")
        artist_user = User.objects.create_user(username="artistp", email="artistp@example.com")
        artist = ArtistProfile.objects.create(user=artist_user, stage_name="Artist", is_approved=True)
        self.track1 = Track.objects.create(
            artist=artist, title="One", audio_file=SimpleUploadedFile("one.mp3", b"a"),
            duration_seconds=100, release_date=timezone.localdate(), status="published"
        )
        self.track2 = Track.objects.create(
            artist=artist, title="Two", audio_file=SimpleUploadedFile("two.mp3", b"b"),
            duration_seconds=100, release_date=timezone.localdate(), status="published"
        )
        self.client.force_authenticate(user=self.user)

    def test_user_can_create_playlist(self):
        response = self.client.post(reverse("playlists:playlist-list"), {"title": "Favorites", "isPublic": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Playlist.objects.filter(owner=self.user, title="Favorites").exists())

    def test_user_can_rename_playlist(self):
        playlist = Playlist.objects.create(owner=self.user, title="Old")
        response = self.client.patch(reverse("playlists:playlist-detail", args=[playlist.pk]), {"title": "New"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        playlist.refresh_from_db()
        self.assertEqual(playlist.title, "New")

    def test_user_cannot_edit_another_users_playlist(self):
        playlist = Playlist.objects.create(owner=self.other, title="Private")
        response = self.client.patch(reverse("playlists:playlist-detail", args=[playlist.pk]), {"title": "Changed"}, format="json")
        self.assertIn(response.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND})

    def test_track_can_be_added_only_once(self):
        playlist = Playlist.objects.create(owner=self.user, title="Mix")
        url = reverse("playlists:playlist-add-track", args=[playlist.pk])
        first = self.client.post(url, {"trackId": str(self.track1.pk)}, format="json")
        second = self.client.post(url, {"trackId": str(self.track1.pk)}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(PlaylistItem.objects.filter(playlist=playlist).count(), 1)

    def test_track_can_be_removed(self):
        playlist = Playlist.objects.create(owner=self.user, title="Mix")
        PlaylistItem.objects.create(playlist=playlist, track=self.track1, added_by=self.user, sort_order=0)
        response = self.client.delete(reverse("playlists:playlist-remove-track", args=[playlist.pk, self.track1.pk]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_tracks_can_be_reordered(self):
        playlist = Playlist.objects.create(owner=self.user, title="Mix")
        PlaylistItem.objects.create(playlist=playlist, track=self.track1, added_by=self.user, sort_order=0)
        PlaylistItem.objects.create(playlist=playlist, track=self.track2, added_by=self.user, sort_order=1)
        response = self.client.post(reverse("playlists:playlist-reorder", args=[playlist.pk]), {
            "trackIds": [str(self.track2.pk), str(self.track1.pk)]
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ordered = list(playlist.items.order_by("sort_order").values_list("track_id", flat=True))
        self.assertEqual(ordered, [self.track2.pk, self.track1.pk])

    def test_basic_playlist_limit_is_enforced(self):
        for index in range(6):
            Playlist.objects.create(
                owner=self.user,
                title=f"P{index}",
            )

        response = self.client.post(
            reverse("playlists:playlist-list"),
            {"title": "Seventh"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data["error"]["message"],
            "The Basic plan allows at most 6 playlists.",
        )

    def test_gold_playlist_limit_is_unlimited(self):
        gold = SubscriptionPlan.objects.get(tier="gold")
        UserSubscription.objects.create(
            user=self.user, plan=gold, starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=30), status="active"
        )
        for index in range(7):
            Playlist.objects.create(owner=self.user, title=f"G{index}")
        response = self.client.post(reverse("playlists:playlist-list"), {"title": "More"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


    def test_playlist_response_hides_unavailable_track(self):
        hidden_track = Track.objects.create(
            artist=self.track1.artist,
            title="Early Hidden",
            audio_file=SimpleUploadedFile("early.mp3", b"early"),
            duration_seconds=100,
            release_date=timezone.localdate() + timedelta(days=3),
            status="published",
            is_early_access=True,
        )
        playlist = Playlist.objects.create(owner=self.user, title="Mixed")
        PlaylistItem.objects.create(
            playlist=playlist, track=self.track1, added_by=self.user, sort_order=0
        )
        PlaylistItem.objects.create(
            playlist=playlist, track=hidden_track, added_by=self.user, sort_order=1
        )
        response = self.client.get(
            reverse("playlists:playlist-detail", args=[playlist.pk])
        )
        titles = [item["track"]["title"] for item in response.data["items"]]
        self.assertEqual(titles, ["One"])
