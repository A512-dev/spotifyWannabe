from __future__ import annotations

from django.contrib.auth import get_user_model
from django.dispatch import receiver

from artists.signals import artist_application_reviewed
from common.permissions import user_in_group
from notifications.models import NotificationType
from notifications.services import create_notification
from reports.signals import artist_revenue_record_created, artist_revenue_record_settled
from support.signals import ticket_created, ticket_message_added, ticket_status_changed

User = get_user_model()


@receiver(artist_application_reviewed)
def notify_artist_application_result(sender, recipient_id, decision, review_note, application_id, **kwargs):
    title = "Artist application approved" if decision == "approved" else "Artist application rejected"
    message = "Your artist account is now active." if decision == "approved" else f"Reason: {review_note}"
    create_notification(
        recipient_id=recipient_id,
        type=NotificationType.ARTIST,
        title=title,
        message=message,
        action_href="/artist-dashboard" if decision == "approved" else "/notifications",
    )


@receiver(ticket_created)
def notify_support_about_ticket(sender, ticket_id, requester_id, **kwargs):
    support_users = User.objects.filter(is_active=True).filter(
        models_q(is_superuser=True) | models_q(groups__name="support")
    ).distinct()
    for user in support_users:
        create_notification(
            recipient_id=user.pk,
            type=NotificationType.SUPPORT,
            title="New support ticket",
            message="A new ticket is waiting for review.",
            action_href=f"/support?ticket={ticket_id}",
        )


@receiver(ticket_message_added)
def notify_ticket_message(sender, ticket_id, sender_id, requester_id, assigned_to_id, is_internal_note, **kwargs):
    if is_internal_note:
        return
    recipient_id = requester_id if sender_id != requester_id else assigned_to_id
    if recipient_id:
        create_notification(
            recipient_id=recipient_id,
            type=NotificationType.SUPPORT,
            title="New ticket message",
            message="A new message was added to your support ticket.",
            action_href=f"/support?ticket={ticket_id}",
        )


@receiver(ticket_status_changed)
def notify_ticket_status(sender, ticket_id, requester_id, new_status, **kwargs):
    create_notification(
        recipient_id=requester_id,
        type=NotificationType.SUPPORT,
        title="Ticket status changed",
        message=f"Your support ticket is now {new_status.replace('_', ' ')}.",
        action_href=f"/support?ticket={ticket_id}",
    )


@receiver(artist_revenue_record_created)
def notify_artist_revenue(sender, record_id, artist_user_id, **kwargs):
    create_notification(
        recipient_id=artist_user_id,
        type=NotificationType.BILLING,
        title="Monthly revenue calculated",
        message="Your latest monthly accounting record is available.",
        action_href="/artist-dashboard",
    )


@receiver(artist_revenue_record_settled)
def notify_artist_settlement(sender, record_id, artist_user_id, **kwargs):
    create_notification(
        recipient_id=artist_user_id,
        type=NotificationType.BILLING,
        title="Artist payout settled",
        message="Your accounting record has been marked as settled.",
        action_href="/artist-dashboard",
    )


def models_q(**kwargs):
    from django.db.models import Q
    return Q(**kwargs)


from music.signals import track_published


@receiver(track_published)
def notify_artist_followers_about_release(
    sender,
    track_id,
    artist_user_id,
    artist_name,
    track_title,
    **kwargs,
):
    from accounts.models import UserFollow

    follower_ids = UserFollow.objects.filter(following_id=artist_user_id).values_list(
        "follower_id", flat=True
    )
    for follower_id in follower_ids.iterator():
        create_notification(
            recipient_id=follower_id,
            type=NotificationType.ARTIST,
            title=f"New release from {artist_name}",
            message=f"{track_title} is now available.",
            action_href=f"/music?track={track_id}",
        )
