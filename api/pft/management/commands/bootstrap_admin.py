import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Create the initial superuser from FINTRACK_ADMIN_EMAIL and "
        "FINTRACK_ADMIN_PASSWORD. Does nothing if the account already exists."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default=os.getenv("FINTRACK_ADMIN_EMAIL"),
            help="Admin email. Defaults to $FINTRACK_ADMIN_EMAIL.",
        )
        parser.add_argument(
            "--password",
            default=os.getenv("FINTRACK_ADMIN_PASSWORD"),
            help="Admin password. Defaults to $FINTRACK_ADMIN_PASSWORD.",
        )

    def handle(self, *args, **options):
        email = (options.get("email") or "").strip()
        password = options.get("password") or ""

        if not email or not password:
            raise CommandError(
                "Both FINTRACK_ADMIN_EMAIL and FINTRACK_ADMIN_PASSWORD must be set "
                "(or pass --email and --password)."
            )

        user_model = get_user_model()

        if user_model.objects.filter(email__iexact=email).exists():
            self.stdout.write(
                self.style.WARNING(f"Admin {email} already exists - leaving it untouched.")
            )
            return

        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError(
                "Refusing to create an admin with a weak password:\n  - "
                + "\n  - ".join(exc.messages)
            ) from exc

        user_model.objects.create_superuser(email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Created admin {email}."))
