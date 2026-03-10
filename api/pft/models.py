import base64
import uuid
from decimal import Decimal

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q, Sum



class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Override the groups field with a unique related_name
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='pft_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    # Override the user_permissions field with a unique related_name
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='pft_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    DEPARTMENT_CHOICES = (
        ('engineering', 'Engineering'),
        ('finance', 'Finance'),
        ('hr', 'HR'),
        ('marketing', 'Marketing'),
        ('sales', 'Sales'),
        ('other', 'Other'),
    )

    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    )

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default='other')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


# CATEGORY MODEL
class Category(models.Model):
    TYPE_CHOICES = (
        ("income", "Income"),
        ("expense", "Expense"),
    )

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.type})"


# TRANSACTION MODEL
class Transaction(models.Model):
    TYPE_CHOICES = (
        ("income", "Income"),
        ("expense", "Expense"),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="transactions"
    )
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name="transactions"
    )
    transaction_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.amount} ({self.type})"


# BUDGET MODEL (Optional Feature)
class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="budgets"
    )
    month = models.PositiveSmallIntegerField()  # 1 to 12
    year = models.PositiveIntegerField()
    amount_limit = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ("user", "category", "month", "year")  # prevent duplicates

    def __str__(self):
        return f"{self.user.username} - {self.category.name} - {self.month}/{self.year}"


class BudgetFile(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="budget_files"
    )
    name = models.CharField(max_length=120)
    currency_code = models.CharField(max_length=3, default="USD")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_default=True),
                name="unique_default_budget_file_per_user",
            )
        ]
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class Account(models.Model):
    TYPE_CHECKING = "checking"
    TYPE_SAVINGS = "savings"
    TYPE_CASH = "cash"
    TYPE_CREDIT = "credit"
    TYPE_ASSET = "asset"
    TYPE_LIABILITY = "liability"

    TYPE_CHOICES = (
        (TYPE_CHECKING, "Checking"),
        (TYPE_SAVINGS, "Savings"),
        (TYPE_CASH, "Cash"),
        (TYPE_CREDIT, "Credit Card"),
        (TYPE_ASSET, "Asset"),
        (TYPE_LIABILITY, "Liability"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="accounts"
    )
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=16, choices=TYPE_CHOICES, default=TYPE_CHECKING)
    opening_balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"], name="unique_account_name_per_budget_file"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.budget_file.name})"

    @property
    def current_balance(self):
        postings_total = self.ledger_postings.aggregate(total=Sum("amount")).get("total")
        return (postings_total or Decimal("0.00")) + self.opening_balance


class CategoryGroupV2(models.Model):
    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="category_groups"
    )
    name = models.CharField(max_length=120)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"],
                name="unique_category_group_name_per_budget_file",
            )
        ]

    def __str__(self):
        return self.name


class CategoryV2(models.Model):
    KIND_INCOME = "income"
    KIND_EXPENSE = "expense"

    KIND_CHOICES = (
        (KIND_INCOME, "Income"),
        (KIND_EXPENSE, "Expense"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="categories_v2"
    )
    group = models.ForeignKey(
        CategoryGroupV2,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="categories",
    )
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=12, choices=KIND_CHOICES, default=KIND_EXPENSE)
    is_archived = models.BooleanField(default=False)
    notes_md = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"], name="unique_category_v2_name_per_budget_file"
            )
        ]

    def __str__(self):
        return self.name


class Payee(models.Model):
    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="payees"
    )
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"], name="unique_payee_name_per_budget_file"
            )
        ]

    def __str__(self):
        return self.name


class Tag(models.Model):
    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="tags"
    )
    name = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"], name="unique_tag_name_per_budget_file"
            )
        ]

    def __str__(self):
        return self.name


class LedgerTransaction(models.Model):
    SOURCE_MANUAL = "manual"
    SOURCE_IMPORT = "import"
    SOURCE_RULE = "rule"
    SOURCE_SCHEDULED = "scheduled"
    SOURCE_TRANSFER = "transfer"

    SOURCE_CHOICES = (
        (SOURCE_MANUAL, "Manual"),
        (SOURCE_IMPORT, "Import"),
        (SOURCE_RULE, "Rule"),
        (SOURCE_SCHEDULED, "Scheduled"),
        (SOURCE_TRANSFER, "Transfer"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="ledger_transactions"
    )
    transaction_date = models.DateField()
    payee = models.ForeignKey(
        Payee,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ledger_transactions",
    )
    memo = models.TextField(blank=True)
    source_type = models.CharField(
        max_length=16, choices=SOURCE_CHOICES, default=SOURCE_MANUAL
    )
    cleared = models.BooleanField(default=False)
    imported = models.BooleanField(default=False)
    match_key = models.CharField(max_length=255, blank=True, db_index=True)
    transfer_group = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tags = models.ManyToManyField(Tag, through="LedgerTransactionTag", blank=True)

    class Meta:
        ordering = ["-transaction_date", "-id"]

    def __str__(self):
        return f"{self.transaction_date} ({self.budget_file.name})"

    @property
    def is_balanced(self):
        total = self.postings.aggregate(total=Sum("amount")).get("total")
        return (total or Decimal("0.00")) == Decimal("0.00")


class LedgerPosting(models.Model):
    transaction = models.ForeignKey(
        LedgerTransaction, on_delete=models.CASCADE, related_name="postings"
    )
    account = models.ForeignKey(
        Account,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="ledger_postings",
    )
    category = models.ForeignKey(
        CategoryV2,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="ledger_postings",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    memo = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.CheckConstraint(
                name="ledger_posting_exactly_one_target",
                check=(
                    (Q(account__isnull=False) & Q(category__isnull=True))
                    | (Q(account__isnull=True) & Q(category__isnull=False))
                ),
            )
        ]

    def __str__(self):
        return f"{self.transaction_id} {self.amount}"


class LedgerTransactionTag(models.Model):
    transaction = models.ForeignKey(
        LedgerTransaction, on_delete=models.CASCADE, related_name="tag_links"
    )
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name="transaction_links")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["transaction", "tag"], name="unique_tag_per_ledger_transaction"
            )
        ]


class BudgetMonth(models.Model):
    MODE_ENVELOPE = "envelope"
    MODE_TRADITIONAL = "traditional"
    MODE_CHOICES = (
        (MODE_ENVELOPE, "Envelope"),
        (MODE_TRADITIONAL, "Traditional"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="budget_months"
    )
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    mode = models.CharField(max_length=16, choices=MODE_CHOICES, default=MODE_ENVELOPE)
    notes_md = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-month", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "year", "month"],
                name="unique_budget_month_per_budget_file",
            )
        ]

    def __str__(self):
        return f"{self.budget_file.name}: {self.year}-{self.month:02d}"


class EnvelopeAssignment(models.Model):
    GOAL_NONE = "none"
    GOAL_TARGET_BALANCE = "target_balance"
    GOAL_MONTHLY = "monthly_contribution"
    GOAL_PERCENT_INCOME = "percent_income"
    GOAL_REMAINDER = "remainder"
    GOAL_DATE = "by_date"
    GOAL_SCHEDULE = "by_schedule"
    GOAL_CHOICES = (
        (GOAL_NONE, "None"),
        (GOAL_TARGET_BALANCE, "Target Balance"),
        (GOAL_MONTHLY, "Monthly Contribution"),
        (GOAL_PERCENT_INCOME, "Percent Income"),
        (GOAL_REMAINDER, "Remainder"),
        (GOAL_DATE, "By Date"),
        (GOAL_SCHEDULE, "By Schedule"),
    )

    budget_month = models.ForeignKey(
        BudgetMonth, on_delete=models.CASCADE, related_name="assignments"
    )
    category = models.ForeignKey(
        CategoryV2, on_delete=models.CASCADE, related_name="envelope_assignments"
    )
    assigned_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    carryover_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    goal_type = models.CharField(max_length=24, choices=GOAL_CHOICES, default=GOAL_NONE)
    goal_value = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    goal_date = models.DateField(null=True, blank=True)
    goal_schedule = models.CharField(max_length=200, blank=True)
    priority = models.PositiveIntegerField(default=100)
    notes_md = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_month", "category"],
                name="unique_envelope_assignment_per_month_category",
            )
        ]


class ScheduledTransaction(models.Model):
    FREQ_DAILY = "daily"
    FREQ_WEEKLY = "weekly"
    FREQ_MONTHLY = "monthly"
    FREQ_YEARLY = "yearly"
    FREQ_CUSTOM = "custom"

    FREQUENCY_CHOICES = (
        (FREQ_DAILY, "Daily"),
        (FREQ_WEEKLY, "Weekly"),
        (FREQ_MONTHLY, "Monthly"),
        (FREQ_YEARLY, "Yearly"),
        (FREQ_CUSTOM, "Custom"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="scheduled_transactions"
    )
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    start_date = models.DateField()
    next_run_date = models.DateField()
    frequency = models.CharField(
        max_length=12, choices=FREQUENCY_CHOICES, default=FREQ_MONTHLY
    )
    interval = models.PositiveIntegerField(default=1)
    transaction_template = models.JSONField(default=dict, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["next_run_date", "id"]


class TransactionRule(models.Model):
    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="transaction_rules"
    )
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=100)
    conditions = models.JSONField(default=dict, blank=True)
    actions = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "id"]


class TransactionEvent(models.Model):
    OP_CREATE = "create"
    OP_UPDATE = "update"
    OP_DELETE = "delete"
    OP_BULK_UPDATE = "bulk_update"
    OP_IMPORT = "import"
    OP_RECONCILE = "reconcile"

    OPERATION_CHOICES = (
        (OP_CREATE, "Create"),
        (OP_UPDATE, "Update"),
        (OP_DELETE, "Delete"),
        (OP_BULK_UPDATE, "Bulk update"),
        (OP_IMPORT, "Import"),
        (OP_RECONCILE, "Reconcile"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="transaction_events"
    )
    transaction = models.ForeignKey(
        LedgerTransaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="events",
    )
    operation = models.CharField(max_length=24, choices=OPERATION_CHOICES)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class SavedReport(models.Model):
    TYPE_NET_WORTH = "net_worth"
    TYPE_CASH_FLOW = "cash_flow"
    TYPE_SPENDING = "spending"
    TYPE_CUSTOM = "custom"

    TYPE_CHOICES = (
        (TYPE_NET_WORTH, "Net Worth"),
        (TYPE_CASH_FLOW, "Cash Flow"),
        (TYPE_SPENDING, "Spending Trends"),
        (TYPE_CUSTOM, "Custom"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="saved_reports"
    )
    name = models.CharField(max_length=160)
    report_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    definition = models.JSONField(default=dict, blank=True)
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]


class ExportJob(models.Model):
    FORMAT_CSV = "csv"
    FORMAT_JSON = "json"
    FORMAT_XLSX = "xlsx"
    FORMAT_CHOICES = (
        (FORMAT_CSV, "CSV"),
        (FORMAT_JSON, "JSON"),
        (FORMAT_XLSX, "XLSX"),
    )

    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="export_jobs"
    )
    requested_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="export_jobs"
    )
    format = models.CharField(max_length=8, choices=FORMAT_CHOICES)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    filters = models.JSONField(default=dict, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    content_text = models.TextField(blank=True)
    content_b64 = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def set_binary_content(self, payload: bytes):
        self.content_b64 = base64.b64encode(payload).decode("ascii")


class EncryptedBackupBundle(models.Model):
    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="encrypted_backups"
    )
    requested_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="encrypted_backups",
    )
    bundle_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    encryption_algorithm = models.CharField(max_length=32, default="AES-GCM")
    key_derivation = models.CharField(max_length=32, default="PBKDF2")
    salt = models.TextField()
    nonce = models.TextField()
    ciphertext = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class ImportJob(models.Model):
    FORMAT_CSV = "csv"
    FORMAT_OFX = "ofx"
    FORMAT_QFX = "qfx"
    FORMAT_QIF = "qif"
    FORMAT_CAMT053 = "camt053"
    FORMAT_YNAB4 = "ynab4"
    FORMAT_NYNAB = "nynab"

    FORMAT_CHOICES = (
        (FORMAT_CSV, "CSV"),
        (FORMAT_OFX, "OFX"),
        (FORMAT_QFX, "QFX"),
        (FORMAT_QIF, "QIF"),
        (FORMAT_CAMT053, "CAMT.053"),
        (FORMAT_YNAB4, "YNAB4"),
        (FORMAT_NYNAB, "nYNAB"),
    )

    STATUS_UPLOADED = "uploaded"
    STATUS_PREVIEWED = "previewed"
    STATUS_IMPORTING = "importing"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = (
        (STATUS_UPLOADED, "Uploaded"),
        (STATUS_PREVIEWED, "Previewed"),
        (STATUS_IMPORTING, "Importing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="import_jobs"
    )
    requested_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="import_jobs"
    )
    format = models.CharField(max_length=12, choices=FORMAT_CHOICES)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    source_filename = models.CharField(max_length=255, blank=True)
    source_payload = models.TextField(blank=True)
    preview_summary = models.JSONField(default=dict, blank=True)
    mapping = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
