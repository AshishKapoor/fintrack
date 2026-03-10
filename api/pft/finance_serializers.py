from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

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


class UserOwnedBudgetFileMixin:
    def _validate_budget_file_owner(self, budget_file: BudgetFile):
        request = self.context["request"]
        if budget_file.user_id != request.user.id:
            raise serializers.ValidationError("Budget file not found.")


class BudgetFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetFile
        fields = [
            "id",
            "name",
            "currency_code",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class AccountSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    current_balance = serializers.DecimalField(
        max_digits=14, decimal_places=2, source="current_balance", read_only=True
    )

    class Meta:
        model = Account
        fields = [
            "id",
            "budget_file",
            "name",
            "type",
            "opening_balance",
            "current_balance",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "current_balance"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


class CategoryGroupV2Serializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = CategoryGroupV2
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


class CategoryV2Serializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = CategoryV2
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
        budget_file = attrs.get("budget_file") or getattr(self.instance, "budget_file", None)
        if not budget_file:
            return attrs

        self._validate_budget_file_owner(budget_file)

        group = attrs.get("group")
        if group and group.budget_file_id != budget_file.id:
            raise serializers.ValidationError("Category group must belong to same budget file.")

        return attrs


class PayeeSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    class Meta:
        model = Payee
        fields = ["id", "budget_file", "name", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def validate_budget_file(self, value):
        self._validate_budget_file_owner(value)
        return value


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


class LedgerTransactionSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
    postings = LedgerPostingWriteSerializer(many=True, write_only=True, required=True)
    posting_lines = LedgerPostingReadSerializer(source="postings", many=True, read_only=True)
    tags = serializers.PrimaryKeyRelatedField(queryset=Tag.objects.all(), many=True, required=False)

    class Meta:
        model = LedgerTransaction
        fields = [
            "id",
            "budget_file",
            "transaction_date",
            "payee",
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
            raise serializers.ValidationError("At least two posting lines are required.")

        total = Decimal("0.00")
        for posting in postings:
            account = posting.get("account")
            category = posting.get("category")
            if bool(account) == bool(category):
                raise serializers.ValidationError(
                    "Each posting must reference exactly one account or one category."
                )

            if account and account.budget_file_id != budget_file.id:
                raise serializers.ValidationError("Posting account must belong to budget file.")

            if category and category.budget_file_id != budget_file.id:
                raise serializers.ValidationError("Posting category must belong to budget file.")

            total += posting["amount"]

        if total != Decimal("0.00"):
            raise serializers.ValidationError("Double-entry check failed: postings must sum to zero.")

    def validate(self, attrs):
        budget_file = attrs.get("budget_file") or getattr(self.instance, "budget_file", None)
        if not budget_file:
            raise serializers.ValidationError("budget_file is required")

        self._validate_budget_file_owner(budget_file)

        payee = attrs.get("payee")
        if payee and payee.budget_file_id != budget_file.id:
            raise serializers.ValidationError("Payee must belong to same budget file.")

        tags = attrs.get("tags") or []
        for tag in tags:
            if tag.budget_file_id != budget_file.id:
                raise serializers.ValidationError("Tag must belong to same budget file.")

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

        request = self.context["request"]
        if budget_month.budget_file.user_id != request.user.id:
            raise serializers.ValidationError("Budget month not found.")

        if category.budget_file_id != budget_month.budget_file_id:
            raise serializers.ValidationError("Category and budget month must belong to same budget file.")

        return attrs


class ScheduledTransactionSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
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


class EncryptedBackupBundleSerializer(serializers.ModelSerializer, UserOwnedBudgetFileMixin):
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
