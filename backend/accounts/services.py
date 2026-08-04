from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from accounts.models import UserProfile
from artists.models import ArtistApplication, ArtistSampleWork
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
    UserProfile.objects.filter(user=user).update(
        display_name=display_name.strip(),
        birth_date=birth_date,
        gender=gender,
    )
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
            external_url=sample_url,
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
    authenticated.last_login = timezone.now()
    authenticated.save(update_fields=["last_login"])
    token, _ = Token.objects.get_or_create(user=authenticated)
    return authenticated, token


def logout_user(*, user) -> None:
    Token.objects.filter(user=user).delete()
