from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from accounts.models import UserFollow, UserProfile
from artists.models import ArtistApplication, ArtistSampleWork
from artists.signals import artist_application_submitted
from artists.serializers import ALLOWED_SAMPLE_EXTENSIONS, MAX_SAMPLE_FILE_SIZE

User = get_user_model()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_new_password(password: str, user=None) -> None:
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise ValidationError({"password": list(exc.messages)}) from exc


@transaction.atomic
def register_listener(*, display_name: str, email: str, password: str, birth_date, gender):
    normalized_email = normalize_email(email)
    if User.objects.filter(email__iexact=normalized_email).exists():
        raise ValidationError({"email": "An account with this email already exists."})

    username_seed = normalized_email.split("@", 1)[0] or "listener"
    username = username_seed
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{username_seed}{suffix}"

    user = User(username=username, email=normalized_email)
    user.first_name = display_name.strip()[:150]
    validate_new_password(password, user=user)
    user.set_password(password)
    user.save()
    # The post-save receiver has already created and cached this one-to-one
    # profile on ``user``. Mutating that instance keeps the immediate
    # registration response consistent with later profile reads.
    profile = user.profile
    profile.display_name = display_name.strip()
    profile.birth_date = birth_date
    profile.gender = gender
    profile.save(update_fields=["display_name", "birth_date", "gender", "updated_at"])
    listener_group, _ = Group.objects.get_or_create(name="listener")
    user.groups.add(listener_group)
    return user


@transaction.atomic
def register_artist(
    *,
    stage_name: str,
    email: str,
    password: str,
    portfolio_description: str,
    sample_files: list,
    sample_links: list[str],
):
    if not sample_files and not sample_links:
        raise ValidationError({"samples": "At least one portfolio sample is required."})

    for sample_file in sample_files:
        suffix = Path(sample_file.name).suffix.lower()
        if suffix not in ALLOWED_SAMPLE_EXTENSIONS:
            raise ValidationError({"sampleFiles": f"Unsupported sample file type: {suffix or 'unknown'}."})
        if sample_file.size > MAX_SAMPLE_FILE_SIZE:
            raise ValidationError({"sampleFiles": "Each sample file must be 50 MB or smaller."})

    user = register_listener(
        display_name=stage_name,
        email=email,
        password=password,
        birth_date=None,
        gender="prefer_not_to_say",
    )
    application = ArtistApplication.objects.create(
        applicant=user,
        stage_name=stage_name.strip(),
        portfolio_description=portfolio_description.strip(),
    )
    for sample_file in sample_files:
        ArtistSampleWork.objects.create(
            application=application,
            title=(Path(sample_file.name).stem or "Uploaded sample")[:180],
            file=sample_file,
        )
    for sample_url in sample_links:
        parsed = urlparse(sample_url)
        title = Path(parsed.path).name or parsed.netloc or "Portfolio link"
        ArtistSampleWork.objects.create(
            application=application,
            title=title[:180],
            file=None,
            external_url=sample_url,
        )
    transaction.on_commit(
        lambda: artist_application_submitted.send(
            sender=ArtistApplication,
            application_id=application.pk,
            applicant_id=user.pk,
            stage_name=application.stage_name,
        )
    )
    return user, application


def login_user(*, email: str, password: str):
    normalized_email = normalize_email(email)
    user = User.objects.filter(email__iexact=normalized_email).first()
    if user is None:
        raise AuthenticationFailed("Invalid email or password.")
    authenticated = authenticate(username=user.get_username(), password=password)
    if authenticated is None or not authenticated.is_active:
        raise AuthenticationFailed("Invalid email or password.")
    token, _ = Token.objects.get_or_create(user=authenticated)
    return authenticated, token


def logout_user(*, user) -> None:
    Token.objects.filter(user=user).delete()


@transaction.atomic
def deactivate_user_account(*, user) -> None:
    """Anonymize and deactivate an account while retaining protected audit rows.

    Payment and support-message records intentionally use PROTECT. Hard deletion
    would either fail or destroy required accounting history, so account deletion
    is implemented as an irreversible soft deletion with PII removal.
    """
    locked_user = (
        User.objects.select_for_update(of=("self",))
        .select_related("profile")
        .get(pk=user.pk)
    )
    logout_user(user=locked_user)

    UserFollow.objects.filter(follower=locked_user).delete()
    UserFollow.objects.filter(following=locked_user).delete()
    locked_user.notifications.all().delete()

    profile = locked_user.profile
    if profile.avatar:
        profile.avatar.delete(save=False)
    profile.display_name = "Deleted user"
    profile.birth_date = None
    profile.gender = "prefer_not_to_say"
    profile.avatar = None
    profile.save(
        update_fields=["display_name", "birth_date", "gender", "avatar", "updated_at"]
    )

    artist_profile = getattr(locked_user, "artist_profile", None)
    if artist_profile is not None:
        if artist_profile.profile_image:
            artist_profile.profile_image.delete(save=False)
        if artist_profile.banner_image:
            artist_profile.banner_image.delete(save=False)
        artist_profile.stage_name = "Deleted artist"
        artist_profile.bio = ""
        artist_profile.genre_tags = []
        artist_profile.profile_image = None
        artist_profile.banner_image = None
        artist_profile.is_approved = False
        artist_profile.save(
            update_fields=[
                "stage_name",
                "bio",
                "genre_tags",
                "profile_image",
                "banner_image",
                "is_approved",
                "updated_at",
            ]
        )

    for sample in ArtistSampleWork.objects.filter(application__applicant=locked_user):
        if sample.file:
            sample.file.delete(save=False)
    ArtistApplication.objects.filter(applicant=locked_user).delete()

    suffix = str(locked_user.pk).replace("-", "")
    locked_user.username = f"deleted_{suffix}"[:150]
    locked_user.email = f"deleted+{suffix}@invalid.local"
    locked_user.first_name = ""
    locked_user.last_name = ""
    locked_user.is_active = False
    locked_user.set_unusable_password()
    locked_user.save(
        update_fields=[
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "password",
        ]
    )
