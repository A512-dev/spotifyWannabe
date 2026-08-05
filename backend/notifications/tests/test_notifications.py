from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from notifications.models import Notification, NotificationType
from notifications.services import create_notification

User = get_user_model()


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="listener", email="listener@example.com")
        self.other = User.objects.create_user(username="other", email="other@example.com")
        self.first = Notification.objects.create(recipient=self.user, type=NotificationType.SYSTEM, title="One", message="Message")
        self.second = Notification.objects.create(recipient=self.user, type=NotificationType.SUPPORT, title="Two", message="Message")
        self.foreign = Notification.objects.create(recipient=self.other, type=NotificationType.SYSTEM, title="Foreign", message="Message")
        self.client.force_authenticate(user=self.user)

    def test_user_only_sees_own_notifications(self):
        response = self.client.get(reverse("notifications:notification-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_user_can_mark_one_notification_read(self):
        response = self.client.post(reverse("notifications:notification-read", args=[self.first.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.first.refresh_from_db()
        self.assertIsNotNone(self.first.read_at)

    def test_user_can_mark_all_notifications_read(self):
        response = self.client.post(reverse("notifications:notification-read-all"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated"], 2)

    def test_user_can_delete_own_notification(self):
        response = self.client.delete(reverse("notifications:notification-detail", args=[self.first.pk]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_user_cannot_access_foreign_notification(self):
        response = self.client.get(reverse("notifications:notification-detail", args=[self.foreign.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_followed_release_setting_does_not_hide_artist_account_decisions(self):
        self.user.preferences.followed_artist_notifications = False
        self.user.preferences.save()
        release = create_notification(
            recipient_id=self.user.pk,
            type=NotificationType.ARTIST_RELEASE,
            title="Release",
            message="New track",
        )
        decision = create_notification(
            recipient_id=self.user.pk,
            type=NotificationType.ARTIST,
            title="Application approved",
            message="Approved",
        )
        self.assertIsNone(release)
        self.assertIsNotNone(decision)
