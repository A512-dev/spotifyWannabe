from __future__ import annotations

from rest_framework.permissions import BasePermission


def user_in_group(user: object, group_name: str) -> bool:
    return bool(
        getattr(user, "is_authenticated", False)
        and getattr(user, "groups").filter(name=group_name).exists()
    )


class IsAdministrator(BasePermission):
    message = "Administrator access is required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user.is_authenticated and user.is_superuser)


class IsSupportAgent(BasePermission):
    message = "Support access is required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user.is_authenticated
            and (user.is_superuser or user_in_group(user, "support"))
        )


class IsSupportOrAdministrator(IsSupportAgent):
    pass


class IsApprovedArtist(BasePermission):
    message = "An approved artist account is required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False

        artist_profile = getattr(user, "artist_profile", None)
        return bool(artist_profile and artist_profile.is_approved)
