from django.urls import include, path

from .finance_routers import router

app_name = "pft-finance"

urlpatterns = [
    path("", include(router.urls)),
]
