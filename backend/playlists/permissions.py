from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsPlaylistOwnerOrPublicReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return bool(obj.is_public or obj.owner_id == request.user.pk or request.user.is_superuser)
        return bool(obj.owner_id == request.user.pk or request.user.is_superuser)
