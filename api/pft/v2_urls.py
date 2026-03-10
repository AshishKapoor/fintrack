from django.urls import include, path

from .v2_routers import router

app_name = "pft-v2"

urlpatterns = [
    path("", include(router.urls)),
]
