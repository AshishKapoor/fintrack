from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Account,
    Budget,
    BudgetFile,
    BudgetMonth,
    Category,
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
    Transaction,
    TransactionEvent,
    TransactionRule,
    User,
)


class TransactionAdminForm(forms.ModelForm):
    amount = forms.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        model = Transaction
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["amount"].initial = self.instance.amount

    def save(self, commit=True):
        instance = super().save(commit=False)
        amount = self.cleaned_data.get("amount")
        if amount is not None:
            instance.amount = str(amount)
        if commit:
            instance.save()
        return instance


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin"""

    list_display = (
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "department",
        "role",
        "is_staff",
    )
    search_fields = ("email", "first_name", "last_name", "phone_number")
    ordering = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {"fields": ("first_name", "last_name", "phone_number", "location", "bio")},
        ),
        ("Organization", {"fields": ("department", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "department", "role"),
            },
        ),
    )


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    form = TransactionAdminForm
    list_display = ("title", "amount", "type", "user", "category", "transaction_date")
    search_fields = ("title", "user__email")
    list_filter = ("type", "category", "user")


admin.site.register(Category)
admin.site.register(Budget)


# --- Finance (double-entry ledger) domain ------------------------------------
# These 16 models had no admin at all, so a self-hoster could not inspect or
# repair their own ledger without a Django shell.


@admin.register(BudgetFile)
class BudgetFileAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "currency_code", "is_default", "created_at")
    list_filter = ("is_default", "currency_code")
    search_fields = ("name", "user__email")


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file", "type", "opening_balance", "is_archived")
    list_filter = ("type", "is_archived")
    search_fields = ("name", "budget_file__name", "budget_file__user__email")


@admin.register(CategoryGroupV2)
class CategoryGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file", "sort_order")
    search_fields = ("name",)


@admin.register(CategoryV2)
class CategoryV2Admin(admin.ModelAdmin):
    list_display = ("name", "budget_file", "group", "kind", "is_archived")
    list_filter = ("kind", "is_archived")
    search_fields = ("name",)


@admin.register(Payee)
class PayeeAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file")
    search_fields = ("name",)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file")
    search_fields = ("name",)


class LedgerPostingInline(admin.TabularInline):
    model = LedgerPosting
    extra = 0
    fields = ("account", "category", "amount", "memo", "sort_order")


@admin.register(LedgerTransaction)
class LedgerTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_date",
        "payee",
        "memo",
        "budget_file",
        "cleared",
        "source_type",
    )
    list_filter = ("cleared", "imported", "source_type")
    search_fields = ("memo", "payee__name", "match_key")
    date_hierarchy = "transaction_date"
    inlines = [LedgerPostingInline]


@admin.register(LedgerPosting)
class LedgerPostingAdmin(admin.ModelAdmin):
    list_display = ("transaction", "account", "category", "amount", "sort_order")
    search_fields = ("transaction__memo", "account__name", "category__name")


@admin.register(BudgetMonth)
class BudgetMonthAdmin(admin.ModelAdmin):
    list_display = ("budget_file", "year", "month", "mode")
    list_filter = ("year", "month", "mode")


@admin.register(EnvelopeAssignment)
class EnvelopeAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "budget_month",
        "category",
        "assigned_amount",
        "carryover_amount",
        "goal_type",
    )
    list_filter = ("goal_type",)


@admin.register(ScheduledTransaction)
class ScheduledTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "budget_file",
        "frequency",
        "interval",
        "next_run_date",
        "is_active",
    )
    list_filter = ("frequency", "is_active")
    search_fields = ("name",)


@admin.register(TransactionRule)
class TransactionRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file", "priority", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(TransactionEvent)
class TransactionEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "budget_file", "operation", "transaction")
    list_filter = ("operation",)
    readonly_fields = ("created_at",)


@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file", "report_type", "pinned")
    list_filter = ("report_type", "pinned")
    search_fields = ("name",)


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ("created_at", "budget_file", "format", "status", "file_name")
    list_filter = ("format", "status")
    # These hold a plaintext copy of exported financial data.
    exclude = ("content_text", "content_b64")


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = ("created_at", "budget_file", "format", "status", "source_filename")
    list_filter = ("format", "status")
    # source_payload is the raw uploaded bank statement; not shown by default.
    exclude = ("source_payload",)


@admin.register(EncryptedBackupBundle)
class EncryptedBackupBundleAdmin(admin.ModelAdmin):
    list_display = ("created_at", "budget_file", "bundle_id", "encryption_algorithm")
    readonly_fields = ("bundle_id", "created_at")
    exclude = ("ciphertext", "salt", "nonce")


admin.site.site_header = "FinTrack Admin"
admin.site.site_title = "FinTrack Admin Portal"
admin.site.index_title = "Welcome to FinTrack Financial Management Portal"
