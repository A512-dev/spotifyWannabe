from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from support.models import Ticket, TicketMessage

User = get_user_model()


class TicketApiTests(APITestCase):
    def setUp(self) -> None:
        self.requester = User.objects.create_user(
            username="listener",
            email="listener@example.com",
            password="strong-password-123",
        )
        self.other_user = User.objects.create_user(
            username="other-listener",
            email="other@example.com",
            password="strong-password-123",
        )
        self.support_user = User.objects.create_user(
            username="support-one",
            email="support@example.com",
            password="strong-password-123",
        )
        self.second_support_user = User.objects.create_user(
            username="support-two",
            email="support-two@example.com",
            password="strong-password-123",
        )
        support_group = Group.objects.create(name="support")
        self.support_user.groups.add(support_group)
        self.second_support_user.groups.add(support_group)
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="strong-password-123",
        )
        self.list_url = reverse("support:ticket-list")

    def create_ticket(self, requester=None, subject="Cannot update profile image"):
        requester = requester or self.requester
        self.client.force_authenticate(user=requester)
        response = self.client.post(
            self.list_url,
            {
                "subject": subject,
                "message": "I do not see an option to upload a profile image.",
                "priority": "medium",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Ticket.objects.get(pk=response.data["id"])

    def test_unauthenticated_user_cannot_create_ticket(self) -> None:
        response = self.client.post(
            self.list_url,
            {"subject": "Login issue", "message": "I cannot log in."},
            format="json",
        )
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_authenticated_user_can_create_ticket_with_initial_message(self) -> None:
        ticket = self.create_ticket()
        self.assertEqual(ticket.requester, self.requester)
        self.assertEqual(ticket.status, "open")
        self.assertEqual(ticket.messages.count(), 1)
        self.assertEqual(ticket.messages.get().sender, self.requester)

    def test_ticket_requires_non_empty_initial_message(self) -> None:
        self.client.force_authenticate(user=self.requester)
        response = self.client.post(
            self.list_url,
            {"subject": "Login issue", "message": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_regular_user_only_sees_own_tickets(self) -> None:
        own_ticket = self.create_ticket(self.requester)
        self.create_ticket(self.other_user, "Revenue report is delayed")
        self.client.force_authenticate(user=self.requester)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(own_ticket.id))

    def test_support_user_can_see_all_tickets(self) -> None:
        self.create_ticket(self.requester)
        self.create_ticket(self.other_user, "Revenue report is delayed")
        self.client.force_authenticate(user=self.support_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_regular_user_cannot_retrieve_another_users_ticket(self) -> None:
        other_ticket = self.create_ticket(self.other_user)
        self.client.force_authenticate(user=self.requester)
        detail_url = reverse("support:ticket-detail", args=[other_ticket.pk])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requester_can_add_message_and_reopen_ticket(self) -> None:
        ticket = self.create_ticket()
        ticket.status = "waiting_for_user"
        ticket.save(update_fields=["status", "updated_at"])
        self.client.force_authenticate(user=self.requester)
        messages_url = reverse("support:ticket-messages", args=[ticket.pk])
        response = self.client.post(
            messages_url,
            {"body": "Here is the requested information."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "open")

    def test_regular_user_cannot_add_internal_note(self) -> None:
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.requester)
        messages_url = reverse("support:ticket-messages", args=[ticket.pk])
        response = self.client.post(
            messages_url,
            {"body": "Private note", "isInternalNote": True},
            format="json",
        )
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_support_reply_assigns_ticket_and_waits_for_user(self) -> None:
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.support_user)
        messages_url = reverse("support:ticket-messages", args=[ticket.pk])
        response = self.client.post(
            messages_url,
            {"body": "Please try the profile settings page."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_to, self.support_user)
        self.assertEqual(ticket.status, "waiting_for_user")

    def test_internal_notes_are_hidden_from_requester(self) -> None:
        ticket = self.create_ticket()
        TicketMessage.objects.create(
            ticket=ticket,
            sender=self.support_user,
            body="This is visible to support only.",
            is_internal_note=True,
        )
        self.client.force_authenticate(user=self.requester)
        detail_url = reverse("support:ticket-detail", args=[ticket.pk])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["messages"]), 1)
        self.assertFalse(response.data["messages"][0]["isInternalNote"])

    def test_support_can_see_internal_notes(self) -> None:
        ticket = self.create_ticket()
        TicketMessage.objects.create(
            ticket=ticket,
            sender=self.support_user,
            body="This is visible to support only.",
            is_internal_note=True,
        )
        self.client.force_authenticate(user=self.support_user)
        detail_url = reverse("support:ticket-detail", args=[ticket.pk])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["messages"]), 2)
        self.assertTrue(response.data["messages"][1]["isInternalNote"])

    def test_support_can_change_ticket_status(self) -> None:
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.support_user)
        status_url = reverse("support:ticket-change-status", args=[ticket.pk])
        response = self.client.patch(status_url, {"status": "resolved"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "resolved")

    def test_regular_user_cannot_change_ticket_status(self) -> None:
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.requester)
        status_url = reverse("support:ticket-change-status", args=[ticket.pk])
        response = self.client.patch(status_url, {"status": "closed"}, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_invalid_ticket_status_transition_is_rejected(self) -> None:
        ticket = self.create_ticket()
        ticket.status = "closed"
        ticket.save(update_fields=["status", "updated_at"])
        self.client.force_authenticate(user=self.support_user)
        status_url = reverse("support:ticket-change-status", args=[ticket.pk])
        response = self.client.patch(
            status_url,
            {"status": "resolved"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_support_can_assign_ticket_to_another_support_user(self) -> None:
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.support_user)
        assignment_url = reverse("support:ticket-assignment", args=[ticket.pk])
        response = self.client.patch(
            assignment_url,
            {"assignedSupportUserId": self.second_support_user.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_to, self.second_support_user)

    def test_ticket_cannot_be_assigned_to_regular_user(self) -> None:
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.support_user)
        assignment_url = reverse("support:ticket-assignment", args=[ticket.pk])
        response = self.client.patch(
            assignment_url,
            {"assignedSupportUserId": self.other_user.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
