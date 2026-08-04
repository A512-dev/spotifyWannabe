from __future__ import annotations

from datetime import date
from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from artists.models import ArtistApplication, ArtistProfile
from music.models import StreamEvent, Track
from reports.models import ArtistRevenueRecord, PaymentStatus
from reports.signals import artist_revenue_record_settled
from support.models import Ticket, TicketMessage, TicketPriority, TicketStatus

User = get_user_model()


class OperationalReportsApiTests(APITestCase):
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
        support_group = Group.objects.create(name="support")
        self.support_user.groups.add(support_group)

        self.artist_user = User.objects.create_user(
            username="artist-one",
            email="artist-one@example.com",
            password="strong-password-123",
        )
        self.artist_profile = ArtistProfile.objects.create(
            user=self.artist_user,
            stage_name="Neon Harbor",
            is_approved=True,
        )
        self.other_artist_user = User.objects.create_user(
            username="artist-two",
            email="artist-two@example.com",
            password="strong-password-123",
        )
        self.other_artist_profile = ArtistProfile.objects.create(
            user=self.other_artist_user,
            stage_name="Orbit Echo",
            is_approved=True,
        )
        self.regular_user = User.objects.create_user(
            username="listener",
            email="listener@example.com",
            password="strong-password-123",
        )
        self.list_url = reverse("reports:artist-revenue-list")

    def record_payload(self, artist=None, **overrides):
        artist = artist or self.artist_profile
        payload = {
            "artistId": str(artist.pk),
            "periodStart": "2026-05-01",
            "periodEnd": "2026-05-31",
            "uniqueListeners": 1200,
            "streamCount": 8400,
            "grossRevenueCents": 4200,
            "platformFeeCents": 840,
            "currency": "USD",
            "calculationNote": "Imported from the monthly streaming aggregate.",
        }
        payload.update(overrides)
        return payload

    def create_record(self, artist=None, **overrides):
        artist = artist or self.artist_profile
        return ArtistRevenueRecord.objects.create(
            artist=artist,
            period_start=date(2026, 5, 1),
            period_end=date(2026, 5, 31),
            unique_listener_count=overrides.get("unique_listener_count", 1200),
            stream_count=overrides.get("stream_count", 8400),
            gross_revenue_cents=overrides.get("gross_revenue_cents", 4200),
            platform_fee_cents=overrides.get("platform_fee_cents", 840),
            currency=overrides.get("currency", "USD"),
        )

    def test_unauthenticated_user_cannot_list_revenue_records(self) -> None:
        response = self.client.get(self.list_url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_regular_user_cannot_view_operational_reports(self) -> None:
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_artist_only_sees_own_revenue_records(self) -> None:
        own_record = self.create_record()
        self.create_record(
            artist=self.other_artist_profile,
            gross_revenue_cents=3000,
            platform_fee_cents=600,
        )
        self.client.force_authenticate(user=self.artist_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(own_record.pk))

    def test_support_user_can_see_all_revenue_records(self) -> None:
        self.create_record()
        self.create_record(
            artist=self.other_artist_profile,
            gross_revenue_cents=3000,
            platform_fee_cents=600,
        )
        self.client.force_authenticate(user=self.support_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_admin_can_create_revenue_record_and_net_is_computed(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.list_url, self.record_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["netRevenueCents"], 3360)
        record = ArtistRevenueRecord.objects.get(pk=response.data["id"])
        self.assertEqual(record.net_revenue_cents, 3360)

    def test_non_admin_cannot_create_revenue_record(self) -> None:
        self.client.force_authenticate(user=self.support_user)
        response = self.client.post(self.list_url, self.record_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_fee_cannot_exceed_gross_revenue(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.list_url,
            self.record_payload(platformFeeCents=5000),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_artist_period_is_rejected(self) -> None:
        self.create_record()
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.list_url, self.record_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_settle_revenue_record(self) -> None:
        record = self.create_record()
        callback = Mock()
        artist_revenue_record_settled.connect(callback)
        self.addCleanup(artist_revenue_record_settled.disconnect, callback)
        self.client.force_authenticate(user=self.admin_user)
        settle_url = reverse("reports:artist-revenue-settle", args=[record.pk])
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(settle_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["paymentStatus"], "settled")
        record.refresh_from_db()
        self.assertEqual(record.payment_status, PaymentStatus.SETTLED)
        self.assertEqual(record.settled_by, self.admin_user)
        self.assertIsNotNone(record.settled_at)
        self.assertTrue(callback.called)

    def test_settled_record_cannot_be_settled_again(self) -> None:
        record = self.create_record()
        self.client.force_authenticate(user=self.admin_user)
        settle_url = reverse("reports:artist-revenue-settle", args=[record.pk])
        first_response = self.client.post(settle_url, {}, format="json")
        second_response = self.client.post(settle_url, {}, format="json")
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_support_user_cannot_confirm_settlement(self) -> None:
        record = self.create_record()
        self.client.force_authenticate(user=self.support_user)
        settle_url = reverse("reports:artist-revenue-settle", args=[record.pk])
        response = self.client.post(settle_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_artist_overview_aggregates_only_current_artist(self) -> None:
        self.create_record()
        self.create_record(
            artist=self.other_artist_profile,
            gross_revenue_cents=3000,
            platform_fee_cents=600,
        )
        self.client.force_authenticate(user=self.artist_user)
        url = reverse("reports:artist-overview")
        response = self.client.get(
            url,
            {"periodStart": "2026-05-01", "periodEnd": "2026-05-31"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recordCount"], 1)
        self.assertEqual(response.data["streams"], 8400)
        self.assertEqual(response.data["currencyBreakdown"][0]["artistPayoutCents"], 3360)

    def test_support_overview_contains_ticket_and_application_counts(self) -> None:
        ArtistApplication.objects.create(
            applicant=self.regular_user,
            stage_name="Pending Artist",
        )
        ticket = Ticket.objects.create(
            requester=self.regular_user,
            subject="Playback issue",
            priority=TicketPriority.URGENT,
            status=TicketStatus.OPEN,
        )
        TicketMessage.objects.create(
            ticket=ticket,
            sender=self.regular_user,
            body="The player stops unexpectedly.",
        )
        self.client.force_authenticate(user=self.support_user)
        response = self.client.get(reverse("reports:support-overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tickets"]["open"], 1)
        self.assertEqual(response.data["artistApplications"]["pending"], 1)
        self.assertEqual(response.data["urgentOpenTickets"], 1)
        self.assertEqual(response.data["unassignedOpenTickets"], 1)

    def test_admin_overview_aggregates_accounting_and_operations(self) -> None:
        self.create_record()
        self.create_record(
            artist=self.other_artist_profile,
            gross_revenue_cents=3000,
            platform_fee_cents=600,
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            reverse("reports:admin-overview"),
            {"periodStart": "2026-05-01", "periodEnd": "2026-05-31"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["accounting"]["recordCount"], 2)
        self.assertEqual(response.data["accounting"]["artistCount"], 2)
        self.assertEqual(response.data["accounting"]["streams"], 16800)
        self.assertEqual(response.data["artists"]["approved"], 2)
        self.assertEqual(
            response.data["accounting"]["currencyBreakdown"][0]["artistPayoutCents"],
            5760,
        )

    def test_invalid_report_period_is_rejected(self) -> None:
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            reverse("reports:admin-overview"),
            {"periodStart": "2026-06-01", "periodEnd": "2026-05-01"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_admin_can_generate_revenue_from_stream_events(self) -> None:
        track = Track.objects.create(
            artist=self.artist_profile,
            title="Monthly Track",
            audio_file=SimpleUploadedFile("monthly.mp3", b"audio"),
            duration_seconds=180,
            release_date=date(2026, 5, 1),
            status="published",
        )
        second_listener = User.objects.create_user(
            username="listener-two", email="listener-two@example.com"
        )
        for listener, session_id in [
            (self.regular_user, "one"),
            (self.regular_user, "two"),
            (second_listener, "three"),
        ]:
            StreamEvent.objects.create(
                track=track,
                listener=listener,
                session_id=session_id,
                listened_seconds=31,
                counted=True,
                streamed_on=date(2026, 5, 15),
            )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            reverse("reports:artist-revenue-generate"),
            {
                "artistId": str(self.artist_profile.pk),
                "periodStart": "2026-05-01",
                "periodEnd": "2026-05-31",
                "currency": "USD",
                "perStreamCents": 2,
                "perUniqueListenerCents": 5,
                "platformFeePercent": 20,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["streamCount"], 3)
        self.assertEqual(response.data["uniqueListeners"], 2)
        self.assertEqual(response.data["grossRevenueCents"], 16)
        self.assertEqual(response.data["platformFeeCents"], 3)
        self.assertEqual(response.data["netRevenueCents"], 13)
