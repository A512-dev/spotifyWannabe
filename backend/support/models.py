from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from common.models import TimestampedModel


class TicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    WAITING_FOR_USER = "waiting_for_user", "Waiting for user"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class TicketPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class Ticket(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_support_tickets",
        null=True,
        blank=True,
    )
    subject = models.CharField(max_length=180)
    status = models.CharField(
        max_length=24,
        choices=TicketStatus.choices,
        default=TicketStatus.OPEN,
        db_index=True,
    )
    priority = models.CharField(
        max_length=12,
        choices=TicketPriority.choices,
        default=TicketPriority.MEDIUM,
        db_index=True,
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(
                fields=["status", "-updated_at"],
                name="support_status_updated_idx",
            ),
            models.Index(
                fields=["priority", "-updated_at"],
                name="support_priority_updated_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.subject} ({self.get_status_display()})"


class TicketMessage(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="support_ticket_messages",
    )
    body = models.TextField()
    is_internal_note = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["ticket", "created_at"],
                name="support_message_ticket_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"Message on {self.ticket_id} by {self.sender_id}"
