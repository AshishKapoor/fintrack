from rest_framework.routers import DefaultRouter

from .finance_views import (
    AccountViewSet,
    BackupBundleViewSet,
    BudgetFileViewSet,
    BudgetMonthViewSet,
    CategoryGroupViewSet,
    CategoryV2ViewSet,
    EnvelopeAssignmentViewSet,
    ExportJobViewSet,
    ImportJobViewSet,
    LedgerTransactionViewSet,
    PayeeViewSet,
    PostingViewSet,
    ReportViewSet,
    ScheduledTransactionViewSet,
    TagViewSet,
    TransactionRuleViewSet,
)

router = DefaultRouter()
router.register("budget-files", BudgetFileViewSet, basename="budget-file")
router.register("accounts", AccountViewSet, basename="account")
router.register("category-groups", CategoryGroupViewSet, basename="category-group")
router.register("categories", CategoryV2ViewSet, basename="category")
router.register("payees", PayeeViewSet, basename="payee")
router.register("tags", TagViewSet, basename="tag")
router.register("transactions", LedgerTransactionViewSet, basename="transaction")
router.register("postings", PostingViewSet, basename="posting")
router.register("budget-months", BudgetMonthViewSet, basename="budget-month")
router.register("envelope-assignments", EnvelopeAssignmentViewSet, basename="envelope-assignment")
router.register(
    "scheduled-transactions", ScheduledTransactionViewSet, basename="scheduled-transaction"
)
router.register("rules", TransactionRuleViewSet, basename="rule")
router.register("reports", ReportViewSet, basename="report")
router.register("exports", ExportJobViewSet, basename="export")
router.register("backups", BackupBundleViewSet, basename="backup")
router.register("imports", ImportJobViewSet, basename="import")

urlpatterns = router.urls
