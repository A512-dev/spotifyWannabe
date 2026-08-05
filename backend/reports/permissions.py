from __future__ import annotations

from rest_framework.permissions import BasePermission

class CanViewOperationalReports(BasePermission):
    message = "An approved artist or administrator account is required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        artist_profile = getattr(user, "artist_profile", None)
        return bool(artist_profile and artist_profile.is_approved)
