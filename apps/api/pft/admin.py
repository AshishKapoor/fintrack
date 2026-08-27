from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

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
    Invitation,
    LedgerPosting,
    LedgerTransaction,
    Membership,
    Organization,
    Payee,
    SavedReport,
    SavingsGoal,
    ScheduledTransaction,
    SyncConnection,
    SyncConnectionAccount,
    Tag,
    TransactionEvent,
    TransactionRule,
    User,
)


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


# --- Finance (double-entry ledger) domain ------------------------------------
# These models had no admin at all, so a self-hoster could not inspect or
# repair their own ledger without a Django shell.


@admin.register(BudgetFile)
class BudgetFileAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "currency_code", "created_by", "created_at")
    list_filter = ("currency_code",)
    search_fields = ("name", "organization__name", "created_by__email")


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "budget_file",
        "type",
        "currency_code",
        "opening_balance",
        "is_archived",
    )
    list_filter = ("type", "currency_code", "is_archived")
    search_fields = ("name", "budget_file__name", "budget_file__organization__name")


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "budget_file",
        "account",
        "target_amount",
        "target_date",
        "is_archived",
    )
    list_filter = ("is_archived",)
    search_fields = ("name", "budget_file__name", "budget_file__organization__name")


@admin.register(AICategorizationSettings)
class AICategorizationSettingsAdmin(admin.ModelAdmin):
    # encrypted_api_key deliberately excluded - same reasoning as SyncConnection.
    list_display = ("budget_file", "is_enabled", "provider", "base_url", "updated_at")
    list_filter = ("is_enabled", "provider")
    search_fields = ("budget_file__name", "budget_file__organization__name")


@admin.register(CategoryGroup)
class CategoryGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "budget_file", "sort_order")
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
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


class SyncConnectionAccountInline(admin.TabularInline):
    model = SyncConnectionAccount
    extra = 0
    fields = (
        "external_account_id",
        "display_name",
        "currency_code",
        "account",
        "last_synced_at",
    )
    readonly_fields = ("external_account_id", "display_name", "currency_code")


@admin.register(SyncConnection)
class SyncConnectionAdmin(admin.ModelAdmin):
    list_display = (
        "budget_file",
        "provider",
        "status",
        "institution_name",
        "last_synced_at",
    )
    list_filter = ("provider", "status")
    search_fields = (
        "institution_name",
        "budget_file__name",
        "budget_file__organization__name",
    )
    readonly_fields = ("last_error",)
    # The live credential (a GoCardless requisition token, a SimpleFIN access
    # URL) - encrypted at rest (pft/crypto.py), but there is no reason for it
    # to be readable from the admin either.
    exclude = ("secret_data",)
    inlines = [SyncConnectionAccountInline]


@admin.register(FxRate)
class FxRateAdmin(admin.ModelAdmin):
    list_display = ("rate_date", "currency_code", "rate")
    list_filter = ("currency_code",)
    date_hierarchy = "rate_date"
    ordering = ("-rate_date", "currency_code")


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "personal", "created_at")
    list_filter = ("personal",)
    search_fields = ("name",)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "organization__name")


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("organization", "email", "role", "accepted_at", "created_at")
    list_filter = ("role",)
    search_fields = ("email",)
    readonly_fields = ("token",)


admin.site.site_header = "FinTrack Admin"
admin.site.site_title = "FinTrack Admin Portal"
admin.site.index_title = "Welcome to FinTrack Financial Management Portal"
