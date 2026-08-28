from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from pft.models import AuditLog, ExportJob, ImportJob


class Command(BaseCommand):
    help = (
        "Clear stored payloads from finished import/export jobs older than the "
        "retention window. These fields hold plaintext financial data."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=settings.FINTRACK_JOB_RETENTION_DAYS,
            help="Retention window in days (default: FINTRACK_JOB_RETENTION_DAYS).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be cleared without writing.",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timezone.timedelta(days=days)

        stale_imports = ImportJob.objects.filter(created_at__lt=cutoff).exclude(
            source_payload=""
        )
        stale_exports = ExportJob.objects.filter(created_at__lt=cutoff).exclude(
            content_text="", content_b64=""
        )

        import_count = stale_imports.count()
        export_count = stale_exports.count()

        if dry_run:
            self.stdout.write(
                f"Would clear {import_count} import payload(s) and "
                f"{export_count} export payload(s) older than {days} days."
            )
            return

        stale_imports.update(source_payload="")
        stale_exports.update(content_text="", content_b64="")

        audit_days = max(days, 365)  # audit history keeps at least a year
        audit_cutoff = timezone.now() - timezone.timedelta(days=audit_days)
        pruned_audit = AuditLog.objects.filter(created_at__lt=audit_cutoff).delete()[0]
        if pruned_audit:
            self.stdout.write(
                f"Pruned {pruned_audit} audit entries older than {audit_days} days."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleared {import_count} import payload(s) and "
                f"{export_count} export payload(s) older than {days} days."
            )
        )
