from django.apps import AppConfig


class PftConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "pft"

    def ready(self):
        import pft.signals  # noqa: F401  (registers signal handlers)
