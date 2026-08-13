from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .audit_views import AuditLogViewSet
from .org_views import OrganizationViewSet
from .routers import router
from .views import (
    ChangePasswordView,
    DeleteAccountView,
    MeView,
    RegisterUserAPIView,
    UpdateProfileView,
)

org_router = DefaultRouter()
org_router.register("orgs", OrganizationViewSet, basename="org")
org_router.register("audit-log", AuditLogViewSet, basename="audit-log")

app_name = "pft"

urlpatterns = [
    path("", include(router.urls)),
    path("", include(org_router.urls)),
    path("register/", RegisterUserAPIView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/update/", UpdateProfileView.as_view(), name="update-profile"),
    path(
        "profile/change-password/", ChangePasswordView.as_view(), name="change-password"
    ),
    path("profile/delete-account/", DeleteAccountView.as_view(), name="delete-account"),
]
