from datetime import timedelta
from urllib.parse import urlparse

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from artists.models import ArtistProfile
from music.models import Album, ListeningHistory, StreamEvent, Track
from operations.models import SubscriptionPlan
from subscriptions.models import UserSubscription

User = get_user_model()


def audio_file(name="track.mp3"):
    return SimpleUploadedFile(name, b"fake-audio-data", content_type="audio/mpeg")


class MusicApiTests(APITestCase):
    def setUp(self):
        self.artist_user = User.objects.create_user(username="artist", email="artist@example.com")
        self.artist = ArtistProfile.objects.create(user=self.artist_user, stage_name="Artist", is_approved=True)
        self.listener = User.objects.create_user(username="listener", email="listener@example.com")
        self.other_artist_user = User.objects.create_user(username="otherartist", email="otherartist@example.com")
        self.other_artist = ArtistProfile.objects.create(user=self.other_artist_user, stage_name="Other", is_approved=True)

    def create_track(self, artist=None, **kwargs):
        artist = artist or self.artist
        values = {
            "artist": artist,
            "title": "Published Track",
            "audio_file": audio_file(),
            "duration_seconds": 180,
            "release_date": timezone.localdate(),
            "status": "published",
        }
        values.update(kwargs)
        return Track.objects.create(**values)

    def test_approved_artist_can_create_track(self):
        self.client.force_authenticate(user=self.artist_user)
        response = self.client.post(reverse("music:track-list"), {
            "title": "New Track",
            "audioFile": audio_file(),
            "durationSeconds": 200,
            "releaseDate": str(timezone.localdate()),
            "status": "published",
            "trackNumber": 1,
            "explicit": False,
            "isEarlyAccess": False,
        }, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Track.objects.filter(title="New Track", artist=self.artist).exists())

    def test_regular_user_cannot_create_track(self):
        self.client.force_authenticate(user=self.listener)
        response = self.client.post(reverse("music:track-list"), {
            "title": "Forbidden",
            "audioFile": audio_file(),
            "durationSeconds": 100,
            "releaseDate": str(timezone.localdate()),
        }, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_artist_cannot_edit_another_artist_track(self):
        track = self.create_track(artist=self.other_artist)
        self.client.force_authenticate(user=self.artist_user)
        response = self.client.patch(reverse("music:track-detail", args=[track.pk]), {"title": "Stolen"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listener_can_search_published_tracks(self):
        self.create_track(title="Neon Rain")
        self.create_track(title="Quiet Sky")
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-list"), {"search": "Neon"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_catalog_returns_root_relative_media_url(self):
        track = self.create_track(title="Media URL Track")
        self.client.force_authenticate(user=self.listener)

        response = self.client.get(reverse("music:track-list"), {"search": track.title})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audio_url = response.data["results"][0]["audioUrl"]
        self.assertEqual(urlparse(audio_url).path, f"/media/{track.audio_file.name}")

    def test_basic_user_cannot_see_early_access_track(self):
        self.create_track(title="Early", is_early_access=True, release_date=timezone.localdate() + timedelta(days=2))
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-list"))
        titles = [item["title"] for item in response.data["results"]]
        self.assertNotIn("Early", titles)

    def test_gold_user_can_see_early_access_track(self):
        self.create_track(title="Early", is_early_access=True, release_date=timezone.localdate() + timedelta(days=2))
        gold = SubscriptionPlan.objects.get(tier="gold")
        UserSubscription.objects.create(
            user=self.listener,
            plan=gold,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=30),
            status="active",
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-list"))
        titles = [item["title"] for item in response.data["results"]]
        self.assertIn("Early", titles)

    def test_stream_counts_after_thirty_seconds(self):
        track = self.create_track()
        self.client.force_authenticate(user=self.listener)
        stream_url = reverse("music:track-stream", args=[track.pk])
        self.client.post(
            stream_url,
            {"sessionId": "session-1", "listenedSeconds": 0},
            format="json",
        )
        StreamEvent.objects.filter(
            track=track,
            listener=self.listener,
            session_id="session-1",
        ).update(created_at=timezone.now() - timedelta(seconds=31))
        response = self.client.post(stream_url, {
            "sessionId": "session-1", "listenedSeconds": 31
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["counted"])

    def test_short_play_does_not_count_as_stream(self):
        track = self.create_track()
        self.client.force_authenticate(user=self.listener)
        response = self.client.post(reverse("music:track-stream", args=[track.pk]), {
            "sessionId": "session-short", "listenedSeconds": 10
        }, format="json")
        self.assertFalse(response.data["counted"])

    def test_same_session_is_idempotent(self):
        track = self.create_track()
        self.client.force_authenticate(user=self.listener)
        url = reverse("music:track-stream", args=[track.pk])
        self.client.post(url, {"sessionId": "same", "listenedSeconds": 31}, format="json")
        self.client.post(url, {"sessionId": "same", "listenedSeconds": 80}, format="json")
        self.assertEqual(StreamEvent.objects.filter(track=track, listener=self.listener).count(), 1)

    def test_basic_user_cannot_download(self):
        track = self.create_track()
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-download", args=[track.pk]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_silver_user_can_download(self):
        track = self.create_track()
        silver = SubscriptionPlan.objects.get(tier="silver")
        UserSubscription.objects.create(
            user=self.listener, plan=silver, starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=30), status="active"
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-download", args=[track.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("downloadUrl", response.data)

    def test_artist_can_create_album_and_add_track(self):
        self.client.force_authenticate(user=self.artist_user)
        album_response = self.client.post(reverse("music:album-list"), {
            "title": "Album",
            "releaseDate": str(timezone.localdate()),
            "status": "published",
            "isEarlyAccess": False,
        }, format="multipart")
        self.assertEqual(album_response.status_code, status.HTTP_201_CREATED)
        album_id = album_response.data["id"]
        track_response = self.client.post(reverse("music:track-list"), {
            "title": "Album Track",
            "audioFile": audio_file("album.mp3"),
            "durationSeconds": 180,
            "releaseDate": str(timezone.localdate()),
            "status": "published",
            "albumId": album_id,
            "trackNumber": 1,
        }, format="multipart")
        self.assertEqual(track_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(Track.objects.get(title="Album Track").album_id), album_id)


    def test_counted_session_cannot_be_downgraded(self):
        track = self.create_track()
        self.client.force_authenticate(user=self.listener)
        url = reverse("music:track-stream", args=[track.pk])
        self.client.post(
            url,
            {"sessionId": "stable-count", "listenedSeconds": 0},
            format="json",
        )
        StreamEvent.objects.filter(
            track=track,
            listener=self.listener,
            session_id="stable-count",
        ).update(created_at=timezone.now() - timedelta(seconds=31))
        self.client.post(
            url,
            {"sessionId": "stable-count", "listenedSeconds": 31},
            format="json",
        )
        response = self.client.post(
            url,
            {"sessionId": "stable-count", "listenedSeconds": 5},
            format="json",
        )
        self.assertTrue(response.data["counted"])
        event = StreamEvent.objects.get(
            track=track, listener=self.listener, session_id="stable-count"
        )
        self.assertEqual(event.listened_seconds, 31)

    def test_client_cannot_instantly_forge_thirty_second_stream(self):
        track = self.create_track()
        self.client.force_authenticate(user=self.listener)
        response = self.client.post(
            reverse("music:track-stream", args=[track.pk]),
            {"sessionId": "forged", "listenedSeconds": 300},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["counted"])
        self.assertEqual(response.data["listenedSeconds"], 0)

    def test_artist_can_stream_own_early_access_track(self):
        track = self.create_track(
            title="Artist Preview",
            is_early_access=True,
            release_date=timezone.localdate() + timedelta(days=5),
        )
        self.client.force_authenticate(user=self.artist_user)
        response = self.client.post(
            reverse("music:track-stream", args=[track.pk]),
            {"sessionId": "artist-preview", "listenedSeconds": 31},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_gold_user_does_not_see_scheduled_non_early_track(self):
        self.create_track(
            title="Scheduled Standard",
            is_early_access=False,
            release_date=timezone.localdate() + timedelta(days=5),
        )
        gold = SubscriptionPlan.objects.get(tier="gold")
        UserSubscription.objects.create(
            user=self.listener,
            plan=gold,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=30),
            status="active",
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-list"))
        titles = [item["title"] for item in response.data["results"]]
        self.assertNotIn("Scheduled Standard", titles)

    def test_basic_user_does_not_receive_advanced_track_stats(self):
        track = self.create_track()
        StreamEvent.objects.create(
            track=track,
            listener=self.listener,
            session_id="stat-source",
            listened_seconds=31,
            counted=True,
            streamed_on=timezone.localdate(),
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-detail", args=[track.pk]))
        self.assertIsNone(response.data["playCount"])
        self.assertIsNone(response.data["uniqueListeners"])

    def test_gold_user_receives_advanced_track_stats(self):
        track = self.create_track()
        StreamEvent.objects.create(
            track=track,
            listener=self.listener,
            session_id="gold-stat-source",
            listened_seconds=31,
            counted=True,
            streamed_on=timezone.localdate(),
        )
        gold = SubscriptionPlan.objects.get(tier="gold")
        UserSubscription.objects.create(
            user=self.listener,
            plan=gold,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(days=30),
            status="active",
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-detail", args=[track.pk]))
        self.assertEqual(response.data["playCount"], 1)
        self.assertEqual(response.data["uniqueListeners"], 1)

    def test_album_detail_filters_inaccessible_tracks(self):
        album = Album.objects.create(
            artist=self.artist,
            title="Mixed Release",
            release_date=timezone.localdate(),
            status="published",
        )
        self.create_track(title="Public", album=album, track_number=1)
        self.create_track(
            title="Early Hidden",
            album=album,
            track_number=2,
            is_early_access=True,
            release_date=timezone.localdate() + timedelta(days=3),
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:album-detail", args=[album.pk]))
        titles = [item["title"] for item in response.data["tracks"]]
        self.assertEqual(titles, ["Public"])

    def test_basic_user_can_access_early_release_after_release_date(self):
        track = self.create_track(
            title="Early Access Graduated",
            is_early_access=True,
            release_date=timezone.localdate() - timedelta(days=1),
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:track-detail", args=[track.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_home_recommendations_are_deterministic_and_history_based(self):
        listened = self.create_track(title="Known Favorite")
        recommended = self.create_track(title="Same Artist Discovery")
        unrelated = self.create_track(artist=self.other_artist, title="Unrelated Track")
        ListeningHistory.objects.create(
            listener=self.listener,
            track=listened,
            last_played_at=timezone.now(),
            play_count=4,
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(reverse("music:home-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recommendation_ids = [item["track"]["id"] for item in response.data["recommendedTracks"]]
        self.assertNotIn(str(listened.pk), recommendation_ids)
        self.assertEqual(recommendation_ids[0], str(recommended.pk))
        self.assertIn(str(unrelated.pk), recommendation_ids)
        self.assertIn("Because you listen to", response.data["recommendedTracks"][0]["reason"])
