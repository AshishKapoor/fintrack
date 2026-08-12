from django.urls import include, path

from .routers import router
from .views import (
    ChangePasswordView,
    DeleteAccountView,
    MeView,
    RegisterUserAPIView,
    UpdateProfileView,
)

app_name = "pft"

urlpatterns = [
    path("", include(router.urls)),
    path("register/", RegisterUserAPIView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/update/", UpdateProfileView.as_view(), name="update-profile"),
    path("profile/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("profile/delete-account/", DeleteAccountView.as_view(), name="delete-account"),
]
