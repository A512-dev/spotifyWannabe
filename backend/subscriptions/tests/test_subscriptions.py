from datetime import datetime
import os
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from subscriptions.models import PaymentStatus, PaymentTransaction, UserSubscription
from subscriptions.services import add_calendar_months

User = get_user_model()


class SubscriptionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="buyer", email="buyer@example.com")
        self.client.force_authenticate(user=self.user)

    def test_user_starts_with_basic_tier(self):
        response = self.client.get(reverse("subscriptions:current"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tier"], "basic")

    def test_payment_initiation_supports_allowed_periods(self):
        response = self.client.post(reverse("subscriptions:payment-initiate"), {
            "tier": "silver", "months": 3, "callbackUrl": "http://localhost:3000/payment/callback"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("LOCAL-", response.data["paymentUrl"])
        self.assertEqual(response.data["payment"]["months"], 3)

    def test_basic_plan_does_not_create_payment(self):
        response = self.client.post(reverse("subscriptions:payment-initiate"), {
            "tier": "basic", "months": 1, "callbackUrl": "http://localhost:3000/payment/callback"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_successful_callback_activates_subscription(self):
        initiated = self.client.post(reverse("subscriptions:payment-initiate"), {
            "tier": "gold", "months": 1, "callbackUrl": "http://localhost:3000/payment/callback"
        }, format="json")
        payment = PaymentTransaction.objects.get(pk=initiated.data["payment"]["id"])
        self.client.force_authenticate(user=None)
        callback = self.client.get(reverse("subscriptions:payment-callback"), {"Authority": payment.authority, "Status": "OK"})
        self.assertEqual(callback.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.SUCCESS)
        self.assertTrue(UserSubscription.objects.filter(user=self.user, status="active", plan__tier="gold").exists())

    def test_callback_uses_gateway_recorded_on_transaction(self):
        initiated = self.client.post(reverse("subscriptions:payment-initiate"), {
            "tier": "silver", "months": 1, "callbackUrl": "http://localhost:3000/payment/callback"
        }, format="json")
        payment = PaymentTransaction.objects.get(pk=initiated.data["payment"]["id"])
        self.assertEqual(payment.gateway, "local-sandbox")

        self.client.force_authenticate(user=None)
        with patch.dict(
            os.environ,
            {"PAYMENT_GATEWAY": "zarinpal", "ZARINPAL_MERCHANT_ID": ""},
            clear=False,
        ):
            callback = self.client.get(
                reverse("subscriptions:payment-callback"),
                {"Authority": payment.authority, "Status": "OK"},
            )
        self.assertEqual(callback.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.SUCCESS)

    def test_canceled_callback_does_not_activate_subscription(self):
        initiated = self.client.post(reverse("subscriptions:payment-initiate"), {
            "tier": "silver", "months": 1, "callbackUrl": "http://localhost:3000/payment/callback"
        }, format="json")
        payment = PaymentTransaction.objects.get(pk=initiated.data["payment"]["id"])
        self.client.force_authenticate(user=None)
        self.client.get(reverse("subscriptions:payment-callback"), {"Authority": payment.authority, "Status": "NOK"})
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.CANCELED)
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())


    def test_calendar_month_arithmetic_clamps_end_of_month(self):
        value = datetime(2026, 1, 31, 12, 0, tzinfo=ZoneInfo("UTC"))
        shifted = add_calendar_months(value, 1)
        self.assertEqual((shifted.year, shifted.month, shifted.day), (2026, 2, 28))
