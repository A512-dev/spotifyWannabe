from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from operations.models import SubscriptionPlan, SubscriptionPriceChange

User = get_user_model()


class SubscriptionPriceApiTests(APITestCase):
    def setUp(self) -> None:
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="strong-password-123",
        )
        self.support_user = User.objects.create_user(
            username="support",
            email="support@example.com",
            password="strong-password-123",
        )
        support_group, _ = Group.objects.get_or_create(name="support")
        self.support_user.groups.add(support_group)
        self.regular_user = User.objects.create_user(
            username="listener",
            email="listener@example.com",
            password="strong-password-123",
        )
        self.list_url = reverse("operations:subscription-price-list")

    def test_default_plans_are_created_after_migration(self) -> None:
        self.assertSetEqual(
            set(SubscriptionPlan.objects.values_list("tier", flat=True)),
            {"basic", "silver", "gold"},
        )

    def test_prices_are_publicly_readable(self) -> None:
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_basic_plan_matches_project_limits(self) -> None:
        response = self.client.get(
            reverse("operations:subscription-price-detail", args=["basic"])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["monthlyPriceCents"], 0)
        self.assertEqual(response.data["playlistLimit"], 6)
        self.assertFalse(response.data["canUploadProfileImage"])
        self.assertFalse(response.data["canDownloadTracks"])

    def test_silver_plan_matches_project_limits(self) -> None:
        response = self.client.get(
            reverse("operations:subscription-price-detail", args=["silver"])
        )
        self.assertEqual(response.data["playlistLimit"], 100)
        self.assertTrue(response.data["canUploadProfileImage"])
        self.assertTrue(response.data["canDownloadTracks"])
        self.assertFalse(response.data["hasEarlyAccess"])
        self.assertFalse(response.data["canViewAdvancedStats"])

    def test_gold_plan_has_unlimited_and_advanced_features(self) -> None:
        response = self.client.get(
            reverse("operations:subscription-price-detail", args=["gold"])
        )
        self.assertIsNone(response.data["playlistLimit"])
        self.assertTrue(response.data["hasEarlyAccess"])
        self.assertTrue(response.data["canViewAdvancedStats"])

    def test_quote_supports_project_billing_periods(self) -> None:
        response = self.client.get(
            reverse("operations:subscription-price-quote", args=["silver"]),
            {"months": 6},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["months"], 6)
        self.assertEqual(
            response.data["totalPriceCents"],
            response.data["monthlyPriceCents"] * 6,
        )

    def test_quote_rejects_unsupported_billing_period(self) -> None:
        response = self.client.get(
            reverse("operations:subscription-price-quote", args=["silver"]),
            {"months": 2},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_update_silver_price(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            reverse("operations:subscription-price-detail", args=["silver"]),
            {"monthlyPriceCents": 799},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["monthlyPriceCents"], 799)
        self.assertEqual(SubscriptionPriceChange.objects.count(), 1)

    def test_regular_user_cannot_update_price(self) -> None:
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.patch(
            reverse("operations:subscription-price-detail", args=["silver"]),
            {"monthlyPriceCents": 799},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_support_user_cannot_update_price(self) -> None:
        self.client.force_authenticate(user=self.support_user)
        response = self.client.patch(
            reverse("operations:subscription-price-detail", args=["gold"]),
            {"monthlyPriceCents": 1299},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_basic_price_cannot_be_updated(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            reverse("operations:subscription-price-detail", args=["basic"]),
            {"monthlyPriceCents": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_positive_paid_price_is_rejected(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            reverse("operations:subscription-price-detail", args=["silver"]),
            {"monthlyPriceCents": 0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_price_update_does_not_create_audit_for_same_value(self) -> None:
        silver = SubscriptionPlan.objects.get(tier="silver")
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            reverse("operations:subscription-price-detail", args=["silver"]),
            {"monthlyPriceCents": silver.monthly_price_cents},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(SubscriptionPriceChange.objects.count(), 0)

    def test_create_delete_and_full_update_are_not_available(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        post_response = self.client.post(
            self.list_url,
            {"tier": "silver", "monthlyPriceCents": 799},
            format="json",
        )
        put_response = self.client.put(
            reverse("operations:subscription-price-detail", args=["silver"]),
            {"monthlyPriceCents": 799},
            format="json",
        )
        delete_response = self.client.delete(
            reverse("operations:subscription-price-detail", args=["silver"])
        )
        self.assertEqual(post_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(put_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(delete_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_only_admin_can_read_price_change_history(self) -> None:
        history_url = reverse("operations:subscription-price-change-list")
        self.client.force_authenticate(user=self.regular_user)
        regular_response = self.client.get(history_url)
        self.client.force_authenticate(user=self.admin_user)
        admin_response = self.client.get(history_url)
        self.assertEqual(regular_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
