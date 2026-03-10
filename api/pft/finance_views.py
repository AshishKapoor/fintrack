from datetime import date

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Account,
    BudgetFile,
    BudgetMonth,
    CategoryGroupV2,
    CategoryV2,
    EncryptedBackupBundle,
    EnvelopeAssignment,
    ExportJob,
    ImportJob,
    LedgerPosting,
    LedgerTransaction,
    Payee,
    SavedReport,
    ScheduledTransaction,
    Tag,
    TransactionEvent,
    TransactionRule,
)
from .finance_serializers import (
    AccountSerializer,
    BudgetFileSerializer,
    BudgetMonthSerializer,
    CategoryGroupV2Serializer,
    CategoryV2Serializer,
    EncryptedBackupBundleSerializer,
    EnvelopeAssignmentSerializer,
    ExportJobSerializer,
    ImportJobSerializer,
    LedgerPostingReadSerializer,
    LedgerTransactionSerializer,
    PayeeSerializer,
    SavedReportSerializer,
    ScheduledTransactionSerializer,
    TagSerializer,
    TransactionRuleSerializer,
)
from .finance_services import (
    account_balances,
    apply_rules,
    apply_three_month_average,
    build_envelope_snapshot,
    compute_net_worth,
    copy_budget_month_from_previous,
    decode_export_job_content,
    execute_import_job,
    materialize_scheduled_transaction,
    preview_import_job,
    run_export_job,
    run_report,
    zero_budget_month,
)


class UserScopedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]


class BudgetFileViewSet(UserScopedModelViewSet):
    serializer_class = BudgetFileSerializer

    def get_queryset(self):
        return BudgetFile.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        budget_file = serializer.save(user=self.request.user)
        has_existing_default = BudgetFile.objects.filter(
            user=self.request.user,
            is_default=True,
        ).exclude(id=budget_file.id)
        if budget_file.is_default:
            has_existing_default.update(is_default=False)
        elif not has_existing_default.exists():
            budget_file.is_default = True
            budget_file.save(update_fields=["is_default", "updated_at"])

    @action(detail=True, methods=["post"], url_path="set-default")
    def set_default(self, request, pk=None):
        budget_file = self.get_object()
        BudgetFile.objects.filter(user=request.user, is_default=True).update(is_default=False)
        budget_file.is_default = True
        budget_file.save(update_fields=["is_default", "updated_at"])
        return Response(BudgetFileSerializer(budget_file).data)

    @action(detail=True, methods=["get"], url_path="balances")
    def balances(self, request, pk=None):
        budget_file = self.get_object()
        as_of = request.query_params.get("as_of")
        as_of_date = date.fromisoformat(as_of) if as_of else None
        return Response(
            {
                "as_of": as_of_date.isoformat() if as_of_date else None,
                "accounts": account_balances(budget_file, as_of_date),
                "net_worth": compute_net_worth(budget_file, as_of_date),
            }
        )


class AccountViewSet(UserScopedModelViewSet):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(budget_file__user=self.request.user).order_by("id")


class CategoryGroupViewSet(UserScopedModelViewSet):
    serializer_class = CategoryGroupV2Serializer

    def get_queryset(self):
        queryset = CategoryGroupV2.objects.filter(budget_file__user=self.request.user).order_by(
            "sort_order", "id"
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class CategoryV2ViewSet(UserScopedModelViewSet):
    serializer_class = CategoryV2Serializer

    def get_queryset(self):
        queryset = CategoryV2.objects.filter(budget_file__user=self.request.user).order_by("id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class PayeeViewSet(UserScopedModelViewSet):
    serializer_class = PayeeSerializer

    def get_queryset(self):
        queryset = Payee.objects.filter(budget_file__user=self.request.user).order_by("id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class TagViewSet(UserScopedModelViewSet):
    serializer_class = TagSerializer

    def get_queryset(self):
        queryset = Tag.objects.filter(budget_file__user=self.request.user).order_by("id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class LedgerTransactionViewSet(UserScopedModelViewSet):
    serializer_class = LedgerTransactionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["memo", "payee__name", "match_key"]
    ordering_fields = ["transaction_date", "created_at", "updated_at", "id"]
    ordering = ["-transaction_date", "-id"]

    def get_queryset(self):
        queryset = (
            LedgerTransaction.objects.filter(budget_file__user=self.request.user)
            .select_related("payee")
            .prefetch_related("postings__account", "postings__category", "tags")
            .order_by("-transaction_date", "-id")
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
        end_date = self.request.query_params.get("end_date")
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)
        return queryset

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        ids = request.data.get("ids") or []
        updates = request.data.get("updates") or {}
        if not ids:
            return Response({"detail": "ids is required"}, status=status.HTTP_400_BAD_REQUEST)

        allowed_fields = {"memo", "cleared", "imported", "payee"}
        patch = {k: v for k, v in updates.items() if k in allowed_fields}
        if not patch:
            return Response(
                {"detail": "No supported update fields supplied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = LedgerTransaction.objects.filter(
            id__in=ids,
            budget_file__user=request.user,
        )
        updated_count = queryset.update(**patch, updated_at=timezone.now())

        budget_file_ids = queryset.values_list("budget_file_id", flat=True).distinct()
        for budget_file_id in budget_file_ids:
            TransactionEvent.objects.create(
                budget_file_id=budget_file_id,
                operation=TransactionEvent.OP_BULK_UPDATE,
                payload={"ids": ids, "updates": patch},
            )

        return Response({"updated": updated_count})

    @action(detail=True, methods=["post"], url_path="apply-rules")
    def apply_rules_for_transaction(self, request, pk=None):
        ledger_transaction = self.get_object()
        applied_rules = apply_rules(ledger_transaction)
        return Response({"applied_rule_ids": applied_rules})


class PostingViewSet(UserScopedModelViewSet):
    serializer_class = LedgerPostingReadSerializer
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        queryset = LedgerPosting.objects.filter(
            transaction__budget_file__user=self.request.user
        ).select_related("account", "category", "transaction")
        tx_id = self.request.query_params.get("transaction")
        if tx_id:
            queryset = queryset.filter(transaction_id=tx_id)
        return queryset.order_by("sort_order", "id")


class BudgetMonthViewSet(UserScopedModelViewSet):
    serializer_class = BudgetMonthSerializer

    def get_queryset(self):
        queryset = BudgetMonth.objects.filter(budget_file__user=self.request.user).order_by(
            "-year", "-month", "-id"
        )
        budget_file = self.request.query_params.get("budget_file")
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        if year:
            queryset = queryset.filter(year=year)
        if month:
            queryset = queryset.filter(month=month)
        return queryset

    @action(detail=True, methods=["post"], url_path="copy-previous")
    def copy_previous(self, request, pk=None):
        budget_month = self.get_object()
        count = copy_budget_month_from_previous(budget_month)
        return Response({"copied_assignments": count})

    @action(detail=True, methods=["post"], url_path="zero-out")
    def zero_out(self, request, pk=None):
        budget_month = self.get_object()
        updated = zero_budget_month(budget_month)
        return Response({"updated_assignments": updated})

    @action(detail=True, methods=["post"], url_path="three-month-average")
    def three_month_average(self, request, pk=None):
        budget_month = self.get_object()
        updated = apply_three_month_average(budget_month)
        return Response({"updated_assignments": updated})

    @action(detail=True, methods=["get"], url_path="snapshot")
    def snapshot(self, request, pk=None):
        budget_month = self.get_object()
        payload = build_envelope_snapshot(
            budget_month.budget_file, budget_month.year, budget_month.month
        )
        return Response(payload)


class EnvelopeAssignmentViewSet(UserScopedModelViewSet):
    serializer_class = EnvelopeAssignmentSerializer

    def get_queryset(self):
        queryset = EnvelopeAssignment.objects.filter(
            budget_month__budget_file__user=self.request.user
        ).select_related("budget_month", "category")
        budget_month_id = self.request.query_params.get("budget_month")
        category_id = self.request.query_params.get("category")
        if budget_month_id:
            queryset = queryset.filter(budget_month_id=budget_month_id)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset.order_by("priority", "id")


class ScheduledTransactionViewSet(UserScopedModelViewSet):
    serializer_class = ScheduledTransactionSerializer

    def get_queryset(self):
        queryset = ScheduledTransaction.objects.filter(
            budget_file__user=self.request.user
        ).order_by("next_run_date", "id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset

    @action(detail=False, methods=["post"], url_path="run-due")
    def run_due(self, request):
        run_date_raw = request.data.get("run_date")
        run_date = date.fromisoformat(run_date_raw) if run_date_raw else timezone.now().date()
        due_items = self.get_queryset().filter(is_active=True, next_run_date__lte=run_date)

        created_ids = []
        for schedule in due_items:
            ledger_tx = materialize_scheduled_transaction(schedule)
            created_ids.append(ledger_tx.id)

        return Response({"created_transaction_ids": created_ids})


class TransactionRuleViewSet(UserScopedModelViewSet):
    serializer_class = TransactionRuleSerializer

    def get_queryset(self):
        queryset = TransactionRule.objects.filter(budget_file__user=self.request.user).order_by(
            "priority", "id"
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset

    @action(detail=False, methods=["post"], url_path="apply")
    def apply_for_many(self, request):
        ids = request.data.get("transaction_ids") or []
        if not ids:
            return Response(
                {"detail": "transaction_ids is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        transactions = LedgerTransaction.objects.filter(
            id__in=ids, budget_file__user=request.user
        ).order_by("id")

        results = []
        for tx in transactions:
            results.append({"transaction_id": tx.id, "applied": apply_rules(tx)})

        return Response({"results": results})


class ReportViewSet(UserScopedModelViewSet):
    serializer_class = SavedReportSerializer

    def get_queryset(self):
        queryset = SavedReport.objects.filter(budget_file__user=self.request.user).order_by(
            "-updated_at", "-id"
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        pinned = self.request.query_params.get("pinned")
        if pinned is not None:
            queryset = queryset.filter(pinned=pinned.lower() == "true")
        return queryset

    @action(detail=False, methods=["post"], url_path="run")
    def run_adhoc(self, request):
        budget_file_id = request.data.get("budget_file")
        if not budget_file_id:
            return Response(
                {"detail": "budget_file is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        budget_file = BudgetFile.objects.filter(
            id=budget_file_id, user=request.user
        ).first()
        if not budget_file:
            return Response({"detail": "Budget file not found"}, status=404)

        result = run_report(budget_file, request.data)
        return Response(result)

    @action(detail=True, methods=["post"], url_path="run")
    def run_saved(self, request, pk=None):
        saved_report = self.get_object()
        payload = dict(saved_report.definition or {})
        payload["report_type"] = saved_report.report_type
        result = run_report(saved_report.budget_file, payload)
        return Response(result)


class ExportJobViewSet(UserScopedModelViewSet):
    serializer_class = ExportJobSerializer

    def get_queryset(self):
        return ExportJob.objects.filter(budget_file__user=self.request.user).order_by(
            "-created_at", "-id"
        )

    def perform_create(self, serializer):
        export_job = serializer.save(requested_by=self.request.user)
        run_export_job(export_job)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        export_job = self.get_object()
        if export_job.status != ExportJob.STATUS_COMPLETED:
            return Response(
                {"detail": "Export job is not complete"},
                status=status.HTTP_409_CONFLICT,
            )

        payload = decode_export_job_content(export_job)
        content_type = {
            ExportJob.FORMAT_CSV: "text/csv",
            ExportJob.FORMAT_JSON: "application/json",
            ExportJob.FORMAT_XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }[export_job.format]

        response = HttpResponse(payload, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{export_job.file_name}"'
        return response


class BackupBundleViewSet(UserScopedModelViewSet):
    serializer_class = EncryptedBackupBundleSerializer

    def get_queryset(self):
        return EncryptedBackupBundle.objects.filter(
            budget_file__user=self.request.user
        ).order_by("-created_at", "-id")

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="latest")
    def latest(self, request):
        budget_file_id = request.query_params.get("budget_file")
        if not budget_file_id:
            return Response(
                {"detail": "budget_file query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bundle = self.get_queryset().filter(budget_file_id=budget_file_id).first()
        if not bundle:
            return Response({"detail": "Backup not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(self.get_serializer(bundle).data)


class ImportJobViewSet(UserScopedModelViewSet):
    serializer_class = ImportJobSerializer

    def get_queryset(self):
        return ImportJob.objects.filter(budget_file__user=self.request.user).order_by(
            "-created_at", "-id"
        )

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="preview")
    def preview(self, request, pk=None):
        import_job = self.get_object()
        summary = preview_import_job(import_job)
        return Response(summary)

    @action(detail=True, methods=["post"], url_path="execute")
    def execute(self, request, pk=None):
        import_job = self.get_object()
        result = execute_import_job(import_job)
        return Response(result)
