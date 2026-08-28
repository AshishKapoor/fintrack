from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .audit_views import AuditLogViewSet
from .org_views import OrganizationViewSet
from .views import (
    ChangePasswordView,
    DeleteAccountView,
    MeView,
    NotificationPreferenceView,
    NotificationTestView,
    RegisterUserAPIView,
    UpdateProfileView,
)

router = DefaultRouter()
router.register("orgs", OrganizationViewSet, basename="org")
router.register("audit-log", AuditLogViewSet, basename="audit-log")

app_name = "pft"

urlpatterns = [
    path("", include(router.urls)),
    path("register/", RegisterUserAPIView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/update/", UpdateProfileView.as_view(), name="update-profile"),
    path(
        "profile/change-password/", ChangePasswordView.as_view(), name="change-password"
    ),
    path("profile/delete-account/", DeleteAccountView.as_view(), name="delete-account"),
    path(
        "notifications/preferences/",
        NotificationPreferenceView.as_view(),
        name="notification-preferences",
    ),
    path(
        "notifications/test/", NotificationTestView.as_view(), name="notification-test"
    ),
]
