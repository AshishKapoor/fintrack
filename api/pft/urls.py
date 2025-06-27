from django.urls import path, include
from .routers import router
from .views import (
    RegisterUserAPIView,
    MeView,
    UpdateProfileView,
    ChangePasswordView,
)

app_name = "pft"

urlpatterns = [
    path("", include(router.urls)),
    path("register/", RegisterUserAPIView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/update/", UpdateProfileView.as_view(), name="update-profile"),
    path("profile/change-password/", ChangePasswordView.as_view(), name="change-password"),
]
