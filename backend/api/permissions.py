"""
Role-based permissions, inferred from the 'Role' column on the Users sheet
(Manager / Technologist). Confirm exact rules with stakeholders before
relying on this in production — this is a reasonable starting point.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


def _role(request):
    profile = getattr(request.user, "staff_profile", None)
    return profile.role if profile else None


class IsManager(BasePermission):
    """Full access for Managers; read-only for everyone else."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return _role(request) in ("Manager", "Admin")


class IsManagerOrReadOnlyForOwnEntries(BasePermission):
    """
    Managers can edit anything. Technologists may create receipts/dispenses
    but not edit or delete records created by others.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if _role(request) in ("Manager", "Admin"):
            return True
        created_by = getattr(obj, "created_by", None)
        profile = getattr(request.user, "staff_profile", None)
        return created_by is not None and profile is not None and created_by.id == profile.id