from datetime import date
from decimal import Decimal

from django.db.models import Count, Max, Q, Sum, Value
from django.db.models.functions import Abs, Coalesce
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .ai_categorization import suggest_category_via_ai
from .ai_categorization import test_connection as test_ai_categorization_connection
from .audit import record
from .bank_sync import BankSyncError, get_provider, list_providers
from .crypto import encrypt_json
from .finance_serializers import (
    AccountSerializer,
    AICategorizationSettingsSerializer,
    BankSyncInstitutionSerializer,
    BankSyncLinkResultSerializer,
    BankSyncProviderSerializer,
    BankSyncResultSerializer,
    BudgetFileSerializer,
    BudgetMonthSerializer,
    CategoryGroupSerializer,
    CategorySerializer,
    EncryptedBackupBundleSerializer,
    EnvelopeAssignmentSerializer,
    ExportJobSerializer,
    FxRateSerializer,
    FxSyncResultSerializer,
    ImportJobSerializer,
    LedgerPostingReadSerializer,
    LedgerTransactionSerializer,
    PayeeSerializer,
    SavedReportSerializer,
    SavingsGoalSerializer,
    ScheduledTransactionSerializer,
    SuggestedCategorySerializer,
    SyncConnectionAccountSerializer,
    SyncConnectionSerializer,
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
    materialize_due_scheduled_transactions,
    preview_import_job,
    run_report,
    zero_budget_month,
)
from .fx_rates import FxRateError, fetch_and_store_rates
from .models import (
    Account,
    AICategorizationSettings,
    AuditLog,
    BudgetFile,
    BudgetMonth,
    Category,
    CategoryGroup,
    EncryptedBackupBundle,
    EnvelopeAssignment,
    ExportJob,
    FxRate,
    ImportJob,
    LedgerPosting,
    LedgerTransaction,
    Payee,
    SavedReport,
    SavingsGoal,
    ScheduledTransaction,
    SyncConnection,
    SyncConnectionAccount,
    Tag,
    TransactionEvent,
    TransactionRule,
)
from .tasks import (
    execute_import_job_task,
    run_export_job_task,
    sync_bank_connection_task,
)
from .tenancy import (
    budget_file_q,
    can_access,
    default_budget_file,
    personal_organization,
    set_default_budget_file,
)


def parse_iso_date(raw, field_name):
    """Parse a YYYY-MM-DD string, raising a 400 rather than a 500 on garbage."""
    if raw in (None, ""):
        return None
    try:
        return date.fromisoformat(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {field_name: "Expected a date in YYYY-MM-DD format."}
        ) from exc


class UserScopedModelViewSet(viewsets.ModelViewSet):
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.
    """

    permission_classes = [permissions.IsAuthenticated]

    def check_budget_file_writable(self, budget_file):
        if budget_file is None:
            return
        if not can_access(self.request.user, budget_file, write=True):
            raise PermissionDenied("Your role in this organization is read-only.")

    def perform_create(self, serializer):
        instance = serializer.save()
        budget_file = self._budget_file_of(instance)
        self.check_budget_file_writable(budget_file)
        self._audit(AuditLog.ACTION_CREATED, instance, budget_file)

    def perform_update(self, serializer):
        budget_file = self._budget_file_of(serializer.instance)
        self.check_budget_file_writable(budget_file)
        serializer.save()
        self._audit(AuditLog.ACTION_UPDATED, serializer.instance, budget_file)

    def perform_destroy(self, instance):
        budget_file = self._budget_file_of(instance)
        self.check_budget_file_writable(budget_file)
        summary_name = str(instance)
        instance.delete()
        self._audit(
            AuditLog.ACTION_DELETED, instance, budget_file, name_override=summary_name
        )

    def _audit(self, action, instance, budget_file, name_override=None):
        if budget_file is None or budget_file.organization_id is None:
            return
        label = name_override or str(instance)
        record(
            organization=budget_file.organization,
            actor=self.request.user,
            action=action,
            entity=instance,
            summary=f"{action.capitalize()} {type(instance).__name__} {label}"[:255],
        )

    @staticmethod
    def _budget_file_of(instance):
        if isinstance(instance, BudgetFile):
            return instance
        if getattr(instance, "budget_file_id", None) is not None:
            return instance.budget_file
        if getattr(instance, "budget_month_id", None) is not None:
            return instance.budget_month.budget_file
        if getattr(instance, "transaction_id", None) is not None:
            return instance.transaction.budget_file
        if getattr(instance, "connection_id", None) is not None:
            return instance.connection.budget_file
        return None


class BudgetFileViewSet(UserScopedModelViewSet):
    serializer_class = BudgetFileSerializer

    def get_queryset(self):
        return BudgetFile.objects.filter(budget_file_q(self.request.user, prefix='pk')).order_by("id")

    def perform_create(self, serializer):
        organization = serializer.validated_data.get(
            "organization"
        ) or personal_organization(self.request.user)
        wants_default = serializer.validated_data.pop("is_default", False)
        budget_file = serializer.save(
            created_by=self.request.user, organization=organization
        )
        # Either the caller asked for it, or this is the first file they can
        # see in that workspace and something has to be the landing place.
        if wants_default or default_budget_file(self.request.user, organization) is None:
            set_default_budget_file(self.request.user, budget_file)

    @action(detail=True, methods=["post"], url_path="set-default")
    def set_default(self, request, pk=None):
        """Record this file as the caller's default in its workspace.

        Per-caller, not per-file: before `is_default` moved onto Membership,
        this cleared the flag across every budget file the caller could see,
        so one member choosing a default silently changed it for everyone else
        in a shared workspace - and for their other workspaces too.
        """
        budget_file = self.get_object()
        if not set_default_budget_file(request.user, budget_file):
            return Response({"detail": "Budget file not found."}, status=404)
        return Response(
            BudgetFileSerializer(budget_file, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], url_path="balances")
    def balances(self, request, pk=None):
        budget_file = self.get_object()
        as_of_date = parse_iso_date(request.query_params.get("as_of"), "as_of")
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
        return Account.objects.filter(budget_file_q(self.request.user)).order_by(
            "id"
        )


class SavingsGoalViewSet(UserScopedModelViewSet):
    serializer_class = SavingsGoalSerializer

    def get_queryset(self):
        return (
            SavingsGoal.objects.filter(budget_file_q(self.request.user))
            .select_related("account")
            .order_by("-created_at", "-id")
        )


def _budget_file_from_request(request, *, write: bool):
    """Resolve ?budget_file=<id> (GET) or {"budget_file": <id>} (POST) to a
    BudgetFile this user may access, 404ing rather than leaking whether an
    id merely exists versus belongs to someone else - the same shape every
    other finance endpoint's tenant-scoped queryset already gives for free.
    """
    budget_file_id = request.query_params.get("budget_file") or request.data.get("budget_file")
    if not budget_file_id:
        raise ValidationError({"budget_file": "This field is required."})
    return get_object_or_404(
        BudgetFile.objects.filter(budget_file_q(request.user, write=write, prefix="pk")),
        pk=budget_file_id,
    )


class AICategorizationSettingsView(generics.RetrieveUpdateAPIView):
    """One row per budget file, created on first access - mirrors
    NotificationPreferenceView's exact pattern (pft/views.py), scoped to a
    budget file instead of a user since this holds a credential (see the
    model's docstring). GET only needs read access so a viewer can see
    whether it's on; PATCH needs write, checked explicitly since
    RetrieveUpdateAPIView has no perform_update hook of its own to route
    through UserScopedModelViewSet's version.
    """

    serializer_class = AICategorizationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        budget_file = _budget_file_from_request(self.request, write=False)
        settings_obj, _created = AICategorizationSettings.objects.get_or_create(
            budget_file=budget_file
        )
        return settings_obj

    def perform_update(self, serializer):
        if not can_access(self.request.user, serializer.instance.budget_file, write=True):
            raise PermissionDenied("Your role in this organization is read-only.")
        serializer.save()


class AICategorizationApiKeyView(APIView):
    """Write-only: encrypts and stores (or clears, given an empty key) the
    API key. Never returns it - the caller already knows what they just
    typed. Mirrors bank sync's secret_data write path (pft/
    bank_sync_simplefin.py), the same reasoning as AICategorizationSettings'
    own docstring.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        budget_file = _budget_file_from_request(request, write=True)
        settings_obj, _created = AICategorizationSettings.objects.get_or_create(
            budget_file=budget_file
        )
        api_key = (request.data.get("api_key") or "").strip()
        settings_obj.encrypted_api_key = encrypt_json({"api_key": api_key}) if api_key else ""
        settings_obj.save(update_fields=["encrypted_api_key", "updated_at"])
        return Response(AICategorizationSettingsSerializer(settings_obj).data)


class AICategorizationTestView(APIView):
    """Fire a real request now, for the settings UI's "test" button - same
    reasoning as NotificationTestView (pft/views.py) and bank sync's own
    actions for its own scoped throttle.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_categorization"

    def post(self, request):
        budget_file = _budget_file_from_request(request, write=False)
        settings_obj, _created = AICategorizationSettings.objects.get_or_create(
            budget_file=budget_file
        )
        return Response(test_ai_categorization_connection(settings_obj))


class CategoryGroupViewSet(UserScopedModelViewSet):
    serializer_class = CategoryGroupSerializer

    def get_queryset(self):
        queryset = CategoryGroup.objects.filter(budget_file_q(self.request.user)).order_by("sort_order", "id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class CategoryViewSet(UserScopedModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        queryset = Category.objects.filter(budget_file_q(self.request.user)).order_by("id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class PayeeViewSet(UserScopedModelViewSet):
    serializer_class = PayeeSerializer

    def get_queryset(self):
        queryset = Payee.objects.filter(budget_file_q(self.request.user)).order_by(
            "id"
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset

    @extend_schema(responses=SuggestedCategorySerializer)
    @action(detail=True, methods=["get"], url_path="suggested-category")
    def suggested_category(self, request, pk=None):
        """The category most often used with this payee - powers quick-add's
        amount -> payee -> (suggested) category -> done flow (ROADMAP.md
        Phase 1). Ties broken by whichever was used most recently, so a
        payee's habits can drift over time instead of getting stuck on
        whatever was most common historically.

        Falls back to opt-in AI categorization (pft/ai_categorization.py,
        ROADMAP.md Phase 3) only when this payee has no categorized history
        at all - a real transaction history is always the better signal
        when one exists, so AI never overrides or is even consulted once a
        payee has a track record.
        """
        payee = self.get_object()
        row = (
            LedgerPosting.objects.filter(
                transaction__payee=payee,
                category__isnull=False,
            )
            .values("category_id", "category__name")
            .annotate(count=Count("id"), last_used=Max("transaction__transaction_date"))
            .order_by("-count", "-last_used")
            .first()
        )
        if row:
            return Response(
                {
                    "category": row["category_id"],
                    "category_name": row["category__name"],
                    "source": "history",
                }
            )

        ai_settings = AICategorizationSettings.objects.filter(
            budget_file=payee.budget_file, is_enabled=True
        ).first()
        if ai_settings:
            candidates = list(
                Category.objects.filter(
                    budget_file=payee.budget_file, is_archived=False
                ).values("id", "name")
            )
            match = suggest_category_via_ai(ai_settings, payee.name, candidates)
            if match:
                return Response(
                    {"category": match["id"], "category_name": match["name"], "source": "ai"}
                )

        return Response({"category": None, "category_name": "", "source": None})


class TagViewSet(UserScopedModelViewSet):
    serializer_class = TagSerializer

    def get_queryset(self):
        queryset = Tag.objects.filter(budget_file_q(self.request.user)).order_by(
            "id"
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset


class LedgerTransactionPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500


class LedgerTransactionViewSet(UserScopedModelViewSet):
    serializer_class = LedgerTransactionSerializer
    pagination_class = LedgerTransactionPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["memo", "payee__name", "match_key"]
    # `amount` is annotated below: a ledger transaction has no amount column,
    # the figure people mean lives on its category posting.
    ordering_fields = ["transaction_date", "created_at", "updated_at", "id", "amount"]
    ordering = ["-transaction_date", "-id"]

    def get_queryset(self):
        queryset = (
            LedgerTransaction.objects.filter(budget_file_q(self.request.user))
            .select_related("payee")
            .prefetch_related("postings__account", "postings__category", "tags")
            .annotate(
                amount=Abs(
                    Coalesce(
                        Sum(
                            "postings__amount",
                            filter=Q(postings__category__isnull=False),
                        ),
                        Value(Decimal("0.00")),
                    )
                )
            )
            .order_by("-transaction_date", "-id")
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        start_date = parse_iso_date(
            self.request.query_params.get("start_date"), "start_date"
        )
        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
        end_date = parse_iso_date(self.request.query_params.get("end_date"), "end_date")
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)

        # Income and expense are a property of the category on the posting, not
        # of the transaction, so filtering by "type" filters on that category.
        tx_type = self.request.query_params.get("type")
        if tx_type in {Category.KIND_INCOME, Category.KIND_EXPENSE}:
            queryset = queryset.filter(postings__category__kind=tx_type).distinct()

        return queryset

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        ids = request.data.get("ids") or []
        updates = request.data.get("updates") or {}
        if not ids:
            return Response(
                {"detail": "ids is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        allowed_fields = {"memo", "cleared", "imported", "payee"}
        patch = {k: v for k, v in updates.items() if k in allowed_fields}
        if not patch:
            return Response(
                {"detail": "No supported update fields supplied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = LedgerTransaction.objects.filter(
            budget_file_q(request.user),
            id__in=ids
        )

        # `payee` is a raw id from the request body. Without this check a user
        # could attach another tenant's payee to their own transactions.
        if patch.get("payee") is not None:
            owned_payee = Payee.objects.filter(
            budget_file_q(request.user),
            pk=patch["payee"]
        ).exists()
            if not owned_payee:
                return Response(
                    {"detail": "Unknown payee."},
                    status=status.HTTP_400_BAD_REQUEST,
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
            budget_file_q(self.request.user, prefix="transaction__budget_file"),
        ).select_related("account", "category", "transaction")
        tx_id = self.request.query_params.get("transaction")
        if tx_id:
            queryset = queryset.filter(transaction_id=tx_id)
        return queryset.order_by("sort_order", "id")


class BudgetMonthViewSet(UserScopedModelViewSet):
    serializer_class = BudgetMonthSerializer

    def get_queryset(self):
        queryset = BudgetMonth.objects.filter(budget_file_q(self.request.user)).order_by("-year", "-month", "-id")
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
            budget_file_q(self.request.user, prefix="budget_month__budget_file"),
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
        queryset = ScheduledTransaction.objects.filter(budget_file_q(self.request.user)).order_by("next_run_date", "id")
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset

    @action(detail=False, methods=["post"], url_path="run-due")
    def run_due(self, request):
        run_date = (
            parse_iso_date(request.data.get("run_date"), "run_date")
            or timezone.now().date()
        )
        try:
            created_ids, _errors = materialize_due_scheduled_transactions(
                self.get_queryset(), run_date=run_date
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response({"created_transaction_ids": created_ids})


class TransactionRuleViewSet(UserScopedModelViewSet):
    serializer_class = TransactionRuleSerializer

    def get_queryset(self):
        queryset = TransactionRule.objects.filter(budget_file_q(self.request.user)).order_by("priority", "id")
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
            budget_file_q(request.user),
            id__in=ids
        ).order_by("id")

        results = []
        for tx in transactions:
            results.append({"transaction_id": tx.id, "applied": apply_rules(tx)})

        return Response({"results": results})


class ReportViewSet(UserScopedModelViewSet):
    serializer_class = SavedReportSerializer

    def get_queryset(self):
        queryset = SavedReport.objects.filter(budget_file_q(self.request.user)).order_by("-updated_at", "-id")
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
            budget_file_q(request.user, prefix='pk'), id=budget_file_id
        ).first()
        if not budget_file:
            return Response({"detail": "Budget file not found"}, status=404)

        try:
            result = run_report(budget_file, request.data)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(result)

    @action(detail=True, methods=["post"], url_path="run")
    def run_saved(self, request, pk=None):
        saved_report = self.get_object()
        payload = dict(saved_report.definition or {})
        payload["report_type"] = saved_report.report_type
        try:
            result = run_report(saved_report.budget_file, payload)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(result)


class ExportJobViewSet(UserScopedModelViewSet):
    serializer_class = ExportJobSerializer

    def get_queryset(self):
        return ExportJob.objects.filter(budget_file_q(self.request.user)).order_by(
            "-created_at", "-id"
        )

    def perform_create(self, serializer):
        export_job = serializer.save(requested_by=self.request.user)
        # Runs on the worker (or inline when CELERY_TASK_ALWAYS_EAGER). The
        # client polls the job row; download/ answers 409 until completed.
        run_export_job_task.delay(export_job.id)

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
        response["Content-Disposition"] = (
            f'attachment; filename="{export_job.file_name}"'
        )
        return response


class BackupBundleViewSet(UserScopedModelViewSet):
    serializer_class = EncryptedBackupBundleSerializer

    def get_queryset(self):
        return EncryptedBackupBundle.objects.filter(budget_file_q(self.request.user)).order_by("-created_at", "-id")

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
            return Response(
                {"detail": "Backup not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(self.get_serializer(bundle).data)


class ImportJobViewSet(UserScopedModelViewSet):
    serializer_class = ImportJobSerializer

    def get_queryset(self):
        return ImportJob.objects.filter(budget_file_q(self.request.user)).order_by(
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
        """Start the import and return 202; poll the job for the outcome.

        Row-by-row execution is the heavy half of importing (preview is a
        parse-only pass and stays synchronous), so it runs on the worker. The
        job row carries status and, on completion, created/skipped counts in
        preview_summary.
        """
        import_job = self.get_object()
        if import_job.status == ImportJob.STATUS_IMPORTING:
            return Response(
                {"detail": "Import is already running."},
                status=status.HTTP_409_CONFLICT,
            )

        import_job.status = ImportJob.STATUS_IMPORTING
        import_job.save(update_fields=["status", "updated_at"])
        execute_import_job_task.delay(import_job.id)

        import_job.refresh_from_db()
        return Response(
            self.get_serializer(import_job).data, status=status.HTTP_202_ACCEPTED
        )


class SyncConnectionViewSet(UserScopedModelViewSet):
    """Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same "guarded by construction" property notifications and
    imports already get for free.
    """

    serializer_class = SyncConnectionSerializer

    def get_queryset(self):
        queryset = (
            SyncConnection.objects.filter(budget_file_q(self.request.user))
            .select_related("budget_file")
            .prefetch_related("linked_accounts", "linked_accounts__account")
        )
        budget_file = self.request.query_params.get("budget_file")
        if budget_file:
            queryset = queryset.filter(budget_file_id=budget_file)
        return queryset

    def get_throttles(self):
        # Every one of these makes the server issue outbound HTTP requests
        # (to GoCardless, or to a URL derived from user input for SimpleFIN)
        # on the caller's behalf - the same reasoning as NotificationTestView,
        # worth its own modest cap independent of the general "user" rate.
        if self.action in {"link", "callback", "sync", "institutions"}:
            self.throttle_scope = "bank_sync"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    @extend_schema(responses=BankSyncProviderSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="providers")
    def providers(self, request):
        return Response(
            [
                {"key": p.key, "label": p.label, "configured": p.is_configured()}
                for p in list_providers()
            ]
        )

    @extend_schema(responses=BankSyncInstitutionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="institutions")
    def institutions(self, request):
        provider_key = request.query_params.get("provider")
        country = request.query_params.get("country", "")
        if not provider_key:
            return Response({"detail": "provider is required."}, status=400)
        try:
            provider = get_provider(provider_key)
            institutions = provider.list_institutions(country=country)
        except BankSyncError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(
            [{"id": i.id, "name": i.name, "logo": i.logo} for i in institutions]
        )

    @extend_schema(responses=BankSyncLinkResultSerializer)
    @action(detail=True, methods=["post"], url_path="link")
    def link(self, request, pk=None):
        connection = self.get_object()
        self.check_budget_file_writable(connection.budget_file)
        try:
            provider = get_provider(connection.provider)
            result = provider.start_link(connection, request.data)
        except BankSyncError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(result)

    @extend_schema(request=None, responses=SyncConnectionSerializer)
    @action(detail=True, methods=["post"], url_path="callback")
    def callback(self, request, pk=None):
        """Finish linking after the user returns from the provider's own
        auth page (GoCardless), then discover the institution's accounts as
        unmapped SyncConnectionAccount rows for the user to map. A no-op
        first step for providers whose start_link already finishes (SimpleFIN)
        - the frontend calls this unconditionally after any link attempt.
        """
        connection = self.get_object()
        self.check_budget_file_writable(connection.budget_file)
        try:
            provider = get_provider(connection.provider)
            provider.finish_link(connection, request.data)
            for discovered in provider.list_accounts(connection):
                SyncConnectionAccount.objects.update_or_create(
                    connection=connection,
                    external_account_id=discovered.external_id,
                    defaults={
                        "display_name": discovered.name,
                        "currency_code": discovered.currency_code,
                        "iban": discovered.iban,
                        "raw_metadata": discovered.raw,
                    },
                )
        except BankSyncError as exc:
            connection.status = SyncConnection.STATUS_ERROR
            connection.last_error = str(exc)[:2000]
            connection.save(update_fields=["status", "last_error", "updated_at"])
            return Response({"detail": str(exc)}, status=400)

        connection.refresh_from_db()
        return Response(self.get_serializer(connection).data)

    @extend_schema(request=None, responses=BankSyncResultSerializer)
    @action(detail=True, methods=["post"], url_path="sync")
    def sync(self, request, pk=None):
        connection = self.get_object()
        self.check_budget_file_writable(connection.budget_file)
        if connection.status != SyncConnection.STATUS_ACTIVE:
            return Response(
                {"detail": f"Connection is not active (status: {connection.status})."},
                status=status.HTTP_409_CONFLICT,
            )
        # Synchronous like preview_import_job, not polled like import
        # execute(): a sync touches a handful of accounts against a fast
        # JSON API, not a user-uploaded statement that can run to thousands
        # of rows. CELERY_TASK_ALWAYS_EAGER still makes this run inline
        # under the test suite / bare-metal installs with no Redis.
        sync_bank_connection_task.delay(connection.id)
        connection.refresh_from_db()
        return Response(self.get_serializer(connection).data)

    @extend_schema(request=None, responses=SyncConnectionSerializer)
    @action(detail=True, methods=["post"], url_path="disconnect")
    def disconnect(self, request, pk=None):
        """Revoke access and stop syncing, but keep the connection (and every
        transaction it already created) as history - the same soft-state
        preference as Account.is_archived rather than a hard delete. A plain
        DELETE on this connection is still available for anyone who wants it
        gone entirely.
        """
        connection = self.get_object()
        self.check_budget_file_writable(connection.budget_file)
        try:
            get_provider(connection.provider).disconnect(connection)
        except BankSyncError:
            pass  # best-effort - the local connection is revoked regardless
        connection.status = SyncConnection.STATUS_REVOKED
        connection.secret_data = ""
        connection.save(update_fields=["status", "secret_data", "updated_at"])
        return Response(self.get_serializer(connection).data)


class SyncConnectionAccountViewSet(UserScopedModelViewSet):
    serializer_class = SyncConnectionAccountSerializer
    http_method_names = ["get", "head", "options", "post", "delete"]

    def get_queryset(self):
        queryset = SyncConnectionAccount.objects.filter(
            budget_file_q(self.request.user, prefix="connection__budget_file"),
        ).select_related("connection", "account")
        connection_id = self.request.query_params.get("connection")
        if connection_id:
            queryset = queryset.filter(connection_id=connection_id)
        return queryset.order_by("id")

    def create(self, request, *args, **kwargs):
        # Rows are only ever created by SyncConnectionViewSet.callback
        # discovering accounts, never posted directly by a client.
        return Response(
            {"detail": "Not supported - accounts are discovered via connection callback."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="map")
    def map_account(self, request, pk=None):
        """Point this discovered provider account at a FinTrack Account -
        either an existing one (`account_id`) or a new one created on the
        spot (`create_account: {name?, type?}`, currency defaulting to
        whatever the provider reported for this account).
        """
        linked = self.get_object()
        self.check_budget_file_writable(linked.connection.budget_file)
        budget_file = linked.connection.budget_file

        account_id = request.data.get("account_id")
        create_account = request.data.get("create_account")

        if account_id:
            account = Account.objects.filter(
                budget_file_q(request.user, write=True), pk=account_id
            ).first()
            if not account or account.budget_file_id != budget_file.id:
                return Response({"detail": "Unknown account."}, status=400)
        elif create_account is not None:
            account = Account.objects.create(
                budget_file=budget_file,
                name=(create_account.get("name") or linked.display_name or linked.external_account_id)[:120],
                type=create_account.get("type") or Account.TYPE_CHECKING,
                currency_code=linked.currency_code or budget_file.currency_code,
            )
            self._audit(AuditLog.ACTION_CREATED, account, budget_file)
        else:
            return Response(
                {"detail": "account_id or create_account is required."}, status=400
            )

        linked.account = account
        linked.save(update_fields=["account", "updated_at"])
        return Response(self.get_serializer(linked).data)


class FxRateViewSet(viewsets.ReadOnlyModelViewSet):
    """Daily ECB reference rates (frankfurter.app) - shared reference data,
    not scoped to any one budget file. See pft/fx_rates.py.
    """

    serializer_class = FxRateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = FxRate.objects.all()
        currency_code = self.request.query_params.get("currency_code")
        if currency_code:
            queryset = queryset.filter(currency_code=currency_code.upper())
        return queryset.order_by("-rate_date", "currency_code")

    def get_throttles(self):
        if self.action == "sync":
            self.throttle_scope = "fx_sync"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    @extend_schema(request=None, responses=FxSyncResultSerializer)
    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        """Fetch today's rates now, so a fresh instance has conversion data
        immediately instead of waiting for tomorrow's beat tick - the same
        "send test notification now" pattern as NotificationTestView.
        """
        try:
            stored = fetch_and_store_rates()
        except FxRateError as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response({"stored": stored})
