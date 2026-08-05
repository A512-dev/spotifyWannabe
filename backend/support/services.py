from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from common.permissions import user_in_group
from support.models import Ticket, TicketMessage, TicketStatus
from support.signals import ticket_created, ticket_message_added, ticket_status_changed


ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    TicketStatus.OPEN: {
        TicketStatus.WAITING_FOR_USER,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
    },
    TicketStatus.WAITING_FOR_USER: {
        TicketStatus.OPEN,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
    },
    TicketStatus.RESOLVED: {
        TicketStatus.OPEN,
        TicketStatus.CLOSED,
    },
    TicketStatus.CLOSED: {TicketStatus.OPEN},
}


def is_support_user(user) -> bool:
    return bool(
        user.is_authenticated
        and (user.is_superuser or user_in_group(user, "support"))
    )


@transaction.atomic
def create_ticket(*, requester, subject: str, priority: str, body: str) -> Ticket:
    ticket = Ticket.objects.create(
        requester=requester,
        subject=subject.strip(),
        priority=priority,
    )
    TicketMessage.objects.create(
        ticket=ticket,
        sender=requester,
        body=body.strip(),
        is_internal_note=False,
    )

    transaction.on_commit(
        lambda: ticket_created.send(
            sender=Ticket,
            ticket_id=ticket.pk,
            requester_id=requester.pk,
        )
    )
    return ticket


@transaction.atomic
def add_ticket_message(
    *,
    ticket: Ticket,
    sender,
    body: str,
    is_internal_note: bool,
) -> TicketMessage:
    locked_ticket = (
        Ticket.objects.select_for_update(of=("self",))
        .select_related("requester", "assigned_to")
        .get(pk=ticket.pk)
    )
    sender_is_support = is_support_user(sender)

    if not sender_is_support and locked_ticket.requester_id != sender.pk:
        raise PermissionDenied("You do not have access to this ticket.")

    if is_internal_note and not sender_is_support:
        raise PermissionDenied("Only support staff can add internal notes.")

    message = TicketMessage.objects.create(
        ticket=locked_ticket,
        sender=sender,
        body=body.strip(),
        is_internal_note=is_internal_note,
    )

    update_fields = ["updated_at"]
    if sender_is_support:
        if locked_ticket.assigned_to_id is None:
            locked_ticket.assigned_to = sender
            update_fields.append("assigned_to")
        if not is_internal_note:
            locked_ticket.status = TicketStatus.WAITING_FOR_USER
            locked_ticket.closed_at = None
            update_fields.extend(["status", "closed_at"])
    else:
        if locked_ticket.status in {
            TicketStatus.WAITING_FOR_USER,
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
        }:
            locked_ticket.status = TicketStatus.OPEN
            locked_ticket.closed_at = None
            update_fields.extend(["status", "closed_at"])

    locked_ticket.save(update_fields=list(dict.fromkeys(update_fields)))

    transaction.on_commit(
        lambda: ticket_message_added.send(
            sender=TicketMessage,
            ticket_id=locked_ticket.pk,
            message_id=message.pk,
            sender_id=sender.pk,
            requester_id=locked_ticket.requester_id,
            assigned_to_id=locked_ticket.assigned_to_id,
            is_internal_note=is_internal_note,
        )
    )
    return message


@transaction.atomic
def change_ticket_status(*, ticket: Ticket, actor, new_status: str) -> Ticket:
    if not is_support_user(actor):
        raise PermissionDenied("Only support staff can change ticket status.")

    locked_ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if new_status == locked_ticket.status:
        raise ValidationError({"status": "The ticket already has this status."})

    allowed_targets = ALLOWED_STATUS_TRANSITIONS.get(locked_ticket.status, set())
    if new_status not in allowed_targets:
        raise ValidationError(
            {
                "status": (
                    f"Transition from '{locked_ticket.status}' to '{new_status}' "
                    "is not allowed."
                )
            }
        )

    previous_status = locked_ticket.status
    locked_ticket.status = new_status
    locked_ticket.closed_at = (
        timezone.now() if new_status == TicketStatus.CLOSED else None
    )
    locked_ticket.save(update_fields=["status", "closed_at", "updated_at"])

    transaction.on_commit(
        lambda: ticket_status_changed.send(
            sender=Ticket,
            ticket_id=locked_ticket.pk,
            actor_id=actor.pk,
            previous_status=previous_status,
            new_status=new_status,
            requester_id=locked_ticket.requester_id,
        )
    )
    return locked_ticket


@transaction.atomic
def assign_ticket(*, ticket: Ticket, actor, assignee) -> Ticket:
    if not is_support_user(actor):
        raise PermissionDenied("Only support staff can assign tickets.")
    if assignee is not None and not is_support_user(assignee):
        raise ValidationError(
            {"assignedSupportUserId": "Tickets can only be assigned to support staff."}
        )

    locked_ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    locked_ticket.assigned_to = assignee
    locked_ticket.save(update_fields=["assigned_to", "updated_at"])
    return locked_ticket
