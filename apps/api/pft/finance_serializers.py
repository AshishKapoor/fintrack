from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import (
    Account,
    AICategorizationSettings,
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
    Membership,
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
from .notifications import is_safe_local_service_url, is_safe_outbound_url


class UserOwnedBudgetFileMixin:
    def _validate_budget_file_owner(self, budget_file: BudgetFile):
        """Creation targets must be budget files the caller can write.

        Reads scope through tenancy.budget_file_q in the viewsets; this is the
        write-side ownership check, now membership-based: any write role in the
        budget file's organization qualifies, a viewer does not.
        """
        from .tenancy import can_access

        request = self.context["request"]
        if not can_access(request.user, budget_file, write=True):
            raise serializers.ValidationError(_("Budget file not found."))


class BudgetFileSerializer(serializers.ModelSerializer):
    # Per-caller, not a column: `is_default` used to live on BudgetFile, where
    # it meant "the file its creator lands in" and any member's set-default
    # stomped it for the whole workspace. It now reads from, and writes to, the
    # requesting user's own Membership. The field name is kept so existing
    # clients keep working.
    is_default = serializers.BooleanField(required=False)

    class Meta:
        model = BudgetFile
        fields = [
            "id",
            "name",
            "currency_code",
            "is_default",
            "organization",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {"organization": {"required": False}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        data["is_default"] = bool(
            request
            and request.user.is_authenticated
            and Membership.objects.filter(
                user=request.user,
                organization_id=instance.organization_id,
                default_budget_file_id=instance.id,
            ).exists()
        )
        return data

    def update(self, instance, validated_data):
        wants_default = validated_data.pop("is_default", None)
        instance = super().update(instance, validated_data)
        if wants_default:
            from .tenancy import set_default_budget_file

            set_default_budget_file(self.context["request"].user, instance)
        return instance

    def validate_organization(self, value):
        """A budget file may only be created in an org the caller can write."""
        if value is None:
            return value
        from .tenancy import can_access_organization

        request = self.context["request"]
        if not can_access_organization(request.user, value, write=True):
            raise serializers.ValidationError("Unknown organization.")
        return value


class AccountSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    current_balance = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = Account
        fields = [
            "id",
            "budget_file",
            "name",
            "type",
            "opening_balance",
            "currency_code",
            "current_balance",
            "interest_rate",
            "minimum_payment",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "current_balance"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value

    def validate(self, attrs):
        # Every account has an explicit currency (see Account.currency_code's
        # docstring) - default a blank one to the budget file's currency
        # rather than leaving it blank, the same "resolve once, at write
        # time" approach BudgetFileViewSet.perform_create uses for is_default.
        if not attrs.get("currency_code"):
            budget_file = attrs.get("budget_file") or getattr(
                self.instance, "budget_file", None
            )
            if budget_file is not None:
                attrs["currency_code"] = budget_file.currency_code
        return attrs


class SavingsGoalSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    account_name = serializers.CharField(source="account.name", read_only=True)
    current_amount = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = [
            "id",
            "budget_file",
            "account",
            "account_name",
            "name",
            "target_amount",
            "target_date",
            "current_amount",
            "progress_percent",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "current_amount",
            "progress_percent",
        ]

    def get_current_amount(self, obj):
        return str(obj.account.current_balance)

    def get_progress_percent(self, obj):
        # Not capped at 100 - a goal can be exceeded, and that's information
        # worth keeping rather than silently discarding; only floored at 0,
        # since negative progress toward a savings target isn't meaningful
        # even if the account itself is temporarily overdrawn.
        if obj.target_amount <= 0:
            return None
        percent = max(
            obj.account.current_balance / obj.target_amount * 100, Decimal("0")
        )
        return float(percent.quantize(Decimal("0.1")))

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                _("Target amount must be greater than zero.")
            )
        return value

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value

    def validate(self, attrs):
        account = attrs.get("account") or getattr(self.instance, "account", None)
        budget_file = attrs.get("budget_file") or getattr(
            self.instance, "budget_file", None
        )
        if account and budget_file and account.budget_file_id != budget_file.id:
            raise serializers.ValidationError(
                {
                    "account": _(
                        "Account must belong to the same budget file as the goal."
                    )
                }
            )
        return attrs


class AICategorizationSettingsSerializer(
    serializers.ModelSerializer, UserOwnedBudgetFileMixin
):
    # encrypted_api_key never appears here - see the model's docstring and
    # SyncConnectionSerializer's identical exclusion of secret_data. This is
    # the only signal the frontend gets that a key is already stored.
    has_api_key = serializers.SerializerMethodField()

    class Meta:
        model = AICategorizationSettings
        fields = [
            "id",
            "budget_file",
            "is_enabled",
            "provider",
            "base_url",
            "model_name",
            "has_api_key",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["has_api_key", "created_at", "updated_at"]

    def get_has_api_key(self, obj):
        return bool(obj.encrypted_api_key)

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value

    def validate(self, attrs):
        base_url = attrs.get("base_url")
        if not base_url:
            return attrs
        provider = attrs.get("provider") or getattr(self.instance, "provider", None)
        is_ollama = provider == AICategorizationSettings.PROVIDER_OLLAMA
        safe = (
            is_safe_local_service_url(base_url)
            if is_ollama
            else is_safe_outbound_url(base_url)
        )
        if not safe:
            raise serializers.ValidationError(
                {
                    "base_url": _(
                        "This URL can't be reached, or points at an unsafe address."
                    )
                }
            )
        return attrs


class CategoryGroupSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = CategoryGroup
        fields = [
            "id",
            "budget_file",
            "name",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class CategorySerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = Category
        fields = [
            "id",
            "budget_file",
            "group",
            "name",
            "kind",
            "is_archived",
            "notes_md",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        budget_file = attrs.get("budget_file") or getattr(
            self.instance, "budget_file", None
        )
        if not budget_file:
            return attrs

        self._validate_budget_file_owner(budget_file)

        group = attrs.get("group")
        if group and group.budget_file_id != budget_file.id:
            raise serializers.ValidationError(
                "Category group must belong to same budget file."
            )

        return attrs


class PayeeSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = Payee
        fields = ["id", "budget_file", "name", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class SuggestedCategorySerializer(serializers.Serializer):
    """Response shape for PayeeViewSet.suggested_category - schema-only (see
    @extend_schema on the view): without it, drf-spectacular falls back to
    the viewset's own PayeeSerializer for this action's response, which
    doesn't have these fields and would generate a wrong/unusable client type.
    """

    category = serializers.IntegerField(allow_null=True)
    category_name = serializers.CharField(allow_blank=True)
    # "history" (this payee's own past transactions), "ai" (opt-in fallback,
    # pft/ai_categorization.py, only tried when there's no history yet), or
    # null when neither found anything - see ROADMAP.md Phase 3's "opt-in AI
    # categorization... privacy-framed": surfaced so the UI can be explicit
    # about when a suggestion came from an LLM rather than blending it in.
    # A plain CharField, not ChoiceField: this is a response-only value (the
    # client never submits it), and drf-spectacular's generated component
    # name for a same-shaped inline enum collided with another one at
    # schema-build time - not worth fighting for a field with no request-side
    # validation need anyway.
    source = serializers.CharField(allow_null=True)


class TagSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = Tag
        fields = ["id", "budget_file", "name", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class LedgerPostingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerPosting
        fields = ["id", "account", "category", "amount", "memo", "sort_order"]
        read_only_fields = ["id"]


class LedgerPostingReadSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = LedgerPosting
        fields = [
            "id",
            "account",
            "account_name",
            "category",
            "category_name",
            "amount",
            "memo",
            "sort_order",
        ]


class LedgerTransactionSerializer(
    serializers.ModelSerializer, UserOwnedBudgetFileMixin
):
    postings = LedgerPostingWriteSerializer(many=True, write_only=True, required=True)
    posting_lines = LedgerPostingReadSerializer(
        source="postings", many=True, read_only=True
    )
    # Mirrors LedgerPostingReadSerializer's account_name/category_name: absent
    # from the response entirely (not null) when there is no payee, same as
    # those two - the frontend already treats that shape as optional.
    payee_name = serializers.CharField(source="payee.name", read_only=True)
    tags = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, required=False
    )

    class Meta:
        model = LedgerTransaction
        fields = [
            "id",
            "budget_file",
            "transaction_date",
            "payee",
            "payee_name",
            "memo",
            "source_type",
            "cleared",
            "imported",
            "match_key",
            "transfer_group",
            "postings",
            "posting_lines",
            "tags",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def _validate_postings(self, postings, budget_file):
        if len(postings) < 2:
            raise serializers.ValidationError(
                _("At least two posting lines are required.")
            )

        total = Decimal("0.00")
        for posting in postings:
            account = posting.get("account")
            category = posting.get("category")
            if bool(account) == bool(category):
                raise serializers.ValidationError(
                    _(
                        "Each posting must reference exactly one account or one category."
                    )
                )

            if account and account.budget_file_id != budget_file.id:
                raise serializers.ValidationError(
                    _("Posting account must belong to budget file.")
                )

            if category and category.budget_file_id != budget_file.id:
                raise serializers.ValidationError(
                    _("Posting category must belong to budget file.")
                )

            total += posting["amount"]

        if total != Decimal("0.00"):
            raise serializers.ValidationError(
                _("Double-entry check failed: postings must sum to zero.")
            )

    def validate(self, attrs):
        budget_file = attrs.get("budget_file") or getattr(
            self.instance, "budget_file", None
        )
        if not budget_file:
            raise serializers.ValidationError(_("budget_file is required"))

        self._validate_budget_file_owner(budget_file)

        payee = attrs.get("payee")
        if payee and payee.budget_file_id != budget_file.id:
            raise serializers.ValidationError(
                _("Payee must belong to same budget file.")
            )

        tags = attrs.get("tags") or []
        for tag in tags:
            if tag.budget_file_id != budget_file.id:
                raise serializers.ValidationError(
                    _("Tag must belong to same budget file.")
                )

        postings = attrs.get("postings")
        if postings:
            self._validate_postings(postings, budget_file)

        return attrs

    def create(self, validated_data):
        postings = validated_data.pop("postings")
        tags = validated_data.pop("tags", [])

        with transaction.atomic():
            ledger_transaction = LedgerTransaction.objects.create(**validated_data)
            for posting in postings:
                LedgerPosting.objects.create(transaction=ledger_transaction, **posting)

            if tags:
                ledger_transaction.tags.set(tags)

            TransactionEvent.objects.create(
                budget_file=ledger_transaction.budget_file,
                transaction=ledger_transaction,
                operation=TransactionEvent.OP_CREATE,
                payload={"created_via": "api_v1_finance"},
            )

        return ledger_transaction

    def update(self, instance, validated_data):
        postings = validated_data.pop("postings", None)
        tags = validated_data.pop("tags", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        with transaction.atomic():
            instance.save()

            if postings is not None:
                self._validate_postings(postings, instance.budget_file)
                instance.postings.all().delete()
                for posting in postings:
                    LedgerPosting.objects.create(transaction=instance, **posting)

            if tags is not None:
                instance.tags.set(tags)

            TransactionEvent.objects.create(
                budget_file=instance.budget_file,
                transaction=instance,
                operation=TransactionEvent.OP_UPDATE,
                payload={"updated_via": "api_v1_finance"},
            )

        return instance


class BudgetMonthSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = BudgetMonth
        fields = [
            "id",
            "budget_file",
            "year",
            "month",
            "mode",
            "notes_md",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class EnvelopeAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvelopeAssignment
        fields = [
            "id",
            "budget_month",
            "category",
            "assigned_amount",
            "carryover_amount",
            "goal_type",
            "goal_value",
            "goal_date",
            "goal_schedule",
            "priority",
            "notes_md",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        budget_month = attrs.get("budget_month") or self.instance.budget_month
        category = attrs.get("category") or self.instance.category

        # Membership, not ownership: this compared budget_file.user_id to the
        # caller, which meant a member of a shared workspace could not touch
        # an envelope in a file somebody else had created there.
        from .tenancy import can_access

        request = self.context["request"]
        if not can_access(request.user, budget_month.budget_file, write=True):
            raise serializers.ValidationError("Budget month not found.")

        if category.budget_file_id != budget_month.budget_file_id:
            raise serializers.ValidationError(
                "Category and budget month must belong to same budget file."
            )

        return attrs


class ScheduledTransactionSerializer(
    serializers.ModelSerializer, UserOwnedBudgetFileMixin
):
    class Meta:
        model = ScheduledTransaction
        fields = [
            "id",
            "budget_file",
            "name",
            "is_active",
            "start_date",
            "next_run_date",
            "frequency",
            "interval",
            "transaction_template",
            "last_run_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["last_run_at", "created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class TransactionRuleSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = TransactionRule
        fields = [
            "id",
            "budget_file",
            "name",
            "is_active",
            "priority",
            "conditions",
            "actions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class SavedReportSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = SavedReport
        fields = [
            "id",
            "budget_file",
            "name",
            "report_type",
            "definition",
            "pinned",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class ExportJobSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = ExportJob
        fields = [
            "id",
            "budget_file",
            "format",
            "status",
            "filters",
            "file_name",
            "error_message",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = [
            "status",
            "file_name",
            "error_message",
            "created_at",
            "updated_at",
            "completed_at",
        ]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class EncryptedBackupBundleSerializer(
    serializers.ModelSerializer, UserOwnedBudgetFileMixin
):
    class Meta:
        model = EncryptedBackupBundle
        fields = [
            "id",
            "bundle_id",
            "budget_file",
            "encryption_algorithm",
            "key_derivation",
            "salt",
            "nonce",
            "ciphertext",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "bundle_id", "created_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value

    def validate_ciphertext(self, value):
        """Cap the bundle size. The field is an unbounded TextField."""
        max_bytes = settings.FINTRACK_MAX_BACKUP_BYTES
        if value and len(value.encode("utf-8")) > max_bytes:
            raise serializers.ValidationError(
                f"Backup bundle exceeds the {max_bytes // 1024}KB limit."
            )
        return value


class ImportJobSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = ImportJob
        fields = [
            "id",
            "budget_file",
            "format",
            "status",
            "source_filename",
            "source_payload",
            "preview_summary",
            "mapping",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "preview_summary",
            "error_message",
            "created_at",
            "updated_at",
        ]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value

    def validate_source_payload(self, value):
        """Cap the uploaded statement size.

        The payload is stored as plaintext TEXT and parsed synchronously inside
        the request, so an unbounded upload is both a memory and a storage
        problem on a small self-hosted box.
        """
        max_bytes = settings.FINTRACK_MAX_IMPORT_BYTES
        if value and len(value.encode("utf-8")) > max_bytes:
            raise serializers.ValidationError(
                f"Import payload exceeds the {max_bytes // 1024}KB limit."
            )
        return value


class SyncConnectionAccountSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = SyncConnectionAccount
        fields = [
            "id",
            "connection",
            "account",
            "account_name",
            "external_account_id",
            "display_name",
            "currency_code",
            "iban",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]
        # Every field is read-only here - mapping to a local account only
        # happens through SyncConnectionAccountViewSet.map (which writes the
        # model directly), never through a generic PATCH. Rows themselves are
        # only ever created by the linking flow (bank_sync.list_accounts),
        # never posted by a client - see the viewset's create() override.
        read_only_fields = fields


class SyncConnectionSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    linked_accounts = SyncConnectionAccountSerializer(many=True, read_only=True)
    provider_label = serializers.CharField(
        source="get_provider_display", read_only=True
    )

    class Meta:
        model = SyncConnection
        fields = [
            "id",
            "budget_file",
            "provider",
            "provider_label",
            "status",
            "institution_name",
            "last_synced_at",
            "last_error",
            "linked_accounts",
            "created_at",
            "updated_at",
        ]
        # secret_data/external_reference/settings never leave the server -
        # they are the credential itself (see pft/crypto.py), not display data.
        read_only_fields = [
            "status",
            "institution_name",
            "last_synced_at",
            "last_error",
            "linked_accounts",
            "created_at",
            "updated_at",
        ]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class FxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FxRate
        fields = ["id", "rate_date", "currency_code", "rate"]


# --- Schema-only serializers for custom action responses --------------------
# Same reasoning as SuggestedCategorySerializer above: without one of these on
# @extend_schema, drf-spectacular falls back to the viewset's main serializer
# for the action's response, which doesn't match and would generate a wrong
# client type.


class BankSyncProviderSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    configured = serializers.BooleanField()


class BankSyncInstitutionSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    logo = serializers.CharField(allow_blank=True)


class BankSyncLinkResultSerializer(serializers.Serializer):
    redirect_url = serializers.CharField(required=False, allow_null=True)
    status = serializers.CharField(required=False, allow_null=True)


class BankSyncResultSerializer(serializers.Serializer):
    accounts_synced = serializers.IntegerField()
    created = serializers.IntegerField()
    skipped = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())


class FxSyncResultSerializer(serializers.Serializer):
    stored = serializers.IntegerField()
