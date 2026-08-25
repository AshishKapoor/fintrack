from django.urls import include, path

from .finance_routers import router
from .finance_views import (
    AICategorizationApiKeyView,
    AICategorizationSettingsView,
    AICategorizationTestView,
)

app_name = "pft-finance"

urlpatterns = [
    path("", include(router.urls)),
    path(
        "ai-categorization/settings/",
        AICategorizationSettingsView.as_view(),
        name="ai-categorization-settings",
    ),
    path(
        "ai-categorization/set-api-key/",
        AICategorizationApiKeyView.as_view(),
        name="ai-categorization-set-api-key",
    ),
    path(
        "ai-categorization/test/",
        AICategorizationTestView.as_view(),
        name="ai-categorization-test",
    ),
]
