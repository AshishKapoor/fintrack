from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import TokenRefreshView

from app.health import healthz
from pft.views import LogoutView, ThrottledTokenObtainPairView

urlpatterns = [
    path("healthz/", healthz, name="healthz"),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    path("api/v1/", include(("pft.urls"), namespace="pft")),
    path("api/v1/finance/", include(("pft.finance_urls"), namespace="pft-finance")),
    path(
        "api/token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"
    ),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/logout/", LogoutView.as_view(), name="token_logout"),
]
