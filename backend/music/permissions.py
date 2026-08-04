from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsOwnerArtistOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        profile = getattr(request.user, "artist_profile", None)
        return bool(request.user.is_superuser or (profile and profile.is_approved))

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        profile = getattr(request.user, "artist_profile", None)
        return bool(request.user.is_superuser or (profile and profile.pk == obj.artist_id))
