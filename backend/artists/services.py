from __future__ import annotations

from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from artists.models import ArtistApplication, ArtistApplicationStatus, ArtistProfile
from artists.signals import artist_application_reviewed


@transaction.atomic
def review_artist_application(
    *,
    application: ArtistApplication,
    reviewer,
    decision: str,
    review_note: str,
) -> ArtistApplication:
    locked_application = (
        ArtistApplication.objects.select_related("applicant")
        .select_for_update(of=("self",))
        .get(pk=application.pk)
    )

    if locked_application.status != ArtistApplicationStatus.PENDING:
        raise ValidationError(
            {"application": "Only pending artist applications can be reviewed."}
        )

    normalized_note = review_note.strip()
    if decision == ArtistApplicationStatus.REJECTED and not normalized_note:
        raise ValidationError({"reviewNote": "A clear rejection reason is required."})

    locked_application.status = decision
    locked_application.review_note = normalized_note
    locked_application.reviewed_by = reviewer
    locked_application.reviewed_at = timezone.now()
    locked_application.save(
        update_fields=[
            "status",
            "review_note",
            "reviewed_by",
            "reviewed_at",
            "updated_at",
        ]
    )

    if decision == ArtistApplicationStatus.APPROVED:
        artist_profile, _ = ArtistProfile.objects.update_or_create(
            user=locked_application.applicant,
            defaults={
                "stage_name": locked_application.stage_name,
                "is_approved": True,
                "verified_at": locked_application.reviewed_at,
                "verified_by": reviewer,
            },
        )
        if not artist_profile.bio and locked_application.portfolio_description:
            artist_profile.bio = locked_application.portfolio_description.strip()
            artist_profile.save(update_fields=["bio", "updated_at"])
        artist_group, _ = Group.objects.get_or_create(name="artist")
        locked_application.applicant.groups.add(artist_group)

    transaction.on_commit(
        lambda: artist_application_reviewed.send(
            sender=ArtistApplication,
            application_id=locked_application.pk,
            recipient_id=locked_application.applicant_id,
            decision=decision,
            review_note=normalized_note,
        )
    )

    return locked_application
