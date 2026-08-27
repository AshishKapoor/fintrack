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
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Override the groups field with a unique related_name
    groups = models.ManyToManyField(
        "auth.Group",
        related_name="pft_user_set",
        blank=True,
        help_text="The groups this user belongs to.",
        verbose_name="groups",
    )
    # Override the user_permissions field with a unique related_name
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        related_name="pft_user_set",
        blank=True,
        help_text="Specific permissions for this user.",
        verbose_name="user permissions",
    )

    DEPARTMENT_CHOICES = (
        ("engineering", "Engineering"),
        ("finance", "Finance"),
        ("hr", "HR"),
        ("marketing", "Marketing"),
        ("sales", "Sales"),
        ("other", "Other"),
    )

    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("employee", "Employee"),
    )

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    department = models.CharField(
        max_length=20, choices=DEPARTMENT_CHOICES, default="other"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="employee")

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class Organization(models.Model):
    """The tenancy boundary.

    Every user gets a personal organization on signup; budget files belong to
    an organization, and access flows through Membership. `personal` marks the
    auto-created org so the UI can label it and management endpoints can refuse
    to delete it. This is the expand phase of the user->organization move:
    BudgetFile.user stays in place until v1.0.0 (see ARCHITECTURE.md).
    """

    name = models.CharField(max_length=120)
    personal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Membership(models.Model):
    """A user's role inside an organization.

    Roles are deliberately a small fixed ladder rather than free permissions:
    owner manages the org itself, admin manages members and all data, member
    reads and writes data, viewer only reads.
    """

    ROLE_OWNER = "owner"
    ROLE_ADMIN = "admin"
    ROLE_MEMBER = "member"
    ROLE_VIEWER = "viewer"
    ROLE_CHOICES = (
        (ROLE_OWNER, "Owner"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_MEMBER, "Member"),
        (ROLE_VIEWER, "Viewer"),
    )
    WRITE_ROLES = {ROLE_OWNER, ROLE_ADMIN, ROLE_MEMBER}
    MANAGE_ROLES = {ROLE_OWNER, ROLE_ADMIN}

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=12, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"], name="unique_membership"
            )
        ]
        ordering = ["id"]

    def __str__(self):
        return f"{self.user} in {self.organization} as {self.role}"


class Invitation(models.Model):
    """An email invitation into an organization, accepted by token."""

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="invitations"
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=12, choices=Membership.ROLE_CHOICES, default=Membership.ROLE_MEMBER
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="sent_invitations"
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "email"],
                condition=Q(accepted_at__isnull=True),
                name="unique_pending_invitation",
            )
        ]
        ordering = ["-created_at"]


class AuditLog(models.Model):
    """An append-only record of who changed what, per organization.

    TransactionEvent covers ledger writes; this generalises the idea to every
    mutation a bookkeeper or auditor would ask about - members, roles,
    invitations, budget files, categories, accounts, backups, imports. Rows are
    written by the domain code (not middleware), so each entry says what
    happened in domain terms rather than which HTTP verb fired.

    Append-only: no update or delete surface exists outside retention pruning.
    """

    ACTION_CREATED = "created"
    ACTION_UPDATED = "updated"
    ACTION_DELETED = "deleted"
    ACTION_CHOICES = (
        (ACTION_CREATED, "Created"),
        (ACTION_UPDATED, "Updated"),
        (ACTION_DELETED, "Deleted"),
    )

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="audit_logs"
    )
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="audit_entries"
    )
    actor_email = models.CharField(max_length=254, blank=True)
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=64)
    entity_id = models.CharField(max_length=64, blank=True)
    summary = models.CharField(max_length=255)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["organization", "entity_type"]),
        ]

    def __str__(self):
        return f"{self.actor_email or 'system'} {self.action} {self.entity_type} {self.entity_id}"


class BudgetFile(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="budget_files"
    )
    # Nullable during the expand phase; every row is backfilled to its owner's
    # personal organization by migration 0007, and new rows always set it.
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="budget_files",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=120)
    currency_code = models.CharField(max_length=3, default="USD")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # One default per user per workspace: the same user legitimately
            # holds a default file in their personal org AND in each shared org.
            models.UniqueConstraint(
                fields=["user", "organization"],
                condition=Q(is_default=True),
                name="unique_default_budget_file_per_user_org",
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
    # Blank means "inherits budget_file.currency_code" - see effective_currency_code.
    # New accounts always get one explicitly from AccountSerializer.validate();
    # blank only occurs for rows that predate this field (backfilled by
    # migration 0011 at add-time, so in practice this is a defensive fallback,
    # not a state new code needs to handle).
    currency_code = models.CharField(max_length=3, blank=True)
    # Debt payoff planning (ROADMAP.md Phase 3) inputs - null on every account
    # that predates this, and on every non-debt account, which is exactly why
    # compute_debt_payoff_projection excludes (rather than guesses for) an
    # account missing either: a 0% default would silently understate real
    # interest, and a $0 minimum would silently imply "no obligation".
    interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Annual percentage rate, e.g. 19.99 for 19.99% APR.",
    )
    minimum_payment = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"],
                name="unique_account_name_per_budget_file",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.budget_file.name})"

    @property
    def current_balance(self):
        postings_total = self.ledger_postings.aggregate(total=Sum("amount")).get(
            "total"
        )
        return (postings_total or Decimal("0.00")) + self.opening_balance

    @property
    def effective_currency_code(self):
        return self.currency_code or self.budget_file.currency_code


class CategoryGroup(models.Model):
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


class Category(models.Model):
    KIND_INCOME = "income"
    KIND_EXPENSE = "expense"

    KIND_CHOICES = (
        (KIND_INCOME, "Income"),
        (KIND_EXPENSE, "Expense"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="categories"
    )
    group = models.ForeignKey(
        CategoryGroup,
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
                fields=["budget_file", "name"],
                name="unique_category_name_per_budget_file",
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
    SOURCE_SYNC = "sync"

    SOURCE_CHOICES = (
        (SOURCE_MANUAL, "Manual"),
        (SOURCE_IMPORT, "Import"),
        (SOURCE_RULE, "Rule"),
        (SOURCE_SCHEDULED, "Scheduled"),
        (SOURCE_TRANSFER, "Transfer"),
        (SOURCE_SYNC, "Bank Sync"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="ledger_transactions"
    )
    transaction_date = models.DateField(db_index=True)
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
        Category,
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
                condition=(
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
    tag = models.ForeignKey(
        Tag, on_delete=models.CASCADE, related_name="transaction_links"
    )

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
        Category, on_delete=models.CASCADE, related_name="envelope_assignments"
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
    TYPE_NET_WORTH_SERIES = "net_worth_series"
    TYPE_CASH_FLOW_SANKEY = "cash_flow_sankey"
    TYPE_SUBSCRIPTIONS = "subscriptions"
    TYPE_DEBT_PAYOFF = "debt_payoff"

    TYPE_CHOICES = (
        (TYPE_NET_WORTH, "Net Worth"),
        (TYPE_CASH_FLOW, "Cash Flow"),
        (TYPE_SPENDING, "Spending Trends"),
        (TYPE_CUSTOM, "Custom"),
        (TYPE_NET_WORTH_SERIES, "Net Worth Over Time"),
        (TYPE_CASH_FLOW_SANKEY, "Cash Flow Sankey"),
        (TYPE_SUBSCRIPTIONS, "Subscriptions"),
        (TYPE_DEBT_PAYOFF, "Debt Payoff"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="saved_reports"
    )
    name = models.CharField(max_length=160)
    # 32 leaves headroom past the two longest current slots (both 16 chars) -
    # this field was hard-capped at 16 before the Phase 3 insights types.
    report_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
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
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="export_jobs",
    )
    format = models.CharField(max_length=8, choices=FORMAT_CHOICES)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
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


class NotificationPreference(models.Model):
    """How and when to reach one user - see pft/notifications.py.

    One row per user (not per budget file): "am I on Slack via webhook" is a
    property of the person, not of any one budget. Triggers that are
    naturally per-budget-file (a threshold on category spend, a due bill)
    fan out over every budget file this user can access - see
    notifications.check_budget_threshold_alerts and
    notifications.send_scheduled_transaction_reminders.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="notification_preference"
    )

    email_enabled = models.BooleanField(default=False)

    ntfy_enabled = models.BooleanField(default=False)
    ntfy_server_url = models.URLField(max_length=255, default="https://ntfy.sh")
    ntfy_topic = models.CharField(max_length=120, blank=True)

    webhook_enabled = models.BooleanField(default=False)
    webhook_url = models.URLField(max_length=500, blank=True)

    budget_alerts_enabled = models.BooleanField(default=True)
    # Percent of a category's assigned envelope (assigned + carryover) that
    # must be spent before an alert fires.
    budget_alert_threshold = models.PositiveSmallIntegerField(default=90)

    reminders_enabled = models.BooleanField(default=True)
    reminder_days_before = models.PositiveSmallIntegerField(default=1)

    weekly_digest_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="notification_budget_alert_threshold_range",
                condition=Q(budget_alert_threshold__gte=1)
                & Q(budget_alert_threshold__lte=100),
            ),
            models.CheckConstraint(
                name="notification_reminder_days_before_range",
                condition=Q(reminder_days_before__gte=0)
                & Q(reminder_days_before__lte=30),
            ),
        ]

    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class NotificationLog(models.Model):
    """One row per notification actually sent - the dedupe ledger.

    A beat task runs daily (or weekly, for the digest) and re-evaluates every
    live condition from scratch rather than tracking "have I told this user
    about this yet" in memory, so it must not re-alert on every run while a
    category stays over threshold. `dedupe_key` encodes enough of the
    condition to make that safe - see the callers in notifications.py for
    what goes into it per kind. The unique constraint is what actually
    prevents a duplicate send if two beat ticks ever overlap, the same
    guarantee style as the ledger's zero-sum trigger.
    """

    KIND_BUDGET_THRESHOLD = "budget_threshold"
    KIND_SCHEDULED_REMINDER = "scheduled_reminder"
    KIND_WEEKLY_DIGEST = "weekly_digest"

    KIND_CHOICES = (
        (KIND_BUDGET_THRESHOLD, "Budget threshold"),
        (KIND_SCHEDULED_REMINDER, "Scheduled reminder"),
        (KIND_WEEKLY_DIGEST, "Weekly digest"),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notification_logs"
    )
    kind = models.CharField(max_length=24, choices=KIND_CHOICES)
    dedupe_key = models.CharField(max_length=255)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "kind", "dedupe_key"],
                name="unique_notification_per_user_kind_dedupe_key",
            )
        ]


class ImportJob(models.Model):
    FORMAT_CSV = "csv"
    FORMAT_OFX = "ofx"
    FORMAT_QFX = "qfx"
    FORMAT_QIF = "qif"
    FORMAT_CAMT053 = "camt053"
    FORMAT_YNAB4 = "ynab4"
    FORMAT_NYNAB = "nynab"
    FORMAT_FIREFLY3 = "firefly3"
    FORMAT_ACTUAL = "actual"

    FORMAT_CHOICES = (
        (FORMAT_CSV, "CSV"),
        (FORMAT_OFX, "OFX"),
        (FORMAT_QFX, "QFX"),
        (FORMAT_QIF, "QIF"),
        (FORMAT_CAMT053, "CAMT.053"),
        (FORMAT_YNAB4, "YNAB4"),
        (FORMAT_NYNAB, "nYNAB"),
        # See docs/migrating.md - both parse each tool's own CSV export
        # (Firefly III: Settings -> Export data; Actual: an account
        # register's Export toolbar action), not FinTrack's generic CSV
        # shape, so they get their own format rather than asking users to
        # rename columns by hand.
        (FORMAT_FIREFLY3, "Firefly III"),
        (FORMAT_ACTUAL, "Actual Budget"),
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
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_jobs",
    )
    format = models.CharField(max_length=12, choices=FORMAT_CHOICES)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default=STATUS_UPLOADED
    )
    source_filename = models.CharField(max_length=255, blank=True)
    source_payload = models.TextField(blank=True)
    preview_summary = models.JSONField(default=dict, blank=True)
    mapping = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class SyncConnection(models.Model):
    """A link to one institution at one bank-sync provider - see pft/bank_sync.py.

    One connection can cover several of the institution's accounts
    (SyncConnectionAccount, one row per external account, mapped to a local
    Account once the user picks or creates one). `secret_data` is whatever
    the provider needs to act on our behalf later without the user present -
    a GoCardless requisition/agreement id, a SimpleFIN access URL - and is
    encrypted at rest (pft/crypto.py) because, unlike a webhook URL or an
    ntfy topic, it is a live credential onto a real bank account.
    """

    PROVIDER_GOCARDLESS = "gocardless"
    PROVIDER_SIMPLEFIN = "simplefin"
    PROVIDER_CHOICES = (
        (PROVIDER_GOCARDLESS, "GoCardless Bank Account Data"),
        (PROVIDER_SIMPLEFIN, "SimpleFIN Bridge"),
    )

    STATUS_PENDING = "pending"
    STATUS_ACTIVE = "active"
    STATUS_ERROR = "error"
    STATUS_REVOKED = "revoked"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_ERROR, "Error"),
        (STATUS_REVOKED, "Revoked"),
    )

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="sync_connections"
    )
    provider = models.CharField(max_length=16, choices=PROVIDER_CHOICES)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    institution_name = models.CharField(max_length=160, blank=True)
    # The provider's own id for this link - a GoCardless requisition id, or
    # blank for SimpleFIN (which has no separate connection-level id beyond
    # the access URL already inside secret_data).
    external_reference = models.CharField(max_length=255, blank=True)
    secret_data = models.TextField(blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.get_provider_display()} ({self.budget_file.name})"


class SyncConnectionAccount(models.Model):
    """One external account discovered on a SyncConnection.

    Created unmapped (account=NULL) as soon as the provider reports it
    exists; the user then maps it to a local Account (existing or
    newly-created) before it participates in a sync - see
    bank_sync.ingest_transactions, which refuses to ingest into an unmapped
    row rather than guessing.
    """

    connection = models.ForeignKey(
        SyncConnection, on_delete=models.CASCADE, related_name="linked_accounts"
    )
    account = models.ForeignKey(
        Account,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sync_links",
    )
    external_account_id = models.CharField(max_length=255)
    display_name = models.CharField(max_length=160, blank=True)
    currency_code = models.CharField(max_length=3, blank=True)
    iban = models.CharField(max_length=64, blank=True)
    raw_metadata = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "external_account_id"],
                name="unique_external_account_per_connection",
            )
        ]

    def __str__(self):
        return self.display_name or self.external_account_id


class FxRate(models.Model):
    """A daily ECB reference rate from frankfurter.app - see pft/fx_rates.py.

    Stored EUR-based only (mirroring how the ECB actually publishes them):
    one row per (date, quote currency), `rate` being how much of that
    currency one EUR buys. Converting between two non-EUR currencies
    triangulates through EUR at read time instead of storing every cross
    pair, which would be O(currencies^2) for no real benefit. Not scoped to
    a budget file - exchange rates are reference data shared by everyone on
    the instance, unlike every other model here.
    """

    rate_date = models.DateField(db_index=True)
    currency_code = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=20, decimal_places=8)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-rate_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["rate_date", "currency_code"],
                name="unique_fx_rate_per_day_currency",
            )
        ]
        indexes = [models.Index(fields=["currency_code", "-rate_date"])]

    def __str__(self):
        return f"{self.rate_date} EUR->{self.currency_code} {self.rate}"


class SavingsGoal(models.Model):
    """A persistent target for one account's balance - ROADMAP.md Phase 3's
    "first-class savings goals... not just envelope goal fields": the four
    goal_* fields on EnvelopeAssignment (goal_type/goal_value/goal_date/
    goal_schedule) are read and written but never computed into progress
    anywhere, and being per budget_month they get manually re-copied into
    every new month rather than persisting on their own. This is account-
    anchored rather than category-anchored: progress is a direct read of the
    account's existing current_balance property, with no new computation and
    no cross-month lookup - a category-anchored goal would need to resolve
    "the current month's envelope" and thread carryover the way
    build_envelope_snapshot already does, a meaningfully bigger feature left
    for later rather than half-built alongside this one.
    """

    budget_file = models.ForeignKey(
        BudgetFile, on_delete=models.CASCADE, related_name="savings_goals"
    )
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="savings_goals"
    )
    name = models.CharField(max_length=120)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    target_date = models.DateField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_file", "name"],
                name="unique_savings_goal_name_per_budget_file",
            )
        ]

    def __str__(self):
        return self.name


class AICategorizationSettings(models.Model):
    """Opt-in payee -> category suggestions via an LLM - ROADMAP.md Phase 3's
    "opt-in AI categorization... off by default, privacy-framed, never
    required". Complements PayeeViewSet.suggested_category's existing
    history-based lookup (finance_views.py) rather than replacing it: that
    stays the primary suggestion, this only fires as a fallback when a payee
    has no categorized history yet - see pft/ai_categorization.py.

    Budget-file-scoped, not user-scoped: an API key is a credential (the
    same reasoning as SyncConnection.secret_data, pft/bank_sync.py), not a
    per-user delivery preference like NotificationPreference. One row per
    budget file, created lazily on first access - see
    AICategorizationSettingsView's get_object, mirroring
    NotificationPreferenceView's exact pattern.

    encrypted_api_key is never exposed via AICategorizationSettingsSerializer
    - like secret_data, it is written only through a dedicated action
    (set-api-key) that encrypts before the plaintext ever touches the DB,
    using the same pft/crypto.py Fernet key as bank sync credentials.
    """

    PROVIDER_OPENAI_COMPATIBLE = "openai_compatible"
    PROVIDER_OLLAMA = "ollama"
    PROVIDER_CHOICES = (
        (PROVIDER_OPENAI_COMPATIBLE, "OpenAI-compatible (bring your own key)"),
        (PROVIDER_OLLAMA, "Ollama (local)"),
    )

    budget_file = models.OneToOneField(
        BudgetFile, on_delete=models.CASCADE, related_name="ai_categorization_settings"
    )
    is_enabled = models.BooleanField(default=False)
    provider = models.CharField(
        max_length=20, choices=PROVIDER_CHOICES, default=PROVIDER_OPENAI_COMPATIBLE
    )
    # Blank means "use the provider's own default" - see
    # ai_categorization.py's DEFAULT_BASE_URL/DEFAULT_MODEL.
    base_url = models.CharField(max_length=500, blank=True)
    model_name = models.CharField(max_length=100, blank=True)
    encrypted_api_key = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AI categorization settings for {self.budget_file}"
