from django.apps import AppConfig


class PftConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "pft"

    def ready(self):
        # Imported for its side effects: registers the post_save receiver that
        # seeds a new user's default budget file, account and categories.
        from . import signals  # noqa: F401
