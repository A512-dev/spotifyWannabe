from datetime import date
from io import BytesIO

from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserFollow
from artists.models import ArtistApplication

User = get_user_model()


class AccountsApiTests(APITestCase):
    def listener_payload(self, email="listener@example.com"):
        return {
            "displayName": "Listener",
            "email": email,
            "password": "Strong-pass-123",
            "passwordConfirmation": "Strong-pass-123",
            "birthDate": "2002-01-02",
            "gender": "prefer_not_to_say",
            "acceptsPrivacyPolicy": True,
        }

    def test_listener_registration_returns_token_and_profile(self):
        response = self.client.post(reverse("accounts:register-listener"), self.listener_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["token"])
        self.assertEqual(response.data["user"]["displayName"], "Listener")
        self.assertEqual(response.data["user"]["subscriptionTier"], "basic")
        self.assertEqual(response.data["user"]["birthDate"], "2002-01-02")
        self.assertEqual(response.data["user"]["gender"], "prefer_not_to_say")

    def test_duplicate_email_is_rejected(self):
        self.client.post(reverse("accounts:register-listener"), self.listener_payload(), format="json")
        response = self.client.post(reverse("accounts:register-listener"), self.listener_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_privacy_policy_is_required(self):
        payload = self.listener_payload()
        payload["acceptsPrivacyPolicy"] = False
        response = self.client.post(reverse("accounts:register-listener"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_and_logout(self):
        self.client.post(reverse("accounts:register-listener"), self.listener_payload(), format="json")
        login = self.client.post(reverse("accounts:login"), {"email": "listener@example.com", "password": "Strong-pass-123"}, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        logout = self.client.post(reverse("accounts:logout"))
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)

    def test_me_update_and_delete(self):
        user = User.objects.create_user(username="u", email="u@example.com", password="Strong-pass-123")
        self.client.force_authenticate(user=user)
        update = self.client.patch(reverse("accounts:me"), {"displayName": "Updated"}, format="json")
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.assertEqual(update.data["displayName"], "Updated")
        delete = self.client.delete(reverse("accounts:me"))
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=user.pk).exists())

    def test_artist_registration_creates_pending_application(self):
        payload = {
            "stageName": "New Artist",
            "email": "artist@example.com",
            "password": "Strong-pass-123",
            "passwordConfirmation": "Strong-pass-123",
            "portfolioDescription": "Demo",
            "sampleLinks": ["https://example.com/demo.mp3"],
            "acceptsPrivacyPolicy": True,
        }
        response = self.client.post(reverse("accounts:register-artist"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["applicationStatus"], "pending")
        self.assertTrue(ArtistApplication.objects.filter(applicant__email="artist@example.com").exists())

    def test_user_can_follow_and_unfollow_another_user(self):
        first = User.objects.create_user(username="first", email="first@example.com")
        second = User.objects.create_user(username="second", email="second@example.com")
        self.client.force_authenticate(user=first)
        url = reverse("accounts:user-follow", args=[second.pk])
        followed = self.client.post(url)
        self.assertEqual(followed.status_code, status.HTTP_200_OK)
        self.assertTrue(UserFollow.objects.filter(follower=first, following=second).exists())
        unfollowed = self.client.delete(url)
        self.assertEqual(unfollowed.status_code, status.HTTP_200_OK)
        self.assertFalse(UserFollow.objects.filter(follower=first, following=second).exists())

    def test_user_cannot_follow_self(self):
        user = User.objects.create_user(username="self", email="self@example.com")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("accounts:user-follow", args=[user.pk]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_preferences_are_persisted(self):
        user = User.objects.create_user(username="prefs", email="prefs@example.com")
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse("accounts:preferences"), {"language": "fa", "systemSoundEnabled": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["language"], "fa")
        self.assertFalse(response.data["systemSoundEnabled"])

    def test_password_reset_request_does_not_reveal_account_existence(self):
        response = self.client.post(reverse("accounts:password-reset"), {"email": "missing@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_basic_user_cannot_upload_avatar(self):
        user = User.objects.create_user(
            username="basic-avatar",
            email="basic-avatar@example.com",
            password="Strong-pass-123",
        )
        image_bytes = BytesIO()
        Image.new("RGB", (2, 2), color="white").save(image_bytes, format="PNG")
        image_bytes.seek(0)
        avatar = SimpleUploadedFile(
            "avatar.png",
            image_bytes.read(),
            content_type="image/png",
        )
        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("accounts:me"),
            {"avatarFile": avatar},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_one_active_system_administrator_is_allowed(self):
        User.objects.create_superuser(
            username="primary-admin",
            email="primary-admin@example.com",
            password="Strong-pass-123",
        )
        with self.assertRaises(ValidationError):
            User.objects.create_superuser(
                username="second-admin",
                email="second-admin@example.com",
                password="Strong-pass-123",
            )
