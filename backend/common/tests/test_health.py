from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckTests(APITestCase):
    def test_health_check_returns_service_status(self) -> None:
        response = self.client.get(reverse("common:health"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "soundwave-backend"},
        )
