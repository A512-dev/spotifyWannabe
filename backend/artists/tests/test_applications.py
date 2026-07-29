from __future__ import annotations

import shutil
import tempfile
from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from artists.models import ArtistApplication, ArtistProfile
from artists.signals import artist_application_reviewed

User = get_user_model()
TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="soundwave-test-media-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class ArtistApplicationApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls) -> None:
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self) -> None:
        self.applicant = User.objects.create_user(
            username="applicant",
            email="applicant@example.com",
            password="strong-password-123",
        )
        self.other_applicant = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="strong-password-123",
        )
        self.support_user = User.objects.create_user(
            username="support",
            email="support@example.com",
            password="strong-password-123",
        )
        support_group = Group.objects.create(name="support")
        self.support_user.groups.add(support_group)
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="strong-password-123",
        )
        self.list_url = reverse("artists:application-list")

    def sample_file(self, name: str = "sample.mp3") -> SimpleUploadedFile:
        return SimpleUploadedFile(name, b"sample-audio-content", content_type="audio/mpeg")

    def create_application(self, user=None, stage_name: str = "Neon Harbor"):
        user = user or self.applicant
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.list_url,
            {
                "stageName": stage_name,
                "portfolioDescription": "Independent electronic artist.",
                "sampleFiles": [self.sample_file()],
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return ArtistApplication.objects.get(pk=response.data["id"])

    def test_unauthenticated_user_cannot_submit_application(self) -> None:
        response = self.client.post(
            self.list_url,
            {
                "stageName": "Anonymous Artist",
                "sampleFiles": [self.sample_file()],
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_can_submit_application_with_sample_file(self) -> None:
        application = self.create_application()
        self.assertEqual(application.applicant, self.applicant)
        self.assertEqual(application.status, "pending")
        self.assertEqual(application.samples.count(), 1)

    def test_application_requires_at_least_one_sample(self) -> None:
        self.client.force_authenticate(user=self.applicant)
        response = self.client.post(
            self.list_url,
            {"stageName": "No Sample"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("samples", response.data["error"]["details"])

    def test_unsupported_sample_extension_is_rejected(self) -> None:
        self.client.force_authenticate(user=self.applicant)
        response = self.client.post(
            self.list_url,
            {
                "stageName": "Unsafe Upload",
                "sampleFiles": [self.sample_file("payload.exe")],
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_create_second_pending_application(self) -> None:
        self.create_application()
        response = self.client.post(
            self.list_url,
            {
                "stageName": "Duplicate Pending",
                "sampleFiles": [self.sample_file("second.mp3")],
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_regular_user_only_sees_own_applications(self) -> None:
        own_application = self.create_application(self.applicant)
        self.create_application(self.other_applicant, "Other Artist")
        self.client.force_authenticate(user=self.applicant)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(own_application.id))

    def test_support_user_can_see_all_applications(self) -> None:
        self.create_application(self.applicant)
        self.create_application(self.other_applicant, "Other Artist")
        self.client.force_authenticate(user=self.support_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_regular_user_cannot_review_application(self) -> None:
        application = self.create_application()
        self.client.force_authenticate(user=self.other_applicant)
        review_url = reverse("artists:application-review", args=[application.pk])
        response = self.client.post(
            review_url,
            {"decision": "approved", "reviewNote": "Looks good."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rejection_requires_reason(self) -> None:
        application = self.create_application()
        self.client.force_authenticate(user=self.support_user)
        review_url = reverse("artists:application-review", args=[application.pk])
        response = self.client.post(
            review_url,
            {"decision": "rejected", "reviewNote": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_support_can_approve_and_create_verified_profile(self) -> None:
        application = self.create_application()
        callback = Mock()
        artist_application_reviewed.connect(callback)
        self.addCleanup(artist_application_reviewed.disconnect, callback)

        self.client.force_authenticate(user=self.support_user)
        review_url = reverse("artists:application-review", args=[application.pk])
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                review_url,
                {"decision": "approved", "reviewNote": "Portfolio verified."},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        profile = ArtistProfile.objects.get(user=self.applicant)
        self.assertEqual(application.status, "approved")
        self.assertTrue(profile.is_approved)
        self.assertEqual(profile.stage_name, application.stage_name)
        self.assertTrue(self.applicant.groups.filter(name="artist").exists())
        self.assertTrue(callback.called)

    def test_reviewed_application_cannot_be_reviewed_again(self) -> None:
        application = self.create_application()
        self.client.force_authenticate(user=self.admin_user)
        review_url = reverse("artists:application-review", args=[application.pk])
        first_response = self.client.post(
            review_url,
            {"decision": "rejected", "reviewNote": "Incomplete sample metadata."},
            format="json",
        )
        second_response = self.client.post(
            review_url,
            {"decision": "approved", "reviewNote": "Changed my mind."},
            format="json",
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
